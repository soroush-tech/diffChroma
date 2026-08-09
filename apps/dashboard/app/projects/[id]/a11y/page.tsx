"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@soroush.tech/design-system/Button";
import { Card } from "@soroush.tech/design-system/Card";
import { Flex } from "@soroush.tech/design-system/Flex";
import { NativeSelect } from "@soroush.tech/design-system/NativeSelect";
import { Skeleton } from "@soroush.tech/design-system/Skeleton";
import { Typography } from "@soroush.tech/design-system/Typography";
import { A11ySummary } from "@/components/a11y/A11ySummary";
import { ViolationsChart } from "@/components/a11y/ViolationsChart";
import { ViolationsTable } from "@/components/a11y/ViolationsTable";
import { NavLink } from "@/components/ui";
import { api } from "@/lib/api";
import type {
  A11ySummaryResponse,
  A11yTimeseriesResponse,
  A11yViolationsResponse,
} from "@/lib/a11y";

const RANGES = [
  { label: "Last week", value: "7" },
  { label: "Last 2 weeks", value: "14" },
  { label: "Last month", value: "30" },
];

export default function A11yPage() {
  const { id } = useParams<{ id: string }>();
  const [branch, setBranch] = useState<string | null>(null);
  const [days, setDays] = useState<"7" | "14" | "30">("7");
  const [groupBy, setGroupBy] = useState<"test" | "rule">("test");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [summary, setSummary] = useState<A11ySummaryResponse | null>(null);
  const [series, setSeries] = useState<A11yTimeseriesResponse | null>(null);
  const [violations, setViolations] = useState<A11yViolationsResponse | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const branchQs = branch ? `&branch=${encodeURIComponent(branch)}` : "";

  useEffect(() => {
    setSummary(null);
    void api<A11ySummaryResponse>(`/projects/${id}/a11y/summary?${branchQs.slice(1)}`)
      .then(setSummary)
      .catch(() => undefined);
  }, [id, branchQs]);

  useEffect(() => {
    setSeries(null);
    void api<A11yTimeseriesResponse>(`/projects/${id}/a11y/timeseries?days=${days}${branchQs}`)
      .then(setSeries)
      .catch(() => undefined);
  }, [id, days, branchQs]);

  useEffect(() => {
    void api<A11yViolationsResponse>(
      `/projects/${id}/a11y/violations?groupBy=${groupBy}&search=${encodeURIComponent(debouncedSearch)}${branchQs}`,
    )
      .then(setViolations)
      .catch(() => undefined);
  }, [id, groupBy, debouncedSearch, branchQs]);

  const disabled = summary !== null && !summary.enabled;

  return (
    <Flex gap={2}>
      <Flex flexDirection="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Typography variant="h3">Accessibility</Typography>
        <Flex flexDirection="row" alignItems="center" gap={1}>
          {summary && summary.branches.length > 0 && (
            <NativeSelect
              aria-label="Branch"
              size="sm"
              options={summary.branches.map((b) => ({ label: b, value: b }))}
              value={summary.branch}
              onChange={(value) => setBranch(String(value))}
            />
          )}
          {summary?.build && (
            <Typography variant="body2">
              <NavLink href={`/projects/${id}/builds/${summary.build.id}`}>
                Latest audited build #{summary.build.number} →
              </NavLink>
            </Typography>
          )}
        </Flex>
      </Flex>

      {disabled && (
        <Card variant="bracketBox" title="Accessibility tests are disabled" maxWidth="560px">
          <Typography variant="body2" color="secondary" mt={1} mb={2}>
            Enable accessibility tests to run an axe audit on every build and track violations
            over time.
          </Typography>
          <Button size="sm" href={`/projects/${id}/manage?tab=configure`}>
            Open Manage
          </Button>
        </Card>
      )}

      {!disabled && (
        <>
          <Card>
            {summary ? (
              summary.build ? (
                <A11ySummary totals={summary.totals} />
              ) : (
                <Typography variant="body2" color="secondary">
                  No audited builds on {summary.branch} yet — push a build (or run `pnpm
                  simulate`) to populate this page.
                </Typography>
              )
            ) : (
              <Skeleton variant="rectangular" height="64px" />
            )}
          </Card>

          <Card title="Accessibility violations">
            <Flex flexDirection="row" justifyContent="flex-end" mb={1}>
              <NativeSelect
                aria-label="Date range"
                size="sm"
                options={RANGES}
                value={days}
                onChange={(value) => {
                  const v = String(value);
                  if (v === "7" || v === "14" || v === "30") setDays(v);
                }}
              />
            </Flex>
            {series ? (
              <ViolationsChart points={series.points} />
            ) : (
              <Skeleton variant="rectangular" height="240px" />
            )}
          </Card>

          <Card>
            {violations ? (
              <ViolationsTable
                key={`${groupBy}:${violations.branch}`}
                rows={violations.rows}
                total={violations.total}
                groupBy={groupBy}
                onGroupByChange={setGroupBy}
                search={search}
                onSearchChange={setSearch}
                branch={violations.branch}
              />
            ) : (
              <Skeleton variant="rectangular" height="200px" />
            )}
          </Card>
        </>
      )}
    </Flex>
  );
}
