"use client";

import NextLink from "next/link";
import { styled } from "@soroush.tech/design-system";
import type { PaletteColor } from "@soroush.tech/design-system";

/** Client-side navigation link in design-system colors. */
export const NavLink = styled(NextLink)(({ theme }) => ({
  color: theme.text.primary,
  textDecoration: "none",
  "&:hover": { textDecoration: "underline" },
}));

/** Inline code surface for tokens / SHAs. */
export const TokenCode = styled("code")(({ theme }) => ({
  fontFamily: theme.fonts.mono,
  fontSize: theme.fontSizes[0],
  color: theme.text.primary,
  backgroundColor: theme.background.terminal,
  border: `${theme.borderWidths.thin} solid ${theme.border.default}`,
  borderRadius: theme.radii.sm,
  padding: "4px 8px",
  wordBreak: "break-all",
}));

const STATUS_TONE: Record<string, PaletteColor> = {
  PASSED: "success",
  APPROVED: "success",
  UNCHANGED: "success",
  REJECTED: "error",
  ERROR: "error",
  PENDING_REVIEW: "warning",
  CHANGED: "warning",
  NEW: "warning",
  QUEUED: "info",
  RENDERING: "info",
  COMPARING: "info",
  PENDING: "info",
};

const BadgeRoot = styled("span", {
  shouldForwardProp: (prop) => prop !== "tone",
})<{ tone: PaletteColor }>(({ theme, tone }) => ({
  display: "inline-block",
  padding: "2px 10px",
  fontFamily: theme.fonts.mono,
  fontSize: theme.fontSizes[0],
  fontWeight: theme.fontWeights.semiBold,
  letterSpacing: theme.letterSpacings.wide,
  whiteSpace: "nowrap",
  color: theme.palette[tone].main,
  border: `${theme.borderWidths.thin} solid ${theme.palette[tone].main}`,
  borderRadius: theme.radii.sm,
}));

/** Build / snapshot status chip, colored by outcome. */
export function StatusBadge({ status }: { status: string }) {
  return <BadgeRoot tone={STATUS_TONE[status] ?? "default"}>{status.replaceAll("_", " ")}</BadgeRoot>;
}
