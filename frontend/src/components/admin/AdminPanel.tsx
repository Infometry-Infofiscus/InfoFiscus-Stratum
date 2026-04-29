"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import type { DatasetRecord, SchemaRecord, StatsResponse } from "@/types";

interface Props {
  onCountsLoaded: (schemas: number, data: number) => void;
}

const PILL_CLASS: Record<string, string> = {
  Easy:   "pill pill-easy",
  Medium: "pill pill-medium",
  Hard:   "pill pill-hard",
  Expert: "pill pill-expert",
};

export default function AdminPanel({ onCountsLoaded }: Props) {
  const [schemas, setSchemas]   = useState<SchemaRecord[]>([]);
  const [datasets, setDatasets] = useState<DatasetRecord[]>([]);
  const [stats, setStats]       = useState<StatsResponse | null>(null);
  const [loading, setLoading]   = useState(true);

  const [search, setSearch]     = useState("");
  const [diffFilter, setDiff]   = useState("");

  // FIX: Use ref for onCountsLoaded to avoid infinite re-render loop
  // (onCountsLoaded changes identity each render even when memoized in parent,
  //  putting it in useCallback deps caused re-fetch → re-render → re-fetch loop)
  const countsRef = useRef(onCountsLoaded);
  countsRef.current = onCountsLoaded;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [s, d, st] = await Promise.all([
        api.schemas.list(),
        api.data.list(),        // Fetch all; filter client-side for instant feedback
        api.data.stats(),
      ]);
      setSchemas(s);
      setDatasets(d);
      setStats(st);
      countsRef.current(s.length, st.total_tuples);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ── client-side search + difficulty filter (instant, no API roundtrip) ──
  const filtered = datasets.filter((r) => {
    const dj = r.data_json;
    const q = search.toLowerCase();
    const matchSearch = q
      ? ((dj.domain || "") + (dj.instruction || "") + (dj.sql || "")).toLowerCase().includes(q)
      : true;
    const matchDiff = diffFilter ? dj.difficulty === diffFilter : true;
    return matchSearch && matchDiff;
  });

  // ── delete helpers ──
  const deleteSchema = async (id: number) => {
    if (!confirm("Delete this schema?")) return;
    try {
      await api.schemas.remove(id);
      toast.success("Schema deleted");
      refresh();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const deleteDataset = async (id: number) => {
    if (!confirm("Delete this entry?")) return;
    try {
      await api.data.remove(id);
      toast.success("Entry deleted");
      refresh();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const clearAllSchemas = async () => {
    if (!confirm("Clear ALL schemas? This cannot be undone.")) return;
    try {
      await Promise.all(schemas.map((s) => api.schemas.remove(s.id)));
      toast.success("Cleared all schemas");
      refresh();
    } catch {
      toast.error("Failed to clear schemas");
    }
  };

  const clearAllData = async () => {
    if (!confirm("Clear ALL queries? This cannot be undone.")) return;
    try {
      await Promise.all(datasets.map((d) => api.data.remove(d.id)));
      toast.success("Cleared all queries");
      refresh();
    } catch {
      toast.error("Failed to clear queries");
    }
  };

  // Truncate text safely
  const truncate = (s: string, max: number) => (s.length > max ? s.slice(0, max) + "…" : s);

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1>Admin Panel</h1>
        <p>Review all submitted schemas and training tuples. Download for model training.</p>
      </div>

      {/* ── Stats ── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total schemas</div>
          <div className="stat-value">{stats?.total_schemas ?? "—"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total tuples</div>
          <div className="stat-value">{stats?.total_tuples ?? "—"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Unique domains</div>
          <div className="stat-value">{stats?.unique_domains ?? "—"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Easy / Med / Hard</div>
          <div className="stat-value" style={{ fontSize: 18 }}>
            {stats ? `${stats.easy} / ${stats.medium} / ${stats.hard_expert}` : "—"}
          </div>
        </div>
      </div>

      {/* ── Schemas card ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-700)" }}>
            Schemas <span className="pill pill-schema">{schemas.length}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => api.export.schemas()}>
              ↓ schemas.json
            </button>
            <button className="btn btn-danger btn-sm" onClick={clearAllSchemas}>
              Clear schemas
            </button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><span className="spinner" /></div>
        ) : schemas.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <p>No schemas submitted yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Domain</th>
                  <th>DB type</th>
                  <th>Pattern</th>
                  <th>Facts</th>
                  <th>Dims</th>
                  <th>Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {schemas.map((s, i) => {
                  const sj = s.schema_json;
                  return (
                    <tr key={s.id}>
                      <td>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{sj.domain}</td>
                      <td><span className="pill pill-schema">{sj.db_type || "—"}</span></td>
                      <td>{sj.schema_pattern || "—"}</td>
                      <td>{sj.fact_tables?.length ?? 0}</td>
                      <td>{sj.dimension_tables?.length ?? 0}</td>
                      <td style={{ color: "var(--text-400)", fontSize: 12 }}>
                        {s.created_at ? s.created_at.slice(0, 10) : ""}
                      </td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteSchema(s.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Training tuples card ── */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-700)" }}>
            Training tuples <span className="pill pill-data">{datasets.length}</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-success btn-sm" onClick={() => api.export.all()}>
              ↓ all_training_data.json
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => api.export.data()}>
              ↓ queries.json
            </button>
            <button className="btn btn-danger btn-sm" onClick={clearAllData}>
              Clear queries
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="search-bar">
          <input
            className="form-input"
            style={{ maxWidth: 320 }}
            placeholder="Search by domain, instruction..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="form-input"
            style={{ maxWidth: 160 }}
            value={diffFilter}
            onChange={(e) => setDiff(e.target.value)}
          >
            <option value="">All difficulties</option>
            {["Easy", "Medium", "Hard", "Expert"].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={refresh}>
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div className="empty-state"><span className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🗃️</div>
            <p>{datasets.length === 0 ? "No query tuples submitted yet." : "No matching tuples."}</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Q ID</th>
                  <th>Domain</th>
                  <th>Difficulty</th>
                  <th>Instruction</th>
                  <th>SQL preview</th>
                  <th>Rows</th>
                  <th>Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const dj = row.data_json;
                  const pillClass = PILL_CLASS[dj.difficulty] ?? "pill pill-hard";
                  const sqlPreview = (dj.sql || "").replace(/\n/g, " ");
                  return (
                    <tr key={row.id}>
                      <td style={{ fontWeight: 600 }}>{dj.q_id ?? "—"}</td>
                      <td>{dj.domain || "—"}</td>
                      <td><span className={pillClass}>{dj.difficulty || "—"}</span></td>
                      <td style={{ maxWidth: 240 }}>
                        <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {truncate(dj.instruction || "", 80)}
                        </span>
                      </td>
                      <td style={{ maxWidth: 200 }}>
                        <code style={{
                          display: "block", overflow: "hidden", textOverflow: "ellipsis",
                          whiteSpace: "nowrap", fontFamily: "var(--font-mono)",
                          fontSize: 11, color: "var(--text-400)"
                        }}>
                          {truncate(sqlPreview, 60)}
                        </code>
                      </td>
                      <td>{dj.row_count ?? "—"}</td>
                      <td style={{ color: "var(--text-400)", fontSize: 12 }}>
                        {row.created_at ? row.created_at.slice(0, 10) : ""}
                      </td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteDataset(row.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
