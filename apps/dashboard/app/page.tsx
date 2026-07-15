"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface ProjectRow {
  id: string;
  name: string;
  repoFullName: string | null;
  buildCount: number;
  latestBuild: { id: string; number: number; status: string } | null;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [name, setName] = useState("");
  const [repo, setRepo] = useState("");

  const load = () => api<ProjectRow[]>("/projects").then(setProjects).catch(() => undefined);
  useEffect(() => {
    void load();
  }, []);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    await api("/projects", {
      method: "POST",
      body: JSON.stringify({ name, repoFullName: repo || undefined }),
    });
    setName("");
    setRepo("");
    await load();
  }

  if (!projects) return <p className="muted">Loading…</p>;

  return (
    <>
      <h2>Projects</h2>
      <div className="grid">
        {projects.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong style={{ color: "var(--text)" }}>{p.name}</strong>
              {p.latestBuild && <span className={`badge ${p.latestBuild.status}`}>{p.latestBuild.status}</span>}
            </div>
            <p className="muted">
              {p.repoFullName ?? "no repo linked"} · {p.buildCount} builds
            </p>
          </Link>
        ))}
      </div>

      <div className="card" style={{ marginTop: 24, maxWidth: 480 }}>
        <h3>New project</h3>
        <form onSubmit={createProject} style={{ display: "grid", gap: 10 }}>
          <input placeholder="name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input placeholder="github repo (owner/name, optional)" value={repo} onChange={(e) => setRepo(e.target.value)} />
          <button type="submit">Create</button>
        </form>
      </div>
    </>
  );
}
