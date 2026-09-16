import type { Core1DataSource } from "./types";

export function buildAssetUrl(relativeAssetPath: string, basePath: string): string {
  const cleanPath = relativeAssetPath.replace(/^\/+/, "");
  const cleanBase = basePath.endsWith("/") ? basePath : `${basePath}/`;
  return `${cleanBase}${cleanPath}`;
}

export class BrowserDataSource implements Core1DataSource {
  public constructor(private readonly basePath: string = import.meta.env.BASE_URL) {}

  public async getText(assetPath: string): Promise<string> {
    const response = await fetch(buildAssetUrl(assetPath, this.basePath));
    if (!response.ok) throw new Error(`Failed to load ${assetPath}: HTTP ${response.status}`);
    return response.text();
  }

  public async getJson<T>(assetPath: string): Promise<T> {
    const response = await fetch(buildAssetUrl(assetPath, this.basePath));
    if (!response.ok) throw new Error(`Failed to load ${assetPath}: HTTP ${response.status}`);
    return response.json() as Promise<T>;
  }
}
