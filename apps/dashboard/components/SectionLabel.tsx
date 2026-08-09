"use client";

import { styled } from "@soroush.tech/design-system";

/** Uppercase group label ("REVIEW", "THEME", …) above a card group. */
export const SectionLabel = styled("h3")(({ theme }) => ({
  margin: 0,
  fontSize: theme.fontSizes[0],
  fontWeight: theme.fontWeights.bold,
  letterSpacing: "0.35em",
  textTransform: "uppercase",
  color: theme.text.secondary,
}));
