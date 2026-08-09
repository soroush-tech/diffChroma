"use client";

import { styled } from "@soroush.tech/design-system";

const Root = styled("section")({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "10px",
  margin: "40px 0 24px",
});

const Title = styled("h1")(({ theme }) => ({
  margin: 0,
  fontSize: "32px",
  lineHeight: "40px",
  fontWeight: theme.fontWeights.bold,
  color: theme.text.initial,
}));

const Actions = styled("div")({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: "10px",
  whiteSpace: "nowrap",
});

/** Page title row: 32px heading left, inline actions right. */
export function PageHeader({
  title,
  actions,
}: {
  title: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <Root>
      <Title>{title}</Title>
      {actions && <Actions>{actions}</Actions>}
    </Root>
  );
}
