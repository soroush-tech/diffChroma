"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

interface Snapshot {
  id: string;
  storyId: string;
  storyTitle: string;
  viewport: string;
  status: string;
  diffPixelRatio: number | null;
  imageUrl: string;
  diffUrl: string | null;
  baselineUrl: string | null;
}

interface BuildDetail {
  id: string;
  number: number;
  status: string;
  commitSha: string;
  branch: string;
  error: string | null;
  project: { id: string; name: string };
  counts: { total: number; changed: number; new: number };
  snapshots: Snapshot[];
}

interface Comment {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
}

const ACTIVE_STATUSES = ["QUEUED", "RENDERING", "COMPARING"];
const FILTERS = ["ALL", "CHANGED", "NEW", "UNCHANGED", "APPROVED", "REJECTED"] as const;

export default function BuildPage() {
  const { id } = useParams<{ id: string }>();
  const [build, setBuild] = useState<BuildDetail | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");

  const load = useCallback(
    () => api<BuildDetail>(`/builds/${id}`).then(setBuild).catch(() => undefined),
    [id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Poll while the pipeline is still running.
  useEffect(() => {
    if (!build || !ACTIVE_STATUSES.includes(build.status)) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [build, load]);

  const selected = useMemo(
    () => build?.snapshots.find((s) => s.id === selectedId) ?? null,
    [build, selectedId],
  );

  useEffect(() => {
    if (!selectedId) return;
    void api<Comment[]>(`/snapshots/${selectedId}/comments`).then(setComments).catch(() => undefined);
  }, [selectedId]);

  if (!build) return <p className="muted">Loading…</p>;

  const visible =
    filter === "ALL" ? build.snapshots : build.snapshots.filter((s) => s.status === filter);
  const reviewable = build.status === "PENDING_REVIEW";

  const visibleIndex = selected ? visible.findIndex((s) => s.id === selected.id) : -1;
  const prevSnapshot = visibleIndex > 0 ? visible[visibleIndex - 1] : null;
  const nextSnapshot = visibleIndex >= 0 ? (visible[visibleIndex + 1] ?? null) : null;

  function select(snapshotId: string) {
    setSelectedId(snapshotId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function act(path: string) {
    await api(path, { method: "POST", body: JSON.stringify({}) });
    await load();
  }

  async function review(action: "approve" | "reject") {
    if (!selected) return;
    // Capture the next snapshot before reloading: the acted-on one may drop
    // out of the current filter and shift indices.
    const next = nextSnapshot;
    await act(`/snapshots/${selected.id}/${action}`);
    if (next) select(next.id);
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !commentText.trim()) return;
    await api(`/snapshots/${selectedId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body: commentText }),
    });
    setCommentText("");
    setComments(await api<Comment[]>(`/snapshots/${selectedId}/comments`));
  }

  return (
    <>
      <p>
        <Link href={`/projects/${build.project.id}`}>← {build.project.name}</Link>
      </p>
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <h2 className="row">
          Build #{build.number} <span className={`badge ${build.status}`}>{build.status}</span>
        </h2>
        {reviewable && (
          <button onClick={() => act(`/builds/${build.id}/approve-all`)}>Approve all changes</button>
        )}
      </div>
      <p className="muted">
        {build.branch} · {build.commitSha.slice(0, 8)} · {build.counts.changed} changed ·{" "}
        {build.counts.new} new · {build.counts.total} snapshots
      </p>
      {build.error && <div className="card" style={{ color: "var(--red)" }}>{build.error}</div>}

      <div className="tabs">
        {FILTERS.map((f) => (
          <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
            {f.toLowerCase()}
          </button>
        ))}
      </div>

      {selected && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
            <h3>
              {selected.storyTitle} <span className="muted">@ {selected.viewport}</span>{" "}
              <span className={`badge ${selected.status}`}>{selected.status}</span>
              {selected.diffPixelRatio != null && (
                <span className="muted"> diff {(selected.diffPixelRatio * 100).toFixed(2)}%</span>
              )}
            </h3>
            <div className="row">
              <button onClick={() => prevSnapshot && select(prevSnapshot.id)} disabled={!prevSnapshot}>
                ‹ Prev
              </button>
              <span className="muted">
                {visibleIndex + 1} / {visible.length}
              </span>
              <button onClick={() => nextSnapshot && select(nextSnapshot.id)} disabled={!nextSnapshot}>
                Next ›
              </button>
              {["NEW", "CHANGED", "APPROVED", "REJECTED"].includes(selected.status) &&
                !["PASSED", "ERROR", "QUEUED", "RENDERING", "COMPARING"].includes(build.status) && (
                  <>
                    <button onClick={() => review("approve")}>Approve</button>
                    <button className="danger" onClick={() => review("reject")}>
                      Reject
                    </button>
                  </>
                )}
            </div>
          </div>

          <div className="compare-panes" style={{ marginTop: 12 }}>
            <div>
              <p className="muted">Baseline</p>
              {selected.baselineUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.baselineUrl} alt="baseline" />
              ) : (
                <p className="muted">— none (new story) —</p>
              )}
            </div>
            <div>
              <p className="muted">Current</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selected.imageUrl} alt="current" />
            </div>
            <div>
              <p className="muted">Diff</p>
              {selected.diffUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.diffUrl} alt="diff" />
              ) : (
                <p className="muted">— no diff image —</p>
              )}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <h4>Comments</h4>
            {comments.map((c) => (
              <div key={c.id} className="comment">
                <strong>{c.authorName}</strong>{" "}
                <span className="muted">{new Date(c.createdAt).toLocaleString()}</span>
                <div>{c.body}</div>
              </div>
            ))}
            {comments.length === 0 && <p className="muted">No comments yet.</p>}
            <form onSubmit={addComment} className="row" style={{ marginTop: 8 }}>
              <input
                placeholder="Leave a comment…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button type="submit">Post</button>
            </form>
          </div>
        </div>
      )}

      <div className="shots">
        {visible.map((s) => (
          <div
            key={s.id}
            className={`card shot ${selectedId === s.id ? "selected" : ""}`}
            onClick={() => select(s.id)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.imageUrl} alt={s.storyTitle} loading="lazy" />
            <div className="row" style={{ justifyContent: "space-between", marginTop: 8 }}>
              <span style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis" }}>
                {s.storyTitle}
              </span>
              <span className={`badge ${s.status}`}>{s.status}</span>
            </div>
            <div className="muted">{s.viewport}</div>
          </div>
        ))}
        {visible.length === 0 && <p className="muted">No snapshots for this filter.</p>}
      </div>
    </>
  );
}
