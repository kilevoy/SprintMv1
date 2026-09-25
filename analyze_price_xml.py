from __future__ import annotations

import json
import math
import re
import sys
import statistics
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET

SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(r"E:\SprintMv1\input_price_review\Прайс для предрасчетов (не изменять) — 23092026.xlsx")
OUT = SRC.with_name(f"{SRC.stem}_analysis.json")
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main", "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships", "p": "http://schemas.openxmlformats.org/package/2006/relationships"}
PRICE_WORDS = ("цена", "стоим", "прайс", "руб", "р/", "руб.")

def col_num(ref):
    m = re.match(r"([A-Z]+)", ref)
    n = 0
    for ch in m.group(1): n = n * 26 + ord(ch) - 64
    return n

def row_num(ref): return int(re.search(r"(\d+)$", ref).group(1))

def clean(v): return re.sub(r"\s+", " ", str(v or "").replace("\n", " ")).strip()

def shared_strings(z):
    actual = next((n for n in z.namelist() if n.lower() == "xl/sharedstrings.xml"), None)
    if actual is None:
        return []
    try: f = z.open(actual)
    except KeyError: return []
    out=[]
    with f:
        for _, e in ET.iterparse(f, events=("end",)):
            if e.tag.endswith("}si"):
                out.append("".join(t.text or "" for t in e.iter() if t.tag.endswith("}t")))
                e.clear()
    return out

def sheet_map(z):
    wb=ET.fromstring(z.read("xl/workbook.xml")); rel=ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    rm={x.attrib["Id"]:x.attrib["Target"] for x in rel}
    out=[]
    for s in wb.find("m:sheets",NS):
        target=rm[s.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]]
        target=target.lstrip("/")
        if not target.startswith("xl/"): target="xl/"+target
        out.append((s.attrib["name"],target))
    return out

def parse_sheet(z, path, ss):
    cells={}; formulas={}; maxr=maxc=0
    with z.open(path) as f:
        for _,e in ET.iterparse(f,events=("end",)):
            if not e.tag.endswith("}c"): continue
            ref=e.attrib.get("r"); typ=e.attrib.get("t")
            if not ref: e.clear(); continue
            r,c=row_num(ref),col_num(ref); maxr=max(maxr,r); maxc=max(maxc,c)
            fn=e.find("m:f",NS); vn=e.find("m:v",NS); isn=e.find("m:is",NS)
            formula=fn.text if fn is not None else None
            raw=vn.text if vn is not None else None
            if typ=="s" and raw is not None: val=ss[int(raw)]
            elif typ in ("str","inlineStr"):
                val="".join(t.text or "" for t in (isn.iter() if isn is not None else []) if t.tag.endswith("}t")) if isn is not None else raw
            elif typ=="b": val=(raw=="1")
            elif typ=="e": val=raw
            elif raw is None: val=None
            else:
                try: val=float(raw)
                except: val=raw
            cells[(r,c)]=val
            if formula is not None: formulas[(r,c)]=formula
            e.clear()
    return cells,formulas,maxr,maxc

def pct(xs,p):
    if not xs:return None
    xs=sorted(xs); k=(len(xs)-1)*p; a=math.floor(k); b=math.ceil(k)
    return xs[a] if a==b else xs[a]*(b-k)+xs[b]*(k-a)

def main():
    report={"file":str(SRC),"sheets":[],"price_columns":[],"duplicate_conflicts":[],"external_links":[]}
    dups=defaultdict(list); ext=Counter()
    with zipfile.ZipFile(SRC) as z:
        ss=shared_strings(z)
        for sname,path in sheet_map(z):
            cells,forms,maxr,maxc=parse_sheet(z,path,ss)
            for f in forms.values():
                for x in re.findall(r"\[[^\]]+\][^!]+!",f): ext[x]+=1
            headers=[]
            for (r,c),v in cells.items():
                if r<=100 and isinstance(v,str) and any(w in clean(v).lower() for w in PRICE_WORDS): headers.append((r,c,clean(v)))
            used_cols=set(); sheet_cols=[]
            for hr,pc,label in sorted(headers):
                if pc in used_cols: continue
                entries=[]; zeros=[]; neg=[]; blanks=[]; fcount=0
                for r in range(hr+1,maxr+1):
                    v=cells.get((r,pc)); f=forms.get((r,pc)); fcount+=int(f is not None)
                    item=""
                    for c in range(max(1,pc-6),pc):
                        x=clean(cells.get((r,c)))
                        if x and not re.fullmatch(r"[-+]?\d+(?:[.,]\d+)?",x): item=x
                    if isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v):
                        entries.append((r,item,float(v)))
                        if v==0: zeros.append(r)
                        if v<0: neg.append(r)
                        if item:
                            norm=re.sub(r"[^a-zа-яё0-9]+"," ",item.lower()).strip(); dups[norm].append((sname,r,pc,item,float(v)))
                    elif item and f is None: blanks.append((r,item))
                vals=[x[2] for x in entries]
                if len(vals)<3: continue
                used_cols.add(pc); pos=[x for x in vals if x>0]; q1=pct(pos,.25);q3=pct(pos,.75)
                outs=[]
                if q1 is not None:
                    hi=q3+3*(q3-q1); lo=max(0,q1-3*(q3-q1))
                    outs=[{"row":r,"item":i,"value":v} for r,i,v in entries if v>0 and (v<lo or v>hi)]
                rec={"sheet":sname,"header_row":hr,"column":pc,"header":label,"count":len(vals),"formula_count":fcount,"zero_count":len(zeros),"negative_count":len(neg),"min_positive":min(pos) if pos else None,"median_positive":pct(pos,.5),"max_positive":max(pos) if pos else None,"zeros_sample":zeros[:30],"negatives_sample":neg[:30],"blank_with_item_sample":[{"row":r,"item":i} for r,i in blanks[:30]],"outliers_sample":sorted(outs,key=lambda x:x["value"],reverse=True)[:30]}
                report["price_columns"].append(rec); sheet_cols.append(rec)
            report["sheets"].append({"name":sname,"max_row":maxr,"max_col":maxc,"cell_count":len(cells),"formula_count":len(forms),"price_columns":len(sheet_cols)})
    for norm,rows in dups.items():
        prices=sorted(set(round(x[4],6) for x in rows))
        if len(rows)>1 and len(prices)>1:
            report["duplicate_conflicts"].append({"name":norm,"prices":prices,"occurrences":[{"sheet":s,"row":r,"column":c,"item":i,"price":p} for s,r,c,i,p in rows]})
    report["duplicate_conflicts"].sort(key=lambda x:(-len(x["occurrences"]),x["name"]))
    report["external_links"]=[{"reference":k,"count":v} for k,v in ext.most_common()]
    OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps({"sheets":len(report["sheets"]),"price_columns":len(report["price_columns"]),"duplicate_conflicts":len(report["duplicate_conflicts"]),"external_refs":sum(x["count"] for x in report["external_links"]),"out":str(OUT)},ensure_ascii=False,indent=2))

if __name__=="__main__": main()
