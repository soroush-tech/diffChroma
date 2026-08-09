"use client";

import { styled } from "@soroush.tech/design-system";

/** Uppercase group label ("REVIEW", "THEME", …) above a card group. */
export const SectionLabel = styled("h3")(({ theme }) => ({
  margin: 0,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: theme.fontWeights.extraBold,
  letterSpacing: "0.35em",
  textTransform: "uppercase",
  color: theme.text.secondary,
}));
