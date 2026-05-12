import type { DatasetPayload } from "@/types";
import type { SubmissionRecord } from "@/types/submission";

const DIFFICULTIES = new Set(["Easy", "Medium", "Hard", "Expert"]);

export function validateDatasetPayload(payload: DatasetPayload): string | null {
  if (!payload.difficulty || !DIFFICULTIES.has(payload.difficulty)) {
    return "Difficulty must be Easy, Medium, Hard, or Expert.";
  }
  if (!payload.db_type?.trim()) return "DB type is required.";
  if (!payload.domain?.trim()) return "Domain is required.";
  if (!payload.instruction?.trim()) return "Business question is required.";
  if (!payload.context?.trim()) return "Business context is required.";
  if (!payload.required_metrics_kpis?.some((k) => k?.trim())) {
    return "At least one metric / KPI is required.";
  }
  const facts = payload.data_model?.facts?.trim();
  const dims = payload.data_model?.dims?.trim();
  if (!facts) return "At least one fact table is required.";
  if (!dims) return "At least one dimension table is required.";
  return null;
}

export function validateSubmissionRecord(record: SubmissionRecord): string | null {
  if (!record.submission_id?.trim()) return "submission_id is missing.";
  if (!record.created_at?.trim()) return "created_at is missing.";
  if (record.status !== "pending") return 'New submissions must have status "pending".';
  return validateDatasetPayload({
    domain: record.domain,
    difficulty: record.difficulty,
    db_type: record.db_type,
    instruction: record.business_question,
    context: record.business_context,
    required_metrics_kpis: record.metrics.kpis,
    aggregation_logic: record.metrics.aggregation_logic,
    chain_of_thought: record.chain_of_thought,
    data_model: {
      facts: record.schema_tables.fact_tables.join(", "),
      dims: record.schema_tables.dimension_tables.join(", "),
      hierarchies: record.data_model_layers.hierarchies,
      aggrs: record.data_model_layers.aggregations,
      snapshots: record.data_model_layers.snapshots,
    },
    sql: record.sql_answer,
  });
}
