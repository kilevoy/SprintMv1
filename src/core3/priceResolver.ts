import dataset from "./data/price-dataset-v1.json";
import { core3Diagnostic, type Core3Diagnostic } from "./diagnostics";
import type { Core3PriceEntry, Core3PriceLine, Core3PriceUnit } from "./priceTypes";
import type { ProfiledSheetTakeoffLine } from "../enclosure/profiledSheetTakeoff";

const entries = dataset.entries as Core3PriceEntry[];
const sourceBase = { workbook: dataset.source.workbook, sha256: dataset.source.sha256, effective_date: dataset.effective_date };

function findEntry(product: string): Core3PriceEntry | null {
  const normalized = product.trim().toLocaleLowerCase("ru-RU");
  return entries.find((entry) => [entry.canonical_mark, ...entry.aliases].some((mark) => mark.toLocaleLowerCase("ru-RU") === normalized)) ?? null;
}

export function resolveCore3Price(line: Pick<ProfiledSheetTakeoffLine, "product" | "unit" | "component" | "orientation" | "quantity">): Core3PriceLine {
  const expectedUnit = line.unit as Core3PriceUnit;
  const entry = findEntry(line.product);
  const diagnostics: Core3Diagnostic[] = [];
  if (!entry) {
    const generic = ["профлист", "с-18", "с-44"].includes(line.product.trim().toLocaleLowerCase("ru-RU"));
    diagnostics.push(core3Diagnostic(
      generic ? "CORE3_GENERIC_PROFILE_MARK_UNSUPPORTED" : "CORE3_UNKNOWN_PRODUCT_MARK",
      generic ? "Generic-профлист без точной марки не может получить цену." : `В dataset нет доказанной цены для позиции «${line.product}».`,
      line.component,
      { product: line.product },
    ));
    return { component: line.component, orientation: line.orientation, product: line.product, quantity: line.quantity, unit: expectedUnit, unitPrice: null, lineCost: null, source: null, diagnostics };
  }
  if (entry.unit !== expectedUnit) {
    diagnostics.push(core3Diagnostic("CORE3_UNIT_UNKNOWN", `Единица позиции «${line.product}» не совпадает с единицей takeoff.`, line.component, { expected: expectedUnit, dataset: entry.unit }));
  }
  if (entry.price_per_unit === null) {
    diagnostics.push(core3Diagnostic("CORE3_PRICE_NOT_FOUND", `Цена позиции «${line.product}» отсутствует в dataset.`, line.component));
  }
  const source = { ...sourceBase, ...entry.source };
  const valid = diagnostics.length === 0 && entry.price_per_unit !== null;
  return { component: line.component, orientation: line.orientation, product: line.product, quantity: line.quantity, unit: expectedUnit, unitPrice: valid ? entry.price_per_unit : null, lineCost: valid ? line.quantity * entry.price_per_unit! : null, source: valid ? source : null, diagnostics };
}
