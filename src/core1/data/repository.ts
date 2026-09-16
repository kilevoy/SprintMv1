import { parseDatasetCsv } from "./csv";
import type {
  Core1DataManifest,
  Core1DataRepository,
  Core1DataSource,
  Core1Fixture,
  Core1FixtureManifest,
  ClimateDatasetId,
  DatasetManifestEntry,
  LoadedDataset,
  PurlinDatasetId,
} from "./types";
import type { SpanM } from "../types";

const FRAME_DATASET_BY_SPAN: Readonly<Record<SpanM, string>> = {
  9: "frame_9m_cells",
  12: "frame_12m_cells",
  15: "frame_15m_cells",
  18: "frame_18m_cells",
  21: "frame_21m_cells",
  24: "frame_24m_cells",
};

const FIXTURE_MANIFEST_ASSET = "core1/fixtures/manifest.json";

function assetForDataset(descriptor: DatasetManifestEntry): string {
  return `core1/${descriptor.path}`;
}

function ensureManifest(value: Core1DataManifest): Core1DataManifest {
  if (!value || !Array.isArray(value.datasets)) throw new Error("Invalid core1 data manifest");
  return value;
}

export class BrowserCore1DataRepository implements Core1DataRepository {
  private manifestPromise: Promise<Core1DataManifest> | undefined;
  private fixtureManifestPromise: Promise<Core1FixtureManifest> | undefined;
  private readonly datasetPromises = new Map<string, Promise<LoadedDataset>>();

  public constructor(private readonly source: Core1DataSource) {}

  public loadManifest(): Promise<Core1DataManifest> {
    this.manifestPromise ??= this.source
      .getJson<Core1DataManifest>("core1/data/manifest.json")
      .then(ensureManifest);
    return this.manifestPromise;
  }

  public async loadFrameDataset(span: SpanM): Promise<LoadedDataset> {
    return this.loadDataset(FRAME_DATASET_BY_SPAN[span]);
  }

  public loadPurlinDataset(id: PurlinDatasetId): Promise<LoadedDataset> {
    return this.loadDataset(id);
  }

  public loadRoofProperties(): Promise<LoadedDataset> {
    return this.loadDataset("roof_properties");
  }

  public loadDeckProperties(): Promise<LoadedDataset> {
    return this.loadDataset("deck_properties");
  }

  public loadClimateDataset(id: ClimateDatasetId): Promise<LoadedDataset> {
    return this.loadDataset(id);
  }

  public loadSecondarySteelData(): Promise<LoadedDataset> {
    return this.loadDataset("secondary_steel_rules");
  }

  public loadConstants(): Promise<LoadedDataset> {
    return this.loadDataset("purlin_calculation_constants");
  }

  public loadFixtureManifest(): Promise<Core1FixtureManifest> {
    this.fixtureManifestPromise ??= this.source.getJson<Core1FixtureManifest>(FIXTURE_MANIFEST_ASSET);
    return this.fixtureManifestPromise;
  }

  public async loadFixture(id: string): Promise<Core1Fixture> {
    const manifest = await this.loadFixtureManifest();
    const entry = manifest.fixtures.find((fixture) => fixture.id === id);
    if (!entry) throw new Error(`Unknown Core 1 fixture: ${id}`);
    const [input, expected] = await Promise.all([
      this.source.getJson(`core1/fixtures/${entry.input_file}`),
      this.source.getJson(`core1/fixtures/${entry.expected_file}`),
    ]);
    return { input, expected };
  }

  private async loadDataset(id: string): Promise<LoadedDataset> {
    const cached = this.datasetPromises.get(id);
    if (cached) return cached;
    const promise = this.loadDatasetUncached(id);
    this.datasetPromises.set(id, promise);
    return promise;
  }

  private async loadDatasetUncached(id: string): Promise<LoadedDataset> {
    const manifest = await this.loadManifest();
    const descriptor = manifest.datasets.find((dataset) => dataset.id === id);
    if (!descriptor) throw new Error(`Unknown Core 1 dataset: ${id}`);
    if (descriptor.format !== "csv") throw new Error(`Unsupported dataset format: ${descriptor.format}`);
    const text = await this.source.getText(assetForDataset(descriptor));
    return { descriptor, records: parseDatasetCsv(text) };
  }
}
