"use client";

import { styled } from "@soroush.tech/design-system";
import type { PaletteColor } from "@soroush.tech/design-system";

const PillRoot = styled("span", {
  shouldForwardProp: (prop) => prop !== "tone" && prop !== "filled",
})<{ tone: PaletteColor; filled: boolean }>(({ theme, tone, filled }) => ({
  display: "inline-block",
  padding: "2px 10px",
  fontFamily: theme.fonts.mono,
  fontSize: theme.fontSizes[0],
  fontWeight: theme.fontWeights.semiBold,
  letterSpacing: theme.letterSpacings.wide,
  whiteSpace: "nowrap",
  textTransform: "capitalize",
  borderRadius: "3em",
  ...(filled
    ? {
        color: theme.palette[tone].contrastText,
        backgroundColor: theme.palette[tone].main,
        border: `${theme.borderWidths.thin} solid ${theme.palette[tone].main}`,
      }
    : {
        color: theme.palette[tone].main,
        border: `${theme.borderWidths.thin} solid ${theme.palette[tone].main}`,
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
