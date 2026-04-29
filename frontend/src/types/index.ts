// ──────────────────────────────────────────────
// Dataset types
// ──────────────────────────────────────────────
export interface DataModel {
  facts: string;
  dims: string;
  aggrs: string;
  hierarchies: string;
  snapshots: string;
}

export interface DatasetPayload {
  q_id?: number;
  domain: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  db_type: string;
  instruction: string;
  context: string;
  required_metrics_kpis: string[];
  aggregation_logic: Record<string, string>;
  chain_of_thought: string[];
  data_model: DataModel;
  sql: string;
}

export interface DatasetRecord {
  id: number;
  domain: string;
  data_json: DatasetPayload & { submitted_at: string; row_count?: number };
  created_at: string;
}

// ──────────────────────────────────────────────
// Schema types
// ──────────────────────────────────────────────
export interface FactTable {
  name: string;
  columns: string;
  description: string;
}

export interface DimTable {
  name: string;
  columns: string;
  description: string;
}

export interface KeyJoin {
  from: string;
  to: string;
  join_type: string;
}

export interface SchemaPayload {
  domain: string;
  version: string;
  business_context: string;
  db_type: string;
  schema_pattern: string;
  fact_tables: FactTable[];
  dimension_tables: DimTable[];
  ddl: string;
  key_joins: KeyJoin[];
  notes: string;
}

export interface SchemaRecord {
  id: number;
  domain: string;
  schema_json: SchemaPayload;
  created_at: string;
}

// ──────────────────────────────────────────────
// Stats
// ──────────────────────────────────────────────
export interface StatsResponse {
  total_schemas: number;
  total_tuples: number;
  unique_domains: number;
  easy: number;
  medium: number;
  hard_expert: number;
}
