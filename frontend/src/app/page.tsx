"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import QueryForm from "@/components/data/QueryForm";
import { api } from "@/lib/api";

export default function Home() {
  const [dataBadge, setDataBadge] = useState(0);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("qf-theme") as "dark" | "light" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
    api.data.stats()
      .then(st => setDataBadge(st.total_tuples))
      .catch(() => {});
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("qf-theme", next);
  };

  const handleDataAdded = () => setDataBadge(n => n + 1);

  return (
    <>
      <Navbar dataCount={dataBadge} theme={theme} onToggleTheme={toggleTheme} />
      <main className="page-wrapper">
        <QueryForm onSaved={handleDataAdded} />
      </main>
    </>
  );
}
