# Text2SQL Data Collection Platform

> A collaborative platform for building high-quality Text-to-SQL fine-tuning datasets — structured, exportable, and ready for model training.

🔗 **Live App:** https://infometry-infofiscus.github.io/InfoFiscus-Stratum/
---

## What Is This?

This tool lets your team collect and structure Text-to-SQL training tuples in a consistent JSON format. Contributors submit natural language questions paired with SQL queries, schema context, chain-of-thought reasoning, and metadata — all exportable as training-ready JSON files.

Built for internal use at **Infometry / Infofiscus** to power the Conversa AI assistant's fine-tuned SLM.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 · React 19 · TypeScript |
| Styling | Tailwind CSS + custom CSS |
| Storage | Browser `localStorage` (client-side only) |
| Export | Client-side JSON download |
| Deployment | GitHub Pages (`docs/` from static export) |

---

## Project Structure

```text
text2sql_data_collection_platform/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── schema/SchemaForm.tsx       # Schema definition UI
│   │   │   ├── data/QueryForm.tsx          # Query tuple submission UI
│   │   │   └── admin/AdminPanel.tsx        # Export and data management
│   │   ├── lib/api.ts
│   │   └── types/index.ts
│   ├── scripts/
│   │   └── publish-docs.mjs               # Copies build output to /docs
│   ├── package.json
│   ├── next.config.js
│   └── ...
├── docs/                                   # Static site served by GitHub Pages
└── README.md
```

---

## Quick Start (Local Development)

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Start development server

```bash
npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

---

## Build & Deploy

### Static build (local preview)

```bash
cd frontend
npm run build
```

Output generated in `frontend/out/`.

### Build and publish to GitHub Pages

```bash
cd frontend
npm run build:pages
```

Runs static export and copies output into `/docs` for GitHub Pages deployment.

### GitHub Pages setup (one-time)

1. Push the `docs/` folder to `main`
2. Go to **Settings → Pages**
3. Set **Branch**: `main`, **Folder**: `/docs`
4. Save and wait for deployment

---

## How to Contribute a Training Tuple

Follow this workflow to add a new entry to the dataset:

### Step 1 — Define a Schema (if not already done)

Go to the **Schema** tab and submit the relevant table structure:
- Table names (fact + dimension)
- Column names and data types
- Domain (e.g., Retail, SaaS, Finance)
- DB type (Snowflake, BigQuery, etc.)

### Step 2 — Submit a Query Tuple

Go to the **Data** tab and fill in:

| Field | Description |
|---|---|
| `instruction` | Natural language question a business user would ask |
| `context` | Who is asking and why (business context) |
| `difficulty` | Easy / Medium / Hard |
| `domain` | Industry vertical |
| `db_type` | Target SQL dialect |
| `chain_of_thought` | Step-by-step reasoning before writing SQL |
| `metrics_and_aggregation` | KPI name + formula |
| `schema_tables` | Relevant fact and dimension tables |
| `sql` | Final SQL query answering the instruction |

### Step 3 — Export

Go to the **Admin** tab and download:
- `queries.json` — all query tuples
- `schemas.json` — all schema definitions
- `all_training_data.json` — combined export for model training

---

## Dataset JSON Format

Each training record follows this structure:

```json
{
  "q_id": 1,
  "difficulty": "Easy",
  "db_type": "Snowflake",
  "domain": "HighTech (SaaS)",
  "instruction": "What is the total MRR broken down by subscription status?",
  "context": "The VP of Finance needs a quick MRR snapshot to assess revenue health.",
  "metrics_and_aggregation": [
    {
      "kpi_metric_name": "Total MRR by Status",
      "aggregation_formula": "SUM(mrr_usd) grouped by subscription_status"
    }
  ],
  "chain_of_thought": [
    "Step 1: Identify the goal — summarize recurring revenue by customer subscription status.",
    "Step 2: Source table is fact_subscriptions which contains mrr_usd and subscription_status.",
    "Step 3: No date filter needed — VP wants current snapshot across all statuses.",
    "Step 4: Aggregate using SUM(mrr_usd), grouped by subscription_status.",
    "Step 5: Sort by total_mrr DESC to surface highest-revenue statuses first.",
    "Step 6: Edge case — NULL status rows should be excluded or flagged separately."
  ],
  "schema_tables": {
    "fact_tables": ["fact_subscriptions"],
    "dimension_tables": ["dim_customer", "dim_date"]
  },
  "data_model_layers": {
    "hierarchies": "Date > Month > Year",
    "aggregations": "agg_monthly_revenue",
    "snapshots": "snap_subscription_daily"
  },
  "sql": "SELECT subscription_status, SUM(mrr_usd) AS total_mrr FROM fact_subscriptions GROUP BY 1 ORDER BY 2 DESC;"
}
```

### `all_training_data.json` wrapper structure

```json
{
  "exported_at": "2025-04-29T10:00:00.000Z",
  "total_queries": 42,
  "schemas": [ ... ],
  "queries": [ ... ]
}
```

---

## License

Internal use — Infometry Inc. Not licensed for public distribution.
