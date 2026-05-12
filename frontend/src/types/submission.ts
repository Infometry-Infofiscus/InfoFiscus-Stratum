/**
 * Canonical record written to submissions/pending/*.json
 */
export interface SubmissionMetrics {
  kpis: string[];
  aggregation_logic: Record<string, string>;
}

export interface SubmissionSchemaTables {
  fact_tables: string[];
  dimension_tables: string[];
}

export interface SubmissionDataModelLayers {
  hierarchies: string;
  aggregations: string;
  snapshots: string;
}

export type SubmissionDifficulty = "Easy" | "Medium" | "Hard" | "Expert";
export type SubmissionStatus = "pending" | "reviewed" | "rejected";

export interface SubmissionRecord {
  submission_id: string;
  created_at: string;
  difficulty: SubmissionDifficulty;
  db_type: string;
  domain: string;
  business_question: string;
  business_context: string;
  metrics: SubmissionMetrics;
  chain_of_thought: string[];
  schema_tables: SubmissionSchemaTables;
  data_model_layers: SubmissionDataModelLayers;
  sql_answer: string;
  status: SubmissionStatus;
}
