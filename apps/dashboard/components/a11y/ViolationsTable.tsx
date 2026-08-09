"use client";

import { Fragment, useState } from "react";
import { styled } from "@soroush.tech/design-system";
import { Button } from "@soroush.tech/design-system/Button";
import { Flex } from "@soroush.tech/design-system/Flex";
import { Icon } from "@soroush.tech/design-system/Icon";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@soroush.tech/design-system/Table";
import { ToggleButton, ToggleButtonGroup } from "@soroush.tech/design-system/ToggleButton";
import { Typography } from "@soroush.tech/design-system/Typography";
import { SearchInput } from "@/components/SearchInput";
import { ImpactPill } from "./ImpactPill";
import { buildA11yCsv, downloadCsv, type A11yRow } from "@/lib/a11y";

const ExpandButton = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "20px",
  height: "20px",
  padding: 0,
  marginRight: "6px",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  color: theme.text.secondary,
  verticalAlign: "middle",
  "&:hover": { color: theme.text.initial },
}));

const HelpLink = styled("a")(({ theme }) => ({
  color: theme.text.primary,
  textDecoration: "none",
  "&:hover": { textDecoration: "underline" },
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
    <Flex gap={1.5}>
      <Flex flexDirection="row" alignItems="center" flexWrap="wrap" gap={1.5}>
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
        <Flex flexDirection="row" ml="auto">
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
        </Flex>
      </Flex>

      <TableContainer>
        <Table size="sm" role="treegrid" aria-label={`Accessibility violations by ${groupBy}`}>
          <TableHead>
            <TableRow>
              <TableCell>{groupBy === "test" ? "Test" : "Rule"}</TableCell>
              <TableCell align="right">Violations</TableCell>
              <TableCell>Last Updated</TableCell>
              <TableCell style={{ width: "150px" }}>User Impact</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const isOpen = expanded.has(row.key);
              return (
                <Fragment key={row.key}>
                  <TableRow
                    role="row"
                    aria-level={1}
                    aria-expanded={isOpen}
                    isHoverable
                    onClick={() => toggle(row.key)}
                    style={{ cursor: "pointer" }}
                  >
                    <TableCell>
                      <ExpandButton
                        aria-label={isOpen ? "Collapse" : "Expand"}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(row.key);
                        }}
                      >
                        <Icon name={isOpen ? "expand_less" : "expand_more"} size="0.9rem" />
                      </ExpandButton>
                      <Typography as="span" variant="body2" fontWeight="bold">
                        {row.title}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{row.violations}</TableCell>
                    <TableCell>
                      <Typography variant="caption" color="secondary">
                        {fmtDate(row.lastChangedAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>{row.impact && <ImpactPill impact={row.impact} />}</TableCell>
                  </TableRow>
                  {isOpen &&
                    row.children.map((child) => (
                      <TableRow key={`${row.key}:${child.key}`} role="row" aria-level={2}>
                        <TableCell pl={5}>
                          <Typography variant="body2" as="div">
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
                          </Typography>
                          {(child.description ?? row.description) && (
                            <Typography variant="caption" color="secondary" as="div">
                              {child.description ?? row.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption" color="secondary">
                            {child.nodes} {child.nodes === 1 ? "element" : "elements"}
                          </Typography>
                        </TableCell>
                        <TableCell />
                        <TableCell>
                          <ImpactPill impact={child.impact} />
                        </TableCell>
                      </TableRow>
                    ))}
                </Fragment>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body2" color="secondary">
                    {search.trim() ? `No ${noun} match “${search}”.` : "No violations 🎉"}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="caption" color="secondary">
        1 – {rows.length} of {total} {noun}
      </Typography>
    </Flex>
  );
}
