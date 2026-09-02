"use client";

import { styled } from "@soroush.tech/design-system";

/** Content card matching the reference layout: white surface, 5px radius,
 *  hairline shadow, 20→30px padding. `flush` drops the padding for cards whose
 *  children manage their own (tables, setting groups). */
export const PageCard = styled("section", {
  shouldForwardProp: (prop) => prop !== "flush",
})<{ flush?: boolean }>(({ theme, flush }) => ({
  backgroundColor: theme.background.paper,
  borderRadius: "5px",
  boxShadow: "rgba(0, 0, 0, 0.05) 0 1px 3px 0",
  padding: flush ? 0 : "20px",
  "@media (min-width: 800px)": { padding: flush ? 0 : "30px" },
}));
