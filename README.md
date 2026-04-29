# Text2SQL Data Collection Platform

Link: ➡️ https://infometry-infofiscus.github.io/text2sql_data_collection_platform/

A static Text-to-SQL data collection app built with Next.js and deployable on GitHub Pages.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 · React 19 · TypeScript |
| Styling | Tailwind CSS + custom CSS |
| Storage | Browser localStorage (client-side only) |
| Export | Client-side JSON download |
| Deployment | GitHub Pages (`docs/` from static export) |

---

## Current Architecture

This is a **frontend-only** app.

- No backend API service is required for local usage.
- Data is stored in browser `localStorage`.
- Exports are generated on the client side (`queries.json`, `schemas.json`, `all_training_data.json`).

---

## Project Structure

```text
text2sql_data_collection_platform-main/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── schema/SchemaForm.tsx
│   │   │   ├── data/QueryForm.tsx
│   │   │   └── admin/AdminPanel.tsx
│   │   ├── lib/api.ts
│   │   └── types/index.ts
│   ├── scripts/
│   │   └── publish-docs.mjs
│   ├── package.json
│   ├── next.config.js
│   └── ...
├── docs/                      # generated static site for GitHub Pages
├── README.md
└── commands.txt
```

---

## Quick Start (Local Development)

### 1) Install dependencies

```bash
cd frontend
npm install
```

### 2) Start development server

```bash
npm run dev
```

Open: http://localhost:3000

---

## Build for GitHub Pages

### Standard static build

```bash
cd frontend
npm run build
```

Output is generated in `frontend/out/`.

### Build and publish to repository `docs/`

```bash
cd frontend
npm run build:pages
```

This runs static export and copies the result into `/docs` for GitHub Pages.

---

## GitHub Pages Deployment

1. Commit and push the `docs/` folder to `main`.
2. Go to repository **Settings → Pages**.
3. Set:
   - **Branch**: `main`
   - **Folder**: `/docs`
4. Save and wait for Pages deployment.

---

## Data Behavior

- Submitted schemas and query tuples are saved in browser `localStorage`.
- Data is local to the device/browser profile.
- Exports are client-side downloads:
  - `queries.json`
  - `schemas.json`
  - `all_training_data.json`

---

## Dataset JSON Example

```json
{
  "q_id": 1,
  "domain": "HighTech (SaaS)",
  "difficulty": "Easy",
  "instruction": "What is the total MRR broken down by subscription status?",
  "context": "The VP of Finance needs a quick MRR snapshot...",
  "required_metrics_kpis": ["Total MRR by Status"],
  "aggregation_logic": {
    "Total MRR by Status": "SUM(mrr_usd) grouped by subscription_status"
  },
  "chain_of_thought": [
    "Step 1: Identify fact_subscriptions as the source table",
    "Step 2: Group by subscription_status",
    "Step 3: Apply SUM(mrr_usd)"
  ],
  "data_model": {
    "facts": "fact_subscriptions",
    "dims": "dim_customer, dim_date",
    "hierarchies": "",
    "aggrs": "SUM, GROUP BY",
    "snapshots": ""
  },
  "sql": "SELECT subscription_status, SUM(mrr_usd) AS total_mrr_usd FROM fact_subscriptions GROUP BY subscription_status ORDER BY total_mrr_usd DESC;"
}
```
