"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import type { FactTable, DimTable, KeyJoin } from "@/types";

interface Props {
  onSaved: () => void;
}

const EMPTY_FACT = (): FactTable => ({ name: "", columns: "", description: "" });
const EMPTY_DIM = (): DimTable => ({ name: "", columns: "", description: "" });
const EMPTY_JOIN = (): KeyJoin => ({ from: "", to: "", join_type: "" });

export default function SchemaForm({ onSaved }: Props) {
  const [loading, setLoading] = useState(false);

  // Domain metadata
  const [domain, setDomain] = useState("");
  const [version, setVersion] = useState("");
  const [businessContext, setBusinessContext] = useState("");
  const [dbType, setDbType] = useState("");
  const [schemaPattern, setSchemaPattern] = useState("");

  // Dynamic lists
  const [facts, setFacts] = useState<FactTable[]>([EMPTY_FACT()]);
  const [dims, setDims] = useState<DimTable[]>([EMPTY_DIM()]);
  const [joins, setJoins] = useState<KeyJoin[]>([EMPTY_JOIN()]);

  // Text areas
  const [ddl, setDdl] = useState("");
  const [notes, setNotes] = useState("");

  // ── helpers ──
  const updateFact = (i: number, k: keyof FactTable, v: string) =>
    setFacts((f) => f.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const removeFact = (i: number) => setFacts((f) => f.filter((_, idx) => idx !== i));

  const updateDim = (i: number, k: keyof DimTable, v: string) =>
    setDims((d) => d.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const removeDim = (i: number) => setDims((d) => d.filter((_, idx) => idx !== i));

  const updateJoin = (i: number, k: keyof KeyJoin, v: string) =>
    setJoins((j) => j.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const removeJoin = (i: number) => setJoins((j) => j.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.schemas.create({
        domain,
        version,
        business_context: businessContext,
        db_type: dbType,
        schema_pattern: schemaPattern,
        fact_tables: facts.filter((r) => r.name),
        dimension_tables: dims.filter((r) => r.name),
        ddl,
        key_joins: joins
          .filter((r) => r.from)
          .map((r) => ({ from: r.from, to: r.to, join_type: r.join_type || "INNER" })),
        notes,
      });
      toast.success("Schema saved successfully");
      onSaved();
      clearForm();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save schema");
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setDomain(""); setVersion(""); setBusinessContext("");
    setDbType(""); setSchemaPattern("");
    setFacts([EMPTY_FACT()]); setDims([EMPTY_DIM()]); setJoins([EMPTY_JOIN()]);
    setDdl(""); setNotes("");
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1>Schema Submission</h1>
        <p>Document a database schema for a domain. This feeds the Text2SQL model&apos;s structural understanding.</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ── Domain Metadata ── */}
        <div className="card">
          <div className="card-title">Domain metadata</div>
          <div className="form-grid-3" style={{ marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">Domain name <span className="req">*</span></label>
              <input className="form-input" placeholder="e.g. HighTech (SaaS), Retail, Healthcare"
                value={domain} onChange={(e) => setDomain(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Schema version</label>
              <input className="form-input" placeholder="e.g. v1.0, 2024-Q4"
                value={version} onChange={(e) => setVersion(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Business context <span className="req">*</span></label>
              <input className="form-input" placeholder="e.g. SaaS subscription & revenue analytics"
                value={businessContext} onChange={(e) => setBusinessContext(e.target.value)} required />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Data warehouse / DB type</label>
              <select className="form-input" value={dbType} onChange={(e) => setDbType(e.target.value)}>
                <option value="">Select platform...</option>
                {["BigQuery","Snowflake","PostgreSQL","Redshift","Databricks (Delta Lake)","MySQL","SQL Server","DuckDB","Other"].map(o => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Schema pattern</label>
              <select className="form-input" value={schemaPattern} onChange={(e) => setSchemaPattern(e.target.value)}>
                <option value="">Select pattern...</option>
                {["Star Schema","Snowflake Schema","OBT (One Big Table)","Medallion (Bronze/Silver/Gold)","Data Vault","Operational / OLTP","Other"].map(o => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Fact Tables ── */}
        <div className="card">
          <div className="card-title">Fact tables</div>
          <div className="card-subtitle">Add each fact table with its primary key and brief description</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {facts.map((row, i) => (
              <div key={i} className="dynamic-row">
                <input className="form-input" placeholder="Table name (e.g. fact_revenue)"
                  style={{ flex: 1 }} value={row.name}
                  onChange={(e) => updateFact(i, "name", e.target.value)} />
                <input className="form-input" placeholder="Key columns (e.g. revenue_key, customer_key)"
                  style={{ flex: 1.5 }} value={row.columns}
                  onChange={(e) => updateFact(i, "columns", e.target.value)} />
                <input className="form-input" placeholder="Grain / description"
                  style={{ flex: 1 }} value={row.description}
                  onChange={(e) => updateFact(i, "description", e.target.value)} />
                <button type="button" className="btn-icon danger" onClick={() => removeFact(i)}>✕</button>
              </div>
            ))}
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn-secondary btn-sm"
              onClick={() => setFacts((f) => [...f, EMPTY_FACT()])}>+ Add fact table</button>
          </div>
        </div>

        {/* ── Dimension Tables ── */}
        <div className="card">
          <div className="card-title">Dimension tables</div>
          <div className="card-subtitle">Add dimension tables that support joins</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {dims.map((row, i) => (
              <div key={i} className="dynamic-row">
                <input className="form-input" placeholder="Table name (e.g. dim_customer)"
                  style={{ flex: 1 }} value={row.name}
                  onChange={(e) => updateDim(i, "name", e.target.value)} />
                <input className="form-input" placeholder="Key columns (e.g. customer_key, region)"
                  style={{ flex: 1.5 }} value={row.columns}
                  onChange={(e) => updateDim(i, "columns", e.target.value)} />
                <input className="form-input" placeholder="Description"
                  style={{ flex: 1 }} value={row.description}
                  onChange={(e) => updateDim(i, "description", e.target.value)} />
                <button type="button" className="btn-icon danger" onClick={() => removeDim(i)}>✕</button>
              </div>
            ))}
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn-secondary btn-sm"
              onClick={() => setDims((d) => [...d, EMPTY_DIM()])}>+ Add dimension table</button>
          </div>
        </div>

        {/* ── DDL ── */}
        <div className="card">
          <div className="card-title">DDL / Raw schema SQL</div>
          <div className="card-subtitle">Paste the CREATE TABLE statements for this schema (optional but recommended)</div>
          <textarea className="form-input" style={{ fontFamily: "var(--font-mono)", fontSize: 12, minHeight: 160 }}
            placeholder={`CREATE TABLE fact_subscriptions (\n  subscription_key SERIAL PRIMARY KEY,\n  customer_key     INTEGER NOT NULL,\n  mrr_usd          NUMERIC(14,2),\n  ...\n);`}
            value={ddl} onChange={(e) => setDdl(e.target.value)} />
        </div>

        {/* ── Key Joins ── */}
        <div className="card">
          <div className="card-title">Key joins &amp; relationships</div>
          <div className="card-subtitle">Describe important FK relationships or common join paths</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {joins.map((row, i) => (
              <div key={i} className="dynamic-row">
                <input className="form-input" placeholder="From (e.g. fact_subscriptions.customer_key)"
                  style={{ flex: 1 }} value={row.from}
                  onChange={(e) => updateJoin(i, "from", e.target.value)} />
                <input className="form-input" placeholder="To (e.g. dim_customer.customer_key)"
                  style={{ flex: 1 }} value={row.to}
                  onChange={(e) => updateJoin(i, "to", e.target.value)} />
                <input className="form-input" placeholder="Join type"
                  style={{ flex: 0.6 }} value={row.join_type}
                  onChange={(e) => updateJoin(i, "join_type", e.target.value)} />
                <button type="button" className="btn-icon danger" onClick={() => removeJoin(i)}>✕</button>
              </div>
            ))}
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn-secondary btn-sm"
              onClick={() => setJoins((j) => [...j, EMPTY_JOIN()])}>+ Add join</button>
          </div>
        </div>

        {/* ── Notes ── */}
        <div className="card">
          <div className="card-title">Notes &amp; special considerations</div>
          <textarea className="form-input"
            placeholder="e.g. mrr_usd is always monthly. arr_usd = mrr_usd * 12. date_key is integer YYYYMMDD..."
            value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {/* ── Actions ── */}
        <div className="btn-row">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><span className="spinner" /> Saving…</> : "Save schema"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={clearForm}>Clear</button>
        </div>
      </form>
    </div>
  );
}
