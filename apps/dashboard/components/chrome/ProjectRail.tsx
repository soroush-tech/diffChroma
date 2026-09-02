"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { styled } from "@soroush.tech/design-system";
import { Icon, type IconName } from "@soroush.tech/design-system/Icon";
import { TOPBAR_HEIGHT } from "./constants";

const ITEMS: { segment: string; label: string; icon: IconName }[] = [
  { segment: "builds", label: "Builds", icon: "stacks" },
  { segment: "library", label: "Library", icon: "grid_view" },
  { segment: "a11y", label: "A11y", icon: "checklist" },
  { segment: "manage", label: "Manage", icon: "settings_input_component" },
];

const Rail = styled("nav")(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-evenly",
  borderBottom: `${theme.borderWidths.thin} solid ${theme.border.default}`,
  "@media (min-width: 600px)": {
    flex: "0 1 60px",
    minWidth: "60px",
    flexDirection: "column",
    justifyContent: "flex-start",
    borderBottom: "none",
    borderRight: `${theme.borderWidths.thin} solid ${theme.border.default}`,
    position: "sticky",
    top: TOPBAR_HEIGHT,
    height: `calc(100vh - ${TOPBAR_HEIGHT})`,
    alignSelf: "flex-start",
    paddingTop: "2rem",
  },
}));

const Item = styled(NextLink, {
  shouldForwardProp: (prop) => prop !== "isActive",
})<{ isActive: boolean }>(({ theme, isActive }) => ({
  display: "block",
  textAlign: "center",
  textDecoration: "none",
  color: isActive ? theme.palette.primary.main : theme.text.secondary,
  margin: "0.5rem 0",
  transition: "transform 150ms, color 150ms",
  "& .rail-icon": { display: "none" },
  "& .rail-label": {
    display: "block",
    fontSize: "14px",
    lineHeight: "20px",
    fontWeight: isActive ? theme.fontWeights.bold : theme.fontWeights.normal,
  },
  "&:hover": { color: theme.palette.primary.main, transform: "translateY(-1px)" },
  "@media (min-width: 600px)": {
    margin: "0 0 2.25rem",
    "& .rail-icon": { display: "inline-block" },
    "& .rail-label": { fontSize: "11px", lineHeight: "16px", marginTop: "0.5rem" },
  },
}));

export function ProjectRail({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  // /projects/[id]/<segment>; build detail keeps Builds lit.
  const active = pathname.split("/")[3] ?? "builds";

  return (
    <Rail aria-label="Project navigation">
      {ITEMS.map((item) => (
        <Item
          key={item.segment}
          href={`/projects/${projectId}/${item.segment}`}
          isActive={active === item.segment}
          aria-current={active === item.segment ? "page" : undefined}
        >
          <Icon className="rail-icon" name={item.icon} size="20px" color="inherit" />
          <span className="rail-label">{item.label}</span>
        </Item>
      ))}
    </Rail>
  );
}
