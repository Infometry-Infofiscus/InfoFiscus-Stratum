import type { DatasetPayload } from "@/types";
import type { SubmissionRecord } from "@/types/submission";

function splitTableList(csv: string): string[] {
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Maps the existing QueryForm payload (DatasetPayload / buildObj shape) to the GitHub JSON schema.
 */
export function buildSubmissionRecordFromDataset(
  payload: DatasetPayload,
  submissionId: string,
  createdAtIso: string,
): SubmissionRecord {
  return {
    submission_id: submissionId,
    created_at: createdAtIso,
    difficulty: payload.difficulty,
    db_type: payload.db_type,
    domain: payload.domain,
    business_question: payload.instruction,
    business_context: payload.context,
    metrics: {
      kpis: [...payload.required_metrics_kpis],
      aggregation_logic: { ...payload.aggregation_logic },
    },
    chain_of_thought: [...payload.chain_of_thought],
    schema_tables: {
      fact_tables: splitTableList(payload.data_model.facts),
      dimension_tables: splitTableList(payload.data_model.dims),
    },
    data_model_layers: {
      hierarchies: payload.data_model.hierarchies,
      aggregations: payload.data_model.aggrs,
      snapshots: payload.data_model.snapshots,
    },
    sql_answer: payload.sql,
    status: "pending",
  };
}
