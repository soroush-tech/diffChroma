"use client";

import { styled } from "@soroush.tech/design-system";
import type { PaletteColor } from "@soroush.tech/design-system";
import { alpha } from "@soroush.tech/design-system/utils";

const PillRoot = styled("span", {
  shouldForwardProp: (prop) => prop !== "tone" && prop !== "filled",
})<{ tone: PaletteColor; filled: boolean }>(({ theme, tone, filled }) => ({
  display: "inline-block",
  padding: "4px 12px",
  fontSize: "12px",
  lineHeight: "12px",
  fontWeight: theme.fontWeights.bold,
  whiteSpace: "nowrap",
  textTransform: "capitalize",
  borderRadius: "3em",
  ...(filled
    ? {
        color: theme.palette[tone].contrastText,
        backgroundColor: theme.palette[tone].main,
      }
    : {
        color: theme.palette[tone].main,
        backgroundColor: alpha(theme.palette[tone].main, 0.1),
        boxShadow: `inset 0 0 0 1px ${alpha(theme.palette[tone].main, 0.25)}`,
      }),
}));

/** Small rounded chip: counts, branch names, severities. */
export function Pill({
  children,
  tone = "default",
  filled = false,
}: {
  children: React.ReactNode;
  tone?: PaletteColor;
  filled?: boolean;
}) {
  return (
    <PillRoot tone={tone} filled={filled}>
      {children}
    </PillRoot>
  );
}
