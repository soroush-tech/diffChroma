"use client";

import NextLink from "next/link";
import { styled } from "@soroush.tech/design-system";
import type { PaletteColor } from "@soroush.tech/design-system";
import { alpha } from "@soroush.tech/design-system/utils";
import { relTime } from "@/lib/time";

export interface BuildRow {
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

/** Build/branch health dot tone by build status. */
export function statusTone(status: string): PaletteColor {
  switch (status) {
    case "PASSED":
    case "APPROVED":
      return "success";
    case "PENDING_REVIEW":
      return "warning";
    case "REJECTED":
    case "ERROR":
      return "error";
    default:
      return "default"; // QUEUED / RENDERING / COMPARING
  }
}

export const StatusDot = styled("span", {
  shouldForwardProp: (prop) => prop !== "tone" && prop !== "size",
})<{ tone: PaletteColor; size?: number }>(({ theme, tone, size = 24 }) => ({
  display: "inline-block",
  width: `${size}px`,
  height: `${size}px`,
  borderRadius: "50%",
  flexShrink: 0,
  backgroundColor: theme.palette[tone].main,
}));

const Row = styled(NextLink)(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: "20px",
  padding: "20px",
  textDecoration: "none",
  color: theme.text.initial,
  borderBottom: `${theme.borderWidths.thin} solid ${theme.border.default}`,
  "&:last-of-type": { borderBottom: "none" },
  "&:hover": { backgroundColor: alpha(theme.palette.primary.main, 0.04) },
  "@media (min-width: 800px)": { padding: "24px 30px" },
}));

const Body = styled("div")({ flex: "1 1 auto", minWidth: 0 });

const Title = styled("div")(({ theme }) => ({
  fontSize: "16px",
  lineHeight: "22px",
  fontWeight: theme.fontWeights.bold,
}));

const Subline = styled("div")(({ theme }) => ({
  fontSize: "14px",
  lineHeight: "20px",
  color: theme.text.secondary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  "& b": { fontWeight: theme.fontWeights.semiBold, color: theme.text.initial },
}));

const Stats = styled("div")({
  display: "none",
  "@media (min-width: 600px)": {
    display: "flex",
    flexDirection: "row",
    gap: "40px",
    flexShrink: 0,
  },
});

const StatCol = styled("div")(({ theme }) => ({
  textAlign: "right",
  minWidth: "72px",
  "& .num": {
    fontSize: "16px",
    lineHeight: "22px",
    fontWeight: theme.fontWeights.bold,
    color: theme.text.initial,
  },
  "& .lbl": { fontSize: "12px", lineHeight: "16px", color: theme.text.secondary },
}));

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <StatCol>
      <div className="num">{value}</div>
      <div className="lbl">{label}</div>
    </StatCol>
  );
}

export function BuildListRow({ projectId, build }: { projectId: string; build: BuildRow }) {
  const changes = build.changedCount + build.newCount;
  return (
    <Row href={`/projects/${projectId}/builds/${build.id}`}>
      <StatusDot tone={statusTone(build.status)} aria-label={build.status} role="img" />
      <Body>
        <Title>Build {build.number}</Title>
        <Subline>
          Updated {relTime(build.createdAt)} • {build.commitSha.slice(0, 7)} on{" "}
          <b>{build.branch}</b>
        </Subline>
      </Body>
      <Stats>
        <Stat value={build.storyCount} label={build.storyCount === 1 ? "Story" : "Stories"} />
        <Stat value={changes} label={changes === 1 ? "Change" : "Changes"} />
      </Stats>
    </Row>
  );
}
