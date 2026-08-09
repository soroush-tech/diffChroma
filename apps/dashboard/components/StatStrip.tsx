"use client";

import { styled } from "@soroush.tech/design-system";

const Strip = styled("div")({
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  "@media (min-width: 800px)": {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "25px",
  },
});

const Group = styled("div")({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: "15px",
});

const Item = styled("div")({ padding: "8px 12px" });

const Value = styled("div")(({ theme }) => ({
  fontSize: "28px",
  lineHeight: "28px",
  fontWeight: theme.fontWeights.normal,
  color: theme.text.initial,
  marginBottom: "4px",
}));

const Label = styled("div")(({ theme }) => ({
  fontSize: "14px",
  lineHeight: "20px",
  color: theme.text.secondary,
}));

export const StatDivider = styled("div")(({ theme }) => ({
  alignSelf: "stretch",
  width: "1px",
  backgroundColor: theme.border.default,
}));

export interface StatItem {
  label: string;
  value: React.ReactNode;
}

export function Stat({ label, value }: StatItem) {
  return (
    <Item>
      <Value>{value}</Value>
      <Label>{label}</Label>
    </Item>
  );
}

/** Reference-style stat strip: 28px figures, labeled, groups split by a
 *  stretched divider. */
export function StatStrip({ primary, items }: { primary: StatItem; items: StatItem[] }) {
  return (
    <Strip>
      <Group>
        <Stat {...primary} />
      </Group>
      {items.length > 0 && <StatDivider />}
      <Group>
        {items.map((item) => (
          <Stat key={item.label} {...item} />
        ))}
      </Group>
    </Strip>
  );
}
