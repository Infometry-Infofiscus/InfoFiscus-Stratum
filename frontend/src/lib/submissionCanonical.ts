import type { SubmissionRecord } from "@/types/submission";

/** Stable key order for duplicate detection (excludes volatile / id fields). */
export type CanonicalSubmissionBody = Omit<
  SubmissionRecord,
  "submission_id" | "created_at" | "status"
>;

function sortRecord(obj: Record<string, string>): Record<string, string> {
  return Object.keys(obj)
    .sort()
    .reduce<Record<string, string>>((acc, k) => {
      acc[k] = obj[k];
      return acc;
    }, {});
}

export function buildCanonicalBody(record: SubmissionRecord): CanonicalSubmissionBody {
  return {
    difficulty: record.difficulty,
    db_type: record.db_type.trim(),
    domain: record.domain.trim(),
    business_question: record.business_question.trim(),
    business_context: record.business_context.trim(),
    metrics: {
      kpis: [...record.metrics.kpis].map((s) => s.trim()).filter(Boolean).sort(),
      aggregation_logic: sortRecord(record.metrics.aggregation_logic),
    },
    chain_of_thought: [...record.chain_of_thought].map((s) => s.trim()).filter(Boolean),
    schema_tables: {
      fact_tables: [...record.schema_tables.fact_tables].map((s) => s.trim()).filter(Boolean).sort(),
      dimension_tables: [...record.schema_tables.dimension_tables]
        .map((s) => s.trim())
        .filter(Boolean)
        .sort(),
    },
    data_model_layers: {
      hierarchies: record.data_model_layers.hierarchies.trim(),
      aggregations: record.data_model_layers.aggregations.trim(),
      snapshots: record.data_model_layers.snapshots.trim(),
    },
    sql_answer: record.sql_answer.trim(),
  };
}

export function canonicalJsonString(body: CanonicalSubmissionBody): string {
  return JSON.stringify(body);
}

export async function sha256Hex(message: string): Promise<string> {
  const bytes = new TextEncoder().encode(message);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const arr = Array.from(new Uint8Array(digest));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}
