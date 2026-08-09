"use client";

import { styled } from "@soroush.tech/design-system";
import { Pressable } from "@soroush.tech/design-system/Pressable";

const Bar = styled("nav")(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  width: "100%",
  boxShadow: `inset 0 -1px 0 ${theme.border.default}`,
}));

const Tab = styled(Pressable, {
  shouldForwardProp: (prop) => prop !== "isActive",
})<{ isActive: boolean }>(({ theme, isActive }) => ({
  padding: "10px 20px",
  fontSize: theme.fontSizes[1],
  fontWeight: theme.fontWeights.bold,
  lineHeight: "20px",
  color: isActive ? theme.palette.primary.main : theme.text.secondary,
  boxShadow: isActive ? `inset 0 -3px 0 0 ${theme.palette.primary.main}` : "none",
  "&:hover": { color: theme.palette.primary.main },
}));

export interface TabDef {
  key: string;
  label: string;
}

/** Underline tab strip (the design system has no Tabs component). */
export function TabNav({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
  label?: string;
}) {
  return (
    <Bar aria-label={label}>
      {tabs.map((tab) => (
        <Tab
          key={tab.key}
          isActive={tab.key === active}
          aria-current={tab.key === active ? "page" : undefined}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </Tab>
      ))}
    </Bar>
  );
}
