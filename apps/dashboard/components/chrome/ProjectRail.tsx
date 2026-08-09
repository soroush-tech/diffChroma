"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar, SidebarItem } from "@soroush.tech/design-system/Sidebar";
import type { IconName } from "@soroush.tech/design-system/Icon";
import { TOPBAR_HEIGHT } from "./constants";

const ITEMS: { segment: string; label: string; icon: IconName }[] = [
  { segment: "builds", label: "Builds", icon: "stacks" },
  { segment: "library", label: "Library", icon: "grid_view" },
  { segment: "a11y", label: "A11y", icon: "checklist" },
  { segment: "manage", label: "Manage", icon: "settings_input_component" },
];

const RAIL_OPEN_KEY = "dc_rail_open";

export function ProjectRail({ projectId }: { projectId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  // Default collapsed; the persisted preference loads post-hydration so server
  // and client first paint agree.
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(window.localStorage.getItem(RAIL_OPEN_KEY) === "1");
  }, []);

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      window.localStorage.setItem(RAIL_OPEN_KEY, next ? "1" : "0");
      return next;
    });
  }

  // /projects/[id]/<segment>; build detail keeps Builds lit.
  const active = pathname.split("/")[3] ?? "builds";

  return (
    <Sidebar
      aria-label="Project navigation"
      isOpen={open}
      collapsedWidth="3.5rem"
      expandedWidth="11rem"
      position="sticky"
      top={TOPBAR_HEIGHT}
      height={`calc(100vh - ${TOPBAR_HEIGHT})`}
      alignSelf="flex-start"
      flexShrink={0}
      pt={2}
    >
      {ITEMS.map((item) => {
        const href = `/projects/${projectId}/${item.segment}`;
        return (
          <SidebarItem
            key={item.segment}
            icon={item.icon}
            label={item.label}
            isSelected={active === item.segment}
            href={href}
            onClick={(e: React.MouseEvent) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              e.preventDefault();
              router.push(href);
            }}
          />
        );
      })}
      <SidebarItem
        icon={open ? "chevron_left" : "chevron_right"}
        label={open ? "Collapse" : "Expand"}
        onClick={toggle}
        mt="auto"
      />
    </Sidebar>
  );
}
