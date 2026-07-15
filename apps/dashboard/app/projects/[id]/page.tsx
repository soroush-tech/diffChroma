"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Project {
  id: string;
  name: string;
  projectToken: string;
  repoFullName: string | null;
  installationId: number | null;
}

interface BuildRow {
  id: string;
  number: number;
  status: string;
  branch: string;
  commitSha: string;
  changedCount: number;
  newCount: number;
  storyCount: number;
  createdAt: string;
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [builds, setBuilds] = useState<BuildRow[] | null>(null);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    void api<Project>(`/projects/${id}`).then(setProject).catch(() => undefined);
    void api<BuildRow[]>(`/projects/${id}/builds`).then(setBuilds).catch(() => undefined);
  }, [id]);

  if (!project || !builds) return <p className="muted">Loading…</p>;

  return (
    <>
      <p>
        <Link href="/">← projects</Link>
      </p>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2>{project.name}</h2>
        <button className="secondary" onClick={() => setShowToken((v) => !v)}>
          {showToken ? "Hide token" : "Show project token"}
        </button>
      </div>
      {showToken && (
        <p>
          <code className="token">{project.projectToken}</code>
        </p>
      )}
      <p className="muted">
        {project.repoFullName ?? "no repo linked"} ·{" "}
        {project.installationId ? "GitHub App installed" : "GitHub App not installed"}
      </p>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>status</th>
            <th>branch</th>
            <th>commit</th>
            <th>changes</th>
            <th>when</th>
          </tr>
        </thead>
        <tbody>
          {builds.map((b) => (
            <tr key={b.id}>
              <td>
                <Link href={`/builds/${b.id}`}>#{b.number}</Link>
              </td>
              <td>
                <span className={`badge ${b.status}`}>{b.status}</span>
              </td>
              <td>{b.branch}</td>
              <td className="muted">{b.commitSha.slice(0, 8)}</td>
              <td className="muted">
                {b.changedCount} changed / {b.newCount} new / {b.storyCount} total
              </td>
              <td className="muted">{new Date(b.createdAt).toLocaleString()}</td>
            </tr>
          ))}
          {builds.length === 0 && (
            <tr>
              <td colSpan={6} className="muted">
                No builds yet — run the DiffChroma action or `pnpm simulate`.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
