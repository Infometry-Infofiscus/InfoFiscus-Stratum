"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import type { DatasetPayload } from "@/types";
import { buildSubmissionRecordFromDataset } from "@/lib/buildSubmissionRecord";
import { isGitHubSubmitConfigured } from "@/lib/githubConfig";
import { submitPendingSubmission, formatSubmitError } from "@/lib/githubSubmit";
import { validateDatasetPayload } from "@/lib/submissionValidate";

interface Props { onSaved: () => void; }

const DOMAINS = ["Retail", "Healthcare", "HighTech (SaaS)", "Finance", "Manufacturing", "Supply Chain", "Other"];
const DB_TYPES = ["BigQuery","Snowflake","Redshift","PostgreSQL","MySQL","Oracle","Azure Synapse","Other"];

const COT_PLACEHOLDERS = [
  "Step 1: Explain the goal of the analysis and what you are trying to understand.",
  "Step 2: Describe the type of data needed (e.g. sales, customers, inventory).",
  "Step 3: Mention any conditions or filters applied (e.g. time period, exclusions).",
  "Step 4: Explain how key metrics are calculated (e.g. totals, averages, growth).",
  "Step 5: Describe how the final results are organized (e.g. grouped, sorted, ranked).",
  "Step 6: Mention any edge cases or alternative approaches…",
];
const getCotPlaceholder = (i: number) => i < COT_PLACEHOLDERS.length ? COT_PLACEHOLDERS[i] : "Additional reasoning…";

const TOOLTIP: Record<string, string> = {
  meta: `{ "difficulty": "Easy", "domain": "HighTech (SaaS)", "db_type": "BigQuery" }`,
  instruction: `"What is the total MRR broken down by subscription status?"`,
  context: `"The VP of Finance needs a MRR snapshot to assess revenue health."`,
  metrics: `KPI Name → Aggregation Formula\ne.g. "Total MRR" → "SUM(mrr_usd) grouped by subscription_status"`,
  cot: `Step 1: Identify fact_subscriptions as source\nStep 2: Group by subscription_status\nStep 3: SUM mrr_usd per group`,
  schema: `facts: "fact_subscriptions, fact_orders"\ndims: "dim_customer, dim_product"`,
  datamodel: `hierarchies: "Date > Month > Quarter > Year"\naggrs: "agg_monthly_revenue"\nsnapshots: "snap_inventory_daily"`,
  sql: `SELECT subscription_status, SUM(mrr_usd) AS total_mrr\nFROM fact_subscriptions\nGROUP BY 1 ORDER BY 2 DESC;`,
};

// ── Icons ────────────────────────────────────────────
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:11,height:11}}>
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}>
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const RotateIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}>
    <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.83"/>
  </svg>
);

// ── InfoTooltip ───────────────────────────────────────
function InfoTooltip({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} className="tooltip-wrap">
      <button type="button" className="tooltip-btn" onClick={() => setOpen(v => !v)}>i</button>
      {open && <div className="tooltip-popup">{content}</div>}
    </div>
  );
}

// ── SectionHeader ─────────────────────────────────────
function SH({ num, title, tip, children }: { num: string; title: string; tip: string; children?: React.ReactNode }) {
  return (
    <div className="section-header">
      <span className="section-title"><em>{num}</em>{title}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {children}
        <InfoTooltip content={TOOLTIP[tip]} />
      </div>
    </div>
  );
}

// ── Main Form ─────────────────────────────────────────
export default function QueryForm({ onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState<Record<string, boolean>>({});

  // FIX 2 — JSON drawer state
  const [jsonOpen, setJsonOpen] = useState(false);

  // FIX 2 — listen for global toggle-json event from Navbar
  useEffect(() => {
    const handler = () => setJsonOpen(v => !v);
    window.addEventListener("toggle-json", handler);
    return () => window.removeEventListener("toggle-json", handler);
  }, []);

  // Fields
  const [difficulty, setDifficulty] = useState("");
  const [dbType,     setDbType]     = useState("");
  const [dbTypeOther, setDbTypeOther] = useState("");
  const [domain,     setDomain]     = useState("");
  const [domainOther, setDomainOther] = useState("");
  const [instruction, setInstruction] = useState("");
  const [context,     setContext]     = useState("");

  // Merged metrics + aggregation: [{metric, logic}]
  const [aggrRows, setAggrRows] = useState<{metric: string; logic: string}[]>([{metric:"",logic:""}]);

  // COT
  const [cot, setCot] = useState<string[]>([""]);

  // FIX 5 — Schema starts empty (no phantom input rows)
  const [facts, setFacts] = useState<string[]>([]);
  const [dims,  setDims]  = useState<string[]>([]);

  // Data model
  const [hierarchies, setHierarchies] = useState("");
  const [aggrs,       setAggrs]       = useState("");
  const [snapshots,   setSnapshots]   = useState("");

  // SQL
  const [sql, setSql] = useState("");

  // Refs for focusing newly added schema items
  const factInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const dimInputRefs  = useRef<(HTMLInputElement | null)[]>([]);

  // ── Build JSON ────────────────────────────────────────
  const resolvedDomain = domain === "Other" ? domainOther.trim() : domain;
  const resolvedDb     = dbType  === "Other" ? dbTypeOther.trim() : dbType;

  const buildObj = useCallback(() => ({
    domain: resolvedDomain,
    difficulty: difficulty as "Easy"|"Medium"|"Hard"|"Expert",
    db_type: resolvedDb,
    instruction,
    context,
    required_metrics_kpis: aggrRows.filter(a => a.metric.trim()).map(a => a.metric),
    aggregation_logic: Object.fromEntries(aggrRows.filter(a=>a.metric.trim()).map(a=>[a.metric,a.logic])),
    chain_of_thought: cot
      .map((v, i) => v.trim() ? `Step ${i + 1}: ${v.trim()}` : "")
      .filter(Boolean),
    data_model: {
      facts: facts.filter(Boolean).join(", "),
      dims:  dims.filter(Boolean).join(", "),
      hierarchies, aggrs, snapshots,
    },
    sql,
  }), [resolvedDomain, resolvedDb, difficulty, instruction, context, aggrRows, cot, facts, dims, hierarchies, aggrs, snapshots, sql]);

  // ── Progress ──────────────────────────────────────────
  const filledCount = [
    difficulty, resolvedDb, resolvedDomain,
    instruction.trim(), context.trim(),
    aggrRows.some(a=>a.metric.trim()) ? "y" : "",
    facts.some(f=>f.trim()) ? "y" : "",
    dims.some(d=>d.trim())  ? "y" : "",
  ].filter(Boolean).length;
  const totalRequired = 8;

  // ── Validation ────────────────────────────────────────
  const validate = () => {
    const e: Record<string, boolean> = {};
    if (!difficulty || !dbType || !domain || (domain==="Other" && !domainOther.trim())) e.meta = true;
    if (!instruction.trim()) e.instruction = true;
    if (!context.trim())     e.context     = true;
    if (!aggrRows.some(a => a.metric.trim())) e.metrics = true;
    if (!facts.some(f => f.trim()))           e.facts   = true;
    if (!dims.some(d => d.trim()))            e.dims    = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Clear / Reset ─────────────────────────────────────
  // Declared before handleSubmit so the stable ref is available at call-site.
  // useCallback with no deps because all setters from useState are stable.
  const clearForm = useCallback(() => {
    setDifficulty("");
    setDbType("");
    setDbTypeOther("");
    setDomain("");
    setDomainOther("");
    setInstruction("");
    setContext("");
    setAggrRows([{ metric: "", logic: "" }]);
    setCot([""]);
    setFacts([]);
    setDims([]);
    setHierarchies("");
    setAggrs("");
    setSnapshots("");
    setSql("");
    setErrors({});
    // Flush stale DOM refs so focus-after-add logic stays clean
    factInputRefs.current = [];
    dimInputRefs.current  = [];
  }, []);

  // ── Submit ────────────────────────────────────────────
  const handleSubmit = async () => {
    // Re-entry guard — ignore rapid double-clicks while already submitting
    if (loading) return;
    if (!validate()) { toast.error("Please fill all required fields."); return; }
    const payload = buildObj() as DatasetPayload;
    const serverValidate = validateDatasetPayload(payload);
    if (serverValidate) { toast.error(serverValidate); return; }
    setLoading(true);
    try {
      if (isGitHubSubmitConfigured()) {
        const submissionId = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        const record = buildSubmissionRecordFromDataset(payload, submissionId, createdAt);
        const result = await submitPendingSubmission(record);
        await api.data.create(payload);
        const msg = result.htmlUrl
          ? `Submitted to GitHub: ${result.htmlUrl}`
          : `Submitted to GitHub: ${result.path}`;
        toast.success(msg);
        onSaved();
        clearForm(); // ← only runs on SUCCESS; catch block does NOT call this
      } else {
        await api.data.create(payload);
        toast.success(
          "Entry saved locally. Set NEXT_PUBLIC_GITHUB_OWNER / REPO and TOKEN or SUBMIT_PROXY to push to the repository.",
        );
        onSaved();
        clearForm(); // ← only runs on SUCCESS
      }
    } catch (err: unknown) {
      // Failure path — form is intentionally NOT cleared so the user
      // can correct their input and retry without re-entering everything.
      toast.error(formatSubmitError(err));
    } finally {
      setLoading(false);
    }
  };

  // FIX 2 — copy JSON to clipboard
  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(buildObj(), null, 2))
      .then(() => toast.success("JSON copied!"))
      .catch(() => toast.error("Copy failed"));
  };

  // ── Render ────────────────────────────────────────────
  return (
    <>
      {/* FIX 2 — JSON Drawer */}
      <div className={`json-drawer${jsonOpen ? " open" : ""}`}>
        <div className="json-drawer-header">
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="json-pulse-dot" />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Live JSON</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              onClick={copyJson}
              style={{ fontSize: 11, color: "var(--accent-text)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", fontWeight: 600 }}
            >
              Copy
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setJsonOpen(false)}
              style={{ width: 24, height: 24 }}
            >
              <XIcon />
            </button>
          </div>
        </div>
        <div className="json-drawer-content">
          {JSON.stringify(buildObj(), null, 2)}
        </div>
      </div>

      {/* Footer is rendered outside <form>, so onSubmit is intentionally omitted.
          Submission is driven by the explicit onClick on the Submit button below. */}
      <form noValidate>
        <div className={`form-grid${jsonOpen ? " drawer-open" : ""}`}>

          {/* ════════ LEFT COLUMN ════════ */}
          <div className="form-col">

            {/* 1 — Meta */}
            <div className={`section${errors.meta ? " has-error" : ""}`}>
              <SH num="1 · " title="Meta" tip="meta" />
              <div className="meta-row">
                <div>
                  <label className="field-label">Difficulty<span className="req">*</span></label>
                  <select className="form-input" value={difficulty}
                    onChange={e => { setDifficulty(e.target.value); setErrors(p=>({...p,meta:false})); }}>
                    <option value="">Select…</option>
                    {["Easy","Medium","Hard","Expert"].map(d=><option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">DB Type<span className="req">*</span></label>
                  <select className="form-input" value={dbType}
                    onChange={e => { setDbType(e.target.value); setDbTypeOther(""); setErrors(p=>({...p,meta:false})); }}>
                    <option value="">Select…</option>
                    {DB_TYPES.map(d=><option key={d}>{d}</option>)}
                  </select>
                  {dbType==="Other" && <input className="form-input" style={{marginTop:4}} placeholder="Specify DB…" value={dbTypeOther} onChange={e=>setDbTypeOther(e.target.value)} />}
                </div>
                <div>
                  <label className="field-label">Domain<span className="req">*</span></label>
                  <select className="form-input" value={domain}
                    onChange={e => { setDomain(e.target.value); setDomainOther(""); setErrors(p=>({...p,meta:false})); }}>
                    <option value="">Select…</option>
                    {DOMAINS.map(d=><option key={d}>{d}</option>)}
                  </select>
                  {domain==="Other" && <input className="form-input" style={{marginTop:4}} placeholder="Specify domain…" value={domainOther} onChange={e=>{ setDomainOther(e.target.value); setErrors(p=>({...p,meta:false})); }} />}
                </div>
              </div>
              {errors.meta && <span className="error-hint">All three fields are required</span>}
            </div>

            {/* 2 — Business Question */}
            <div className={`section grow${errors.instruction ? " has-error" : ""}`}>
              <SH num="2 · " title="Business Question" tip="instruction" />
              <div className="grow-content">
                <textarea
                  className="form-input"
                  placeholder="e.g. What is the total MRR broken down by subscription status?"
                  value={instruction}
                  onChange={e => { setInstruction(e.target.value); setErrors(p=>({...p,instruction:false})); }}
                />
              </div>
              {errors.instruction && <span className="error-hint">Required</span>}
            </div>

            {/* 3 — Business Context */}
            <div className={`section grow${errors.context ? " has-error" : ""}`}>
              <SH num="3 · " title="Business Context" tip="context" />
              <div className="grow-content">
                <textarea
                  className="form-input"
                  placeholder="e.g. The VP of Finance needs a quick MRR snapshot to assess revenue health."
                  value={context}
                  onChange={e => { setContext(e.target.value); setErrors(p=>({...p,context:false})); }}
                />
              </div>
              {errors.context && <span className="error-hint">Required</span>}
            </div>

            {/* 4 — Metrics + Aggregation (merged) */}
            <div className={`section grow${(errors.metrics) ? " has-error" : ""}`}>
              <SH num="4 · " title="Metrics & Aggregation" tip="metrics" />
              <div className="table-container">
                <div className="table-header">
                  <span>KPI / Metric Name<span className="req">*</span></span>
                  <span>Aggregation Formula</span>
                  <span />
                </div>
                <div className="table-rows">
                  {aggrRows.map((row, i) => (
                    <div key={i} className="table-row">
                      <div className="table-cell">
                        <textarea
                          rows={1}
                          placeholder="e.g. Total MRR by Status"
                          value={row.metric}
                          onChange={e => { setAggrRows(prev=>prev.map((v,idx)=>idx===i?{...v,metric:e.target.value}:v)); setErrors(p=>({...p,metrics:false})); }}
                        />
                      </div>
                      <div className="table-cell">
                        <textarea
                          rows={1}
                          placeholder="e.g. SUM(mrr_usd) grouped by subscription_status"
                          value={row.logic}
                          onChange={e => setAggrRows(prev=>prev.map((v,idx)=>idx===i?{...v,logic:e.target.value}:v))}
                        />
                      </div>
                      <div className="table-cell action">
                        <button type="button" className="del-btn" onClick={()=>setAggrRows(prev=>prev.filter((_,idx)=>idx!==i))}><XIcon /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button type="button" className="add-btn" onClick={()=>setAggrRows(p=>[...p,{metric:"",logic:""}])}>
                <PlusIcon /> Add row
              </button>
              {errors.metrics && <span className="error-hint" style={{display:"block"}}>At least one metric required</span>}
            </div>

          </div>{/* END LEFT */}

          {/* ════════ RIGHT COLUMN ════════ */}
          <div className="form-col">

            {/* 5 — Chain of Thought */}
            <div className="section grow">
              <SH num="5 · " title="Chain of Thought" tip="cot">
                <span className="badge-optional">Optional</span>
              </SH>
              <div className="cot-container">
                {cot.map((step, i) => (
                  <div key={i} className="cot-step">
                    <span className="cot-num">{i+1}</span>
                    <textarea
                      rows={1}
                      placeholder={getCotPlaceholder(i)}
                      value={step}
                      onChange={e => setCot(prev=>prev.map((v,idx)=>idx===i?e.target.value:v))}
                    />
                    {cot.length > 1 && (
                      <button type="button" className="del-btn" onClick={()=>setCot(prev=>prev.filter((_,idx)=>idx!==i))}><XIcon /></button>
                    )}
                  </div>
                ))}
                {/* FIX 4 — CoT empty state hint */}
                {cot.length === 1 && cot[0] === "" && (
                  <div className="cot-hint">
                    Add steps to document the AI&apos;s reasoning process
                  </div>
                )}
              </div>
              <button type="button" className="add-btn" onClick={()=>setCot(p=>[...p,""])}>
                <PlusIcon /> Add step
              </button>
            </div>

            {/* 6 — Schema Tables (Facts + Dims side by side) */}
            <div className={`section${(errors.facts||errors.dims) ? " has-error" : ""}`}>
              <SH num="6 · " title="Schema Tables" tip="schema" />
              <div className="schema-grid">
                {/* Fact Tables */}
                <div>
                  <div className="schema-col-label">Fact Tables<span className="req">*</span></div>
                  <div className="list-container">
                    {facts.map((f,i) => (
                      <div key={i} className="list-item">
                        <input
                          ref={el => { factInputRefs.current[i] = el; }}
                          placeholder="e.g. fact_subscriptions"
                          value={f}
                          onChange={e => { setFacts(prev=>prev.map((v,idx)=>idx===i?e.target.value:v)); setErrors(p=>({...p,facts:false})); }}
                        />
                        <button type="button" className="del-btn" onClick={()=>setFacts(prev=>prev.filter((_,idx)=>idx!==i))}><XIcon /></button>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="add-btn" onClick={() => {
                    setFacts(p => {
                      const next = [...p, ""];
                      setTimeout(() => factInputRefs.current[next.length - 1]?.focus(), 30);
                      return next;
                    });
                  }}><PlusIcon /> Add fact table</button>
                  {errors.facts && <span className="error-hint" style={{display:"block"}}>Required</span>}
                </div>
                {/* Dim Tables */}
                <div>
                  <div className="schema-col-label">Dimension Tables<span className="req">*</span></div>
                  <div className="list-container">
                    {dims.map((d,i) => (
                      <div key={i} className="list-item">
                        <input
                          ref={el => { dimInputRefs.current[i] = el; }}
                          placeholder="e.g. dim_customer"
                          value={d}
                          onChange={e => { setDims(prev=>prev.map((v,idx)=>idx===i?e.target.value:v)); setErrors(p=>({...p,dims:false})); }}
                        />
                        <button type="button" className="del-btn" onClick={()=>setDims(prev=>prev.filter((_,idx)=>idx!==i))}><XIcon /></button>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="add-btn" onClick={() => {
                    setDims(p => {
                      const next = [...p, ""];
                      setTimeout(() => dimInputRefs.current[next.length - 1]?.focus(), 30);
                      return next;
                    });
                  }}><PlusIcon /> Add dimension table</button>
                  {errors.dims && <span className="error-hint" style={{display:"block"}}>Required</span>}
                </div>
              </div>
            </div>

            {/* 7 — Data Model Layers */}
            <div className="section">
              <SH num="7 · " title="Data Model Layers" tip="datamodel" />
              <div className="datamodel-row">
                <div>
                  <label className="field-label">Hierarchies</label>
                  <input className="form-input" style={{height:32}} placeholder="Date > Month > Year" value={hierarchies} onChange={e=>setHierarchies(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Aggregations</label>
                  <input className="form-input" style={{height:32}} placeholder="agg_monthly_revenue" value={aggrs} onChange={e=>setAggrs(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Snapshots</label>
                  <input className="form-input" style={{height:32}} placeholder="snap_inventory_daily" value={snapshots} onChange={e=>setSnapshots(e.target.value)} />
                </div>
              </div>
            </div>

            {/* 8 — SQL Answer */}
            <div className="section grow">
              <SH num="8 · " title={`SQL Answer`} tip="sql">
                <span className="badge-optional">Optional</span>
              </SH>
              <div className="grow-content">
                <textarea
                  className="sql-editor"
                  placeholder={"SELECT subscription_status,\n       SUM(mrr_usd) AS total_mrr\nFROM   fact_subscriptions\nGROUP  BY 1\nORDER  BY 2 DESC;"}
                  value={sql}
                  onChange={e=>setSql(e.target.value)}
                />
              </div>
            </div>

          </div>{/* END RIGHT */}
        </div>
      </form>

      {/* ── STICKY FOOTER ── */}
      <div className="footer">
        <div className="footer-left">
          <span>{filledCount}/{totalRequired} required fields</span>
        </div>
        <div className="footer-right">
          <button type="button" className="btn btn-ghost" onClick={clearForm}>
            <RotateIcon /> Clear
          </button>
          {/* type="button" — footer lives outside <form> so type="submit" has no effect.
              onClick is the sole submission path; loading guard prevents double-triggers. */}
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? <><span className="spinner" /> Saving…</> : <><SendIcon /> Submit Entry</>}
          </button>
        </div>
      </div>
    </>
  );
}
