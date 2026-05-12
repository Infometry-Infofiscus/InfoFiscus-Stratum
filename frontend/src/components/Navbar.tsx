"use client";

import Image from "next/image";

interface Props {
  dataCount: number;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// ── Configurable Help / Documentation URL ──────────────────────────────────
const HELP_DOCS_URL = "https://retail-analytics-docs.readthedocs.io/en/latest/";
// ───────────────────────────────────────────────────────────────────────────

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const BracesIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1"/>
    <path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/>
  </svg>
);

const HelpIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

export default function Navbar({ dataCount, theme, onToggleTheme }: Props) {
  const handleToggleJson = () => {
    window.dispatchEvent(new CustomEvent("toggle-json"));
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Image
          src={`${basePath}/infometry-inc-logo.png`}
          alt="Infometry"
          width={100}
          height={28}
          className="navbar-logo"
          style={{ objectFit: "contain", objectPosition: "left center" }}
          priority
        />
        <span className="navbar-brand-text">InfoFiscus Semantic Repository</span>
      </div>

      {/* FIX 1 — centered page title in navbar */}
      <div className="navbar-center">
        <span className="navbar-page-title">Query Entry</span>
        <span className="navbar-page-subtitle">Build structured NL→SQL training data</span>
      </div>

      <div className="navbar-right">
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
          {dataCount} {dataCount === 1 ? "entry" : "entries"} saved
        </span>

        {/* JSON preview toggle button */}
        <button
          className="icon-btn"
          onClick={handleToggleJson}
          title="Preview JSON"
          type="button"
        >
          <BracesIcon />
        </button>

        {/* Help / Documentation button */}
        <a
          href={HELP_DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="icon-btn"
          title="Help & Documentation"
          aria-label="Help & Documentation"
        >
          <HelpIcon />
        </a>

        <button
          className="icon-btn"
          onClick={onToggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          type="button"
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </nav>
  );
}
