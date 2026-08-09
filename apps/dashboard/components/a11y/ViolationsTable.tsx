"use client";

import { Fragment, useState } from "react";
import { styled } from "@soroush.tech/design-system";
import { alpha } from "@soroush.tech/design-system/utils";
import { Button } from "@soroush.tech/design-system/Button";
import { Icon } from "@soroush.tech/design-system/Icon";
import { ToggleButton, ToggleButtonGroup } from "@soroush.tech/design-system/ToggleButton";
import { SearchInput } from "@/components/SearchInput";
import { ImpactPill } from "./ImpactPill";
import { buildA11yCsv, downloadCsv, type A11yRow } from "@/lib/a11y";

const Toolbar = styled("div")({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "10px",
  padding: "20px 20px 10px",
  "@media (min-width: 800px)": { padding: "30px 30px 10px" },
});

const PushRight = styled("div")({ marginLeft: "auto" });

const TableRoot = styled("table")(({ theme }) => ({
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "14px",
  lineHeight: "20px",
  color: theme.text.initial,
  "& th": {
    textAlign: "left",
    fontWeight: theme.fontWeights.bold,
    padding: "10px 0.75em",
    borderBottom: `${theme.borderWidths.thin} solid ${theme.border.default}`,
  },
  "& td": { padding: "10px 0.75em" },
  "& th:first-of-type, & td:first-of-type": { paddingLeft: "20px" },
  "& th:last-of-type, & td:last-of-type": { paddingRight: "20px" },
  "@media (min-width: 800px)": {
    tableLayout: "fixed",
    "& th:last-of-type, & td:last-of-type": { paddingRight: "30px" },
  },
}));

const ParentRow = styled("tr")(({ theme }) => ({
  cursor: "pointer",
  "&:nth-of-type(odd)": { backgroundColor: theme.background.primary },
  "&:hover": { backgroundColor: alpha(theme.palette.primary.main, 0.07) },
}));

const ChildRow = styled("tr")(({ theme }) => ({
  backgroundColor: alpha(theme.palette.primary.main, 0.04),
}));

const ExpandButton = styled("button")(({ theme }) => ({
  float: "left",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "20px",
  height: "20px",
  padding: 0,
  marginLeft: "-12px",
  marginRight: "4px",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  color: theme.text.secondary,
  "&:hover": { color: theme.text.initial },
  "@media (min-width: 800px)": { marginLeft: "-24px" },
}));

const RowTitle = styled("span")(({ theme }) => ({
  fontWeight: theme.fontWeights.bold,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  display: "block",
}));

const Muted = styled("span")(({ theme }) => ({ color: theme.text.secondary }));

const HelpLink = styled("a")(({ theme }) => ({
  color: theme.palette.primary.main,
  textDecoration: "none",
  "&:hover": { textDecoration: "underline" },
}));

const Footer = styled("div")(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  fontSize: "14px",
  color: theme.text.secondary,
  padding: "10px 20px 20px",
  "@media (min-width: 800px)": { padding: "10px 30px 30px" },
}));

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

export function ViolationsTable({
  rows,
  total,
  groupBy,
  onGroupByChange,
  search,
  onSearchChange,
  branch,
}: {
  rows: A11yRow[];
  total: number;
  groupBy: "test" | "rule";
  onGroupByChange: (groupBy: "test" | "rule") => void;
  search: string;
  onSearchChange: (search: string) => void;
  branch: string;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const noun = groupBy === "test" ? "tests" : "rules";

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div>
      <Toolbar>
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder={`Find ${noun}`}
          label={`Find ${noun}`}
        />
        <Button
          variant="outlined"
          size="sm"
          onClick={() => downloadCsv(`a11y-${branch}.csv`, buildA11yCsv(rows, groupBy))}
          disabled={rows.length === 0}
        >
          Download CSV
        </Button>
        <PushRight>
          <ToggleButtonGroup
            size="sm"
            value={groupBy}
            isExclusive
            onChange={(value) => {
              if (value === "test" || value === "rule") {
                setExpanded(new Set());
                onGroupByChange(value);
              }
            }}
            aria-label="Group violations by"
          >
            <ToggleButton value="test">Tests</ToggleButton>
            <ToggleButton value="rule">Rules</ToggleButton>
          </ToggleButtonGroup>
        </PushRight>
      </Toolbar>

      <div style={{ overflowX: "auto" }}>
        <TableRoot role="treegrid" aria-label={`Accessibility violations by ${groupBy}`}>
          <thead>
            <tr>
              <th>{groupBy === "test" ? "Test" : "Rule"}</th>
              <th style={{ width: "110px" }}>Violations</th>
              <th style={{ width: "140px" }}>Last Updated</th>
              <th style={{ width: "150px" }}>User Impact</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isOpen = expanded.has(row.key);
              return (
                <Fragment key={row.key}>
                  <ParentRow
                    role="row"
                    aria-level={1}
                    aria-expanded={isOpen}
                    onClick={() => toggle(row.key)}
                  >
                    <td>
                      <ExpandButton
                        aria-label={isOpen ? "Collapse" : "Expand"}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(row.key);
                        }}
                      >
                        <Icon name={isOpen ? "expand_less" : "expand_more"} size="14px" color="inherit" />
                      </ExpandButton>
                      <RowTitle>{row.title}</RowTitle>
                    </td>
                    <td>{row.violations}</td>
                    <td>
                      <Muted>{fmtDate(row.lastChangedAt)}</Muted>
                    </td>
                    <td>{row.impact && <ImpactPill impact={row.impact} />}</td>
                  </ParentRow>
                  {isOpen &&
                    row.children.map((child) => (
                      <ChildRow key={`${row.key}:${child.key}`} role="row" aria-level={2}>
                        <td style={{ paddingLeft: "40px" }}>
                          {child.helpUrl ?? row.helpUrl ? (
                            <HelpLink
                              href={child.helpUrl ?? row.helpUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {child.title} ↗
                            </HelpLink>
                          ) : (
                            child.title
                          )}
                          {(child.description ?? row.description) && (
                            <Muted style={{ display: "block", fontSize: "12px", lineHeight: "18px" }}>
                              {child.description ?? row.description}
                            </Muted>
                          )}
                        </td>
                        <td>
                          <Muted>
                            {child.nodes} {child.nodes === 1 ? "element" : "elements"}
                          </Muted>
                        </td>
                        <td />
                        <td>
                          <ImpactPill impact={child.impact} />
                        </td>
                      </ChildRow>
                    ))}
                </Fragment>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <Muted>{search.trim() ? `No ${noun} match “${search}”.` : "No violations 🎉"}</Muted>
                </td>
              </tr>
            )}
          </tbody>
        </TableRoot>
      </div>

      <Footer>
        <span>
          1 – {rows.length} of {total} {noun}
        </span>
      </Footer>
    </div>
  );
}
