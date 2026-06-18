/**
 * Converts legacy form-preview JSON (instruction/context/sql fields)
 * into the canonical SubmissionRecord shape expected by validate-submissions.mjs.
 *
 * Usage: node scripts/normalize-submissions.mjs [--write]
 * Without --write, runs dry-run only.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { randomUUID } from "node:crypto";

const ROOT = join(process.cwd());
const SUBMISSIONS = join(ROOT, "submissions");
const DIRS = ["pending", "reviewed", "rejected"];
const WRITE = process.argv.includes("--write");

function splitTableList(csv) {
  return String(csv ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isLegacyFormPayload(data) {
  return (
    typeof data === "object" &&
    data !== null &&
    !("submission_id" in data) &&
    ("instruction" in data || "sql" in data || "required_metrics_kpis" in data)
  );
}

function parseFilenameMeta(name) {
  const m = name.match(/^fp-[a-f0-9]{32}-([a-f0-9]{8})-(\d+)-[a-f0-9]+\.json$/i);
  if (!m) return { idPrefix: null, createdAtMs: null };
  return { idPrefix: m[1], createdAtMs: Number(m[2]) };
}

function legacyToRecord(data, folderStatus, fileName) {
  const { idPrefix, createdAtMs } = parseFilenameMeta(fileName);
  const createdAt =
    Number.isFinite(createdAtMs) && createdAtMs > 0
      ? new Date(createdAtMs).toISOString()
      : new Date().toISOString();

  // Preserve the short id embedded in the filename when present.
  const submissionId = idPrefix
    ? `${idPrefix}0000-4000-8000-${randomUUID().slice(24)}`
    : randomUUID();

  return {
    submission_id: submissionId,
    created_at: createdAt,
    difficulty: data.difficulty,
    db_type: data.db_type ?? "",
    domain: data.domain ?? "",
    business_question: data.instruction ?? "",
    business_context: data.context ?? "",
    metrics: {
      kpis: Array.isArray(data.required_metrics_kpis) ? [...data.required_metrics_kpis] : [],
      aggregation_logic:
        typeof data.aggregation_logic === "object" && data.aggregation_logic !== null
          ? { ...data.aggregation_logic }
          : {},
    },
    chain_of_thought: Array.isArray(data.chain_of_thought) ? [...data.chain_of_thought] : [],
    schema_tables: {
      fact_tables: splitTableList(data.data_model?.facts),
      dimension_tables: splitTableList(data.data_model?.dims),
    },
    data_model_layers: {
      hierarchies: data.data_model?.hierarchies ?? "",
      aggregations: data.data_model?.aggrs ?? "",
      snapshots: data.data_model?.snapshots ?? "",
    },
    sql_answer: data.sql ?? "",
    status: folderStatus,
  };
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const ent of entries) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "examples") continue;
      files.push(...(await walk(p)));
    } else if (ent.isFile() && extname(ent.name) === ".json" && ent.name !== ".gitkeep") {
      files.push(p);
    }
  }
  return files;
}

async function main() {
  let converted = 0;
  for (const d of DIRS) {
    const dir = join(SUBMISSIONS, d);
    let files = [];
    try {
      files = await walk(dir);
    } catch {
      continue;
    }
    for (const filePath of files) {
      const raw = await readFile(filePath, "utf8");
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        console.warn(`Skipping invalid JSON: ${filePath}`);
        continue;
      }
      if (!isLegacyFormPayload(data)) continue;

      const record = legacyToRecord(data, d === "pending" ? "pending" : d, basename(filePath));
      converted += 1;
      console.log(`${WRITE ? "Updated" : "Would update"}: ${filePath}`);
      if (WRITE) {
        await writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
      }
    }
  }

  if (converted === 0) {
    console.log("No legacy form-preview submission files found.");
    return;
  }
  console.log(
    `${WRITE ? "Normalized" : "Would normalize"} ${converted} file(s).` +
      (WRITE ? "" : " Re-run with --write to apply changes."),
  );
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
