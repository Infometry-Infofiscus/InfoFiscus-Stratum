import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const ROOT = join(process.cwd());
const SUBMISSIONS = join(ROOT, "submissions");
const DIRS = ["pending", "reviewed", "rejected"];

const REQUIRED = [
  "submission_id",
  "created_at",
  "difficulty",
  "db_type",
  "domain",
  "business_question",
  "business_context",
  "metrics",
  "chain_of_thought",
  "schema_tables",
  "data_model_layers",
  "sql_answer",
  "status",
];

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

async function validateFile(filePath) {
  const raw = await readFile(filePath, "utf8");
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    fail(`${filePath}: invalid JSON (${e.message})`);
  }
  for (const k of REQUIRED) {
    if (!(k in data)) {
      if (
        k === "submission_id" &&
        ("instruction" in data || "sql" in data || "required_metrics_kpis" in data)
      ) {
        fail(
          `${filePath}: missing "${k}" — file uses form preview JSON (instruction/sql fields). ` +
            "Use Submit Entry in the app, or run: node scripts/normalize-submissions.mjs --write",
        );
      }
      fail(`${filePath}: missing "${k}"`);
    }
  }
  const diff = data.difficulty;
  if (!["Easy", "Medium", "Hard", "Expert"].includes(diff)) {
    fail(`${filePath}: invalid difficulty`);
  }
  if (typeof data.metrics !== "object" || data.metrics === null) {
    fail(`${filePath}: metrics must be an object`);
  }
  if (!Array.isArray(data.metrics.kpis)) fail(`${filePath}: metrics.kpis must be an array`);
  if (
    typeof data.metrics.aggregation_logic !== "object" ||
    data.metrics.aggregation_logic === null
  ) {
    fail(`${filePath}: metrics.aggregation_logic must be an object`);
  }
  if (!Array.isArray(data.chain_of_thought)) {
    fail(`${filePath}: chain_of_thought must be an array`);
  }
  if (typeof data.schema_tables !== "object" || data.schema_tables === null) {
    fail(`${filePath}: schema_tables must be an object`);
  }
  if (!Array.isArray(data.schema_tables.fact_tables)) {
    fail(`${filePath}: schema_tables.fact_tables must be an array`);
  }
  if (!Array.isArray(data.schema_tables.dimension_tables)) {
    fail(`${filePath}: schema_tables.dimension_tables must be an array`);
  }
  if (typeof data.data_model_layers !== "object" || data.data_model_layers === null) {
    fail(`${filePath}: data_model_layers must be an object`);
  }
  for (const k of ["hierarchies", "aggregations", "snapshots"]) {
    if (typeof data.data_model_layers[k] !== "string") {
      fail(`${filePath}: data_model_layers.${k} must be a string`);
    }
  }
  if (typeof data.sql_answer !== "string") {
    fail(`${filePath}: sql_answer must be a string`);
  }
  const st = data.status;
  if (!["pending", "reviewed", "rejected"].includes(st)) {
    fail(`${filePath}: invalid status`);
  }
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
  const targets = [];
  for (const d of DIRS) {
    const dir = join(SUBMISSIONS, d);
    try {
      targets.push(...(await walk(dir)));
    } catch {
      /* optional folder */
    }
  }
  if (targets.length === 0) {
    console.log("No submission JSON files to validate.");
    return;
  }
  for (const f of targets) {
    await validateFile(f);
  }
  console.log(`Validated ${targets.length} submission file(s).`);
}

main().catch((e) => fail(e.message));
