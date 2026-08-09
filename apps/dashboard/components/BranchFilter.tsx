"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { styled } from "@soroush.tech/design-system";
import type { PaletteColor } from "@soroush.tech/design-system";
import { alpha } from "@soroush.tech/design-system/utils";
import { Icon } from "@soroush.tech/design-system/Icon";
import { SearchInput } from "./SearchInput";
import { StatusDot } from "./BuildList";

const Wrap = styled("div")({ position: "relative" });

const Trigger = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "7px 10px",
  border: "none",
  borderRadius: "5px",
  background: "transparent",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: "14px",
  lineHeight: "14px",
  color: theme.text.secondary,
  "&:hover": {
    color: theme.palette.primary.main,
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
  },
}));

const Panel = styled("div")(({ theme }) => ({
  position: "absolute",
  right: 0,
  top: "calc(100% + 6px)",
  width: "300px",
  maxHeight: "420px",
  overflowY: "auto",
  backgroundColor: theme.background.paper,
  borderRadius: "5px",
  boxShadow: "0 0 15px rgba(0,0,0,.05), 0 1px 2px rgba(0,0,0,.1)",
  border: `${theme.borderWidths.thin} solid ${theme.border.default}`,
  padding: "15px",
  zIndex: 10,
}));

const PanelLabel = styled("div")(({ theme }) => ({
  fontSize: "12px",
  fontWeight: theme.fontWeights.extraBold,
  letterSpacing: "0.35em",
  textTransform: "uppercase",
  color: theme.text.secondary,
  marginBottom: "10px",
}));

const Option = styled("button", {
  shouldForwardProp: (prop) => prop !== "isActive",
})<{ isActive: boolean }>(({ theme, isActive }) => ({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  width: "100%",
  padding: "10px",
  border: "none",
  borderRadius: "4px",
  background: "transparent",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: "14px",
  lineHeight: "20px",
  textAlign: "left",
  fontWeight: isActive ? theme.fontWeights.bold : theme.fontWeights.semiBold,
  color: theme.text.initial,
  "&:hover": { backgroundColor: alpha(theme.palette.primary.main, 0.08) },
  "& span": { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
}));

export interface BranchOption {
  name: string;
  tone: PaletteColor;
}

/** "All branches ⌄" trigger + dropdown: search, All-branches, then branches
 *  with their latest-build health dot. */
export function BranchFilter({
  branches,
  selected,
  onChange,
}: {
  branches: BranchOption[];
  selected: string | null;
  onChange: (branch: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return needle ? branches.filter((b) => b.name.toLowerCase().includes(needle)) : branches;
  }, [branches, search]);

  function pick(branch: string | null) {
    onChange(branch);
    setOpen(false);
    setSearch("");
  }

  return (
    <Wrap ref={wrapRef}>
      <Trigger
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="account_tree" size="14px" color="inherit" />
        {selected ?? "All branches"}
        <Icon name={open ? "expand_less" : "expand_more"} size="14px" color="inherit" />
      </Trigger>
      {open && (
        <Panel role="dialog" aria-label="Branches">
          <PanelLabel>Branches</PanelLabel>
          <div style={{ marginBottom: "10px" }}>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Find a branch"
              label="Find a branch"
            />
          </div>
          <Option isActive={selected === null} onClick={() => pick(null)}>
            <span>All branches</span>
          </Option>
          {visible.map((branch) => (
            <Option
              key={branch.name}
              isActive={selected === branch.name}
              onClick={() => pick(branch.name)}
            >
              <StatusDot tone={branch.tone} size={8} />
              <span>{branch.name}</span>
            </Option>
          ))}
          {visible.length === 0 && (
            <Option isActive={false} disabled>
              <span>No branches match</span>
            </Option>
          )}
        </Panel>
      )}
    </Wrap>
  );
}
