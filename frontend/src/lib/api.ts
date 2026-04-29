import type {
  DatasetPayload,
  DatasetRecord,
  SchemaPayload,
  SchemaRecord,
  StatsResponse,
} from "@/types";

const STORAGE_KEYS = {
  datasets: "text2sql.datasets",
  schemas: "text2sql.schemas",
  datasetNextId: "text2sql.datasetNextId",
  schemaNextId: "text2sql.schemaNextId",
} as const;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function readNumber(key: string, fallback = 1): number {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  const num = Number(raw);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

function writeNumber(key: string, value: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, String(value));
}

function nowIso() {
  return new Date().toISOString();
}

function downloadJson(filename: string, payload: unknown) {
  if (typeof window === "undefined") return;
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function getDatasets(): DatasetRecord[] {
  return readJson<DatasetRecord[]>(STORAGE_KEYS.datasets, []);
}

function setDatasets(items: DatasetRecord[]) {
  writeJson(STORAGE_KEYS.datasets, items);
}

function getSchemas(): SchemaRecord[] {
  return readJson<SchemaRecord[]>(STORAGE_KEYS.schemas, []);
}

function setSchemas(items: SchemaRecord[]) {
  writeJson(STORAGE_KEYS.schemas, items);
}

function buildStats(datasets: DatasetRecord[], schemas: SchemaRecord[]): StatsResponse {
  const domains = new Set(
    datasets
      .map((d) => d.data_json.domain?.trim())
      .filter(Boolean),
  );
  const easy = datasets.filter((d) => d.data_json.difficulty === "Easy").length;
  const medium = datasets.filter((d) => d.data_json.difficulty === "Medium").length;
  const hardExpert = datasets.filter((d) =>
    d.data_json.difficulty === "Hard" || d.data_json.difficulty === "Expert",
  ).length;

  return {
    total_schemas: schemas.length,
    total_tuples: datasets.length,
    unique_domains: domains.size,
    easy,
    medium,
    hard_expert: hardExpert,
  };
}

// ──────────────────────────────────────────────
// Datasets
// ──────────────────────────────────────────────
export const api = {
  data: {
    list: async (search = "", difficulty = ""): Promise<DatasetRecord[]> => {
      const query = search.trim().toLowerCase();
      return getDatasets().filter((row) => {
        const dj = row.data_json;
        const haystack = `${dj.domain ?? ""} ${dj.instruction ?? ""} ${dj.sql ?? ""}`.toLowerCase();
        const matchesSearch = query ? haystack.includes(query) : true;
        const matchesDiff = difficulty ? dj.difficulty === difficulty : true;
        return matchesSearch && matchesDiff;
      });
    },
    create: async (payload: DatasetPayload): Promise<DatasetRecord> => {
      const items = getDatasets();
      const id = readNumber(STORAGE_KEYS.datasetNextId, 1);
      const createdAt = nowIso();
      const record: DatasetRecord = {
        id,
        domain: payload.domain,
        created_at: createdAt,
        data_json: {
          ...payload,
          submitted_at: createdAt,
        },
      };
      setDatasets([record, ...items]);
      writeNumber(STORAGE_KEYS.datasetNextId, id + 1);
      return record;
    },
    remove: async (id: number): Promise<void> => {
      const items = getDatasets();
      setDatasets(items.filter((row) => row.id !== id));
    },
    stats: async (): Promise<StatsResponse> => buildStats(getDatasets(), getSchemas()),
  },

  schemas: {
    list: async (): Promise<SchemaRecord[]> => getSchemas(),
    create: async (payload: SchemaPayload): Promise<SchemaRecord> => {
      const items = getSchemas();
      const id = readNumber(STORAGE_KEYS.schemaNextId, 1);
      const createdAt = nowIso();
      const record: SchemaRecord = {
        id,
        domain: payload.domain,
        created_at: createdAt,
        schema_json: payload,
      };
      setSchemas([record, ...items]);
      writeNumber(STORAGE_KEYS.schemaNextId, id + 1);
      return record;
    },
    remove: async (id: number): Promise<void> => {
      const items = getSchemas();
      setSchemas(items.filter((row) => row.id !== id));
    },
  },

  export: {
    data: () => downloadJson("queries.json", getDatasets()),
    schemas: () => downloadJson("schemas.json", getSchemas()),
    all: () =>
      downloadJson("all_training_data.json", {
        exported_at: nowIso(),
        schemas: getSchemas(),
        datasets: getDatasets(),
        stats: buildStats(getDatasets(), getSchemas()),
      }),
  },
};
