"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { styled } from "@soroush.tech/design-system";
import { Button } from "@soroush.tech/design-system/Button";
import { Flex } from "@soroush.tech/design-system/Flex";
import { NativeSelect } from "@soroush.tech/design-system/NativeSelect";
import { Skeleton } from "@soroush.tech/design-system/Skeleton";
import { Typography } from "@soroush.tech/design-system/Typography";
import { A11ySummary } from "@/components/a11y/A11ySummary";
import { ViolationsChart } from "@/components/a11y/ViolationsChart";
import { ViolationsTable } from "@/components/a11y/ViolationsTable";
import { PageCard } from "@/components/PageCard";
import { PageHeader } from "@/components/PageHeader";
import { NavLink } from "@/components/ui";
import { api } from "@/lib/api";
import type {
  A11ySummaryResponse,
  A11yTimeseriesResponse,
  A11yViolationsResponse,
} from "@/lib/a11y";

const RANGES = [
  { label: "1 week", value: "7" },
  { label: "2 weeks", value: "14" },
  { label: "1 month", value: "30" },
];

const Stack = styled("div")({
  display: "flex",
  flexDirection: "column",
  gap: "24px",
});

const ChartHead = styled("div")(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  marginBottom: "23px",
  "& > h2": {
    margin: 0,
    fontSize: "14px",
    fontWeight: theme.fontWeights.semiBold,
    color: theme.text.initial,
  },
}));

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
    <>
      <PageHeader
        title="Accessibility"
        actions={
          <>
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
          </>
        }
      />

      {disabled && (
        <PageCard style={{ maxWidth: "560px" }}>
          <Typography variant="h5" as="h2" m={0} mb={1}>
            Accessibility tests are disabled
          </Typography>
          <Typography variant="body2" color="secondary" mb={2}>
            Enable accessibility tests to run an axe audit on every build and track violations
            over time.
          </Typography>
          <Button size="sm" href={`/projects/${id}/manage?tab=configure`}>
            Open Manage
          </Button>
        </PageCard>
      )}

      {!disabled && (
        <Stack>
          <PageCard>
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
          </PageCard>

          <PageCard>
            <ChartHead>
              <h2>Accessibility violations</h2>
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
            </ChartHead>
            {series ? (
              <ViolationsChart points={series.points} />
            ) : (
              <Skeleton variant="rectangular" height="240px" />
            )}
          </PageCard>

          <PageCard flush>
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
              <Flex p={3}>
                <Skeleton variant="rectangular" height="200px" />
              </Flex>
            )}
          </PageCard>
        </Stack>
      )}
    </>
  );
}
