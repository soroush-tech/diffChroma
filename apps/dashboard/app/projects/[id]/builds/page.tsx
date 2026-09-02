"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Typography } from "@soroush.tech/design-system/Typography";
import { BranchFilter, type BranchOption } from "@/components/BranchFilter";
import { BuildListRow, statusTone, type BuildRow } from "@/components/BuildList";
import { PageCard } from "@/components/PageCard";
import { PageHeader } from "@/components/PageHeader";
import { BuildRowsSkeleton } from "@/components/Skeletons";
import { api } from "@/lib/api";

export default function BuildsPage() {
  const { id } = useParams<{ id: string }>();
  const [builds, setBuilds] = useState<BuildRow[] | null>(null);
  const [branch, setBranch] = useState<string | null>(null);

  useEffect(() => {
    void api<BuildRow[]>(`/projects/${id}/builds`).then(setBuilds).catch(() => undefined);
  }, [id]);

  // Branch list with each branch's latest-build health, newest first.
  const branches = useMemo<BranchOption[]>(() => {
    if (!builds) return [];
    const seen = new Map<string, BranchOption>();
    for (const build of builds) {
      if (!seen.has(build.branch)) {
        seen.set(build.branch, { name: build.branch, tone: statusTone(build.status) });
      }
    }
    return [...seen.values()];
  }, [builds]);

  const visible = useMemo(
    () => (builds ?? []).filter((b) => branch === null || b.branch === branch),
    [builds, branch],
  );

  if (!builds) {
    return (
      <>
        <PageHeader title="Builds" />
        <PageCard flush>
          <BuildRowsSkeleton />
        </PageCard>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Builds"
        actions={<BranchFilter branches={branches} selected={branch} onChange={setBranch} />}
      />

      <PageCard flush>
        {visible.map((build) => (
          <BuildListRow key={build.id} projectId={id} build={build} />
        ))}
        {visible.length === 0 && (
          <Typography variant="body2" color="secondary" p={3} as="div">
            {branch
              ? `No builds on ${branch} yet.`
              : "No builds yet — run the DiffChroma action or `pnpm simulate`."}
          </Typography>
        )}
      </PageCard>
    </>
  );
}
