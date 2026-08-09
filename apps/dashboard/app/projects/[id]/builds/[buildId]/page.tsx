"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@soroush.tech/design-system/Button";
import { ButtonGroup } from "@soroush.tech/design-system/ButtonGroup";
import { Card } from "@soroush.tech/design-system/Card";
import { Flex } from "@soroush.tech/design-system/Flex";
import { Grid } from "@soroush.tech/design-system/Grid";
import { Image } from "@soroush.tech/design-system/Image";
import { LinearProgress } from "@soroush.tech/design-system/LinearProgress";
import { TextInput } from "@soroush.tech/design-system/TextInput";
import { Typography } from "@soroush.tech/design-system/Typography";
import { View } from "@soroush.tech/design-system/View";
import { NavLink, StatusBadge } from "@/components/ui";
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

function Pane({ label, url, alt }: { label: string; url: string | null; alt: string }) {
  return (
    <View minWidth={0}>
      <Typography variant="caption" color="secondary">
        {label}
      </Typography>
      {url ? (
        <Image src={url} alt={alt} width="100%" borderRadius="sm" style={{ background: "#fff" }} />
      ) : (
        <Typography variant="body2" color="secondary">
          — none —
        </Typography>
      )}
    </View>
  );
}

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

  if (!build) return <LinearProgress />;

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
    <Flex gap={2}>
      <Typography variant="body2">
        <NavLink href={`/projects/${build.project.id}`}>← {build.project.name}</NavLink>
      </Typography>

      <Flex flexDirection="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Flex flexDirection="row" alignItems="center" gap={1.5}>
          <Typography variant="h3">Build #{build.number}</Typography>
          <StatusBadge status={build.status} />
        </Flex>
        {reviewable && (
          <Button onClick={() => act(`/builds/${build.id}/approve-all`)}>
            Approve all changes
          </Button>
        )}
      </Flex>
      <Typography variant="body2" color="secondary">
        {build.branch} · {build.commitSha.slice(0, 8)} · {build.counts.changed} changed ·{" "}
        {build.counts.new} new · {build.counts.total} snapshots
      </Typography>
      {build.error && (
        <Card>
          <Typography variant="body2" color="error" fontFamily="mono">
            {build.error}
          </Typography>
        </Card>
      )}

      <ButtonGroup size="sm" aria-label="Snapshot filter">
        {FILTERS.map((f) => (
          <Button key={f} variant={filter === f ? "contained" : "outlined"} onClick={() => setFilter(f)}>
            {f.toLowerCase().replace("_", " ")}
          </Button>
        ))}
      </ButtonGroup>

      {selected && (
        <Card variant="bracketBox">
          <Flex flexDirection="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Flex flexDirection="row" alignItems="center" flexWrap="wrap" gap={1}>
              <Typography variant="h5">{selected.storyTitle}</Typography>
              <Typography variant="body2" color="secondary">
                @ {selected.viewport}
              </Typography>
              <StatusBadge status={selected.status} />
              {selected.diffPixelRatio != null && (
                <Typography variant="body2" color="secondary">
                  diff {(selected.diffPixelRatio * 100).toFixed(2)}%
                </Typography>
              )}
            </Flex>
            <Flex flexDirection="row" alignItems="center" gap={1}>
              <ButtonGroup size="sm" aria-label="Snapshot navigation">
                <Button disabled={!prevSnapshot} onClick={() => prevSnapshot && select(prevSnapshot.id)}>
                  ‹ Prev
                </Button>
                <Button disabled={!nextSnapshot} onClick={() => nextSnapshot && select(nextSnapshot.id)}>
                  Next ›
                </Button>
              </ButtonGroup>
              <Typography variant="caption" color="secondary" fontFamily="mono">
                {visibleIndex + 1} / {visible.length}
              </Typography>
              {["NEW", "CHANGED", "APPROVED", "REJECTED"].includes(selected.status) &&
                !["PASSED", "ERROR", "QUEUED", "RENDERING", "COMPARING"].includes(build.status) && (
                  <>
                    <Button size="sm" color="success" onClick={() => review("approve")}>
                      Approve
                    </Button>
                    <Button size="sm" color="error" variant="outlined" onClick={() => review("reject")}>
                      Reject
                    </Button>
                  </>
                )}
            </Flex>
          </Flex>

          <Grid gridTemplateColumns="repeat(auto-fit, minmax(280px, 1fr))" gap={1.5} mt={2}>
            <Pane label="Baseline" url={selected.baselineUrl} alt="baseline" />
            <Pane label="Current" url={selected.imageUrl} alt="current" />
            <Pane label="Diff" url={selected.diffUrl} alt="diff" />
          </Grid>

          <Flex gap={1} mt={2}>
            <Typography variant="h6">Comments</Typography>
            {comments.map((c) => (
              <View key={c.id} borderTop="1px solid" borderColor="default" py={1}>
                <Typography variant="body2">
                  <strong>{c.authorName}</strong>{" "}
                  <Typography as="span" variant="caption" color="secondary">
                    {new Date(c.createdAt).toLocaleString()}
                  </Typography>
                </Typography>
                <Typography variant="body2">{c.body}</Typography>
              </View>
            ))}
            {comments.length === 0 && (
              <Typography variant="body2" color="secondary">
                No comments yet.
              </Typography>
            )}
            <Flex as="form" onSubmit={addComment} flexDirection="row" gap={1}>
              <TextInput
                placeholder="Leave a comment…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                fullWidth
              />
              <Button type="submit" variant="outlined">
                Post
              </Button>
            </Flex>
          </Flex>
        </Card>
      )}

      <Grid gridTemplateColumns="repeat(auto-fill, minmax(220px, 1fr))" gap={1.5}>
        {visible.map((s) => (
          <Card
            key={s.id}
            variant="interactive"
            cursor="pointer"
            onClick={() => select(s.id)}
            borderColor={selectedId === s.id ? "primary" : undefined}
          >
            <Image
              src={s.imageUrl}
              alt={s.storyTitle}
              loading="lazy"
              width="100%"
              height="140px"
              objectFit="cover"
              objectPosition="top"
              borderRadius="sm"
              style={{ background: "#fff" }}
            />
            <Flex flexDirection="row" alignItems="center" justifyContent="space-between" gap={1} mt={1}>
              <Typography variant="caption" noWrap>
                {s.storyTitle}
              </Typography>
              <StatusBadge status={s.status} />
            </Flex>
            <Typography variant="caption" color="secondary" fontFamily="mono">
              {s.viewport}
            </Typography>
          </Card>
        ))}
        {visible.length === 0 && (
          <Typography variant="body2" color="secondary">
            No snapshots for this filter.
          </Typography>
        )}
      </Grid>
    </Flex>
  );
}
