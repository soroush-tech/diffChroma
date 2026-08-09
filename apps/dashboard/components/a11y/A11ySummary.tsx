"use client";

import { styled } from "@soroush.tech/design-system";
import { Flex } from "@soroush.tech/design-system/Flex";
import { Typography } from "@soroush.tech/design-system/Typography";
import { ImpactPill } from "./ImpactPill";
import type { A11ySummaryResponse, WireImpact } from "@/lib/a11y";

const Divider = styled("div")(({ theme }) => ({
  alignSelf: "stretch",
  width: "1px",
  backgroundColor: theme.border.default,
}));

const IMPACTS: WireImpact[] = ["critical", "serious", "moderate", "minor"];

/** Stat strip for the a11y page: violations hero + impact breakdown + scope. */
export function A11ySummary({ totals }: { totals: A11ySummaryResponse["totals"] }) {
  return (
    <Flex flexDirection="row" alignItems="center" flexWrap="wrap" gap={3}>
      <Flex gap={0.5}>
        <Typography variant="h3" as="div">
          {totals.violations}
        </Typography>
        <Typography variant="body2" color="secondary">
          Violations
        </Typography>
      </Flex>
      <Flex flexDirection="row" alignItems="center" flexWrap="wrap" gap={0.5}>
        {IMPACTS.filter((impact) => totals.byImpact[impact] > 0).map((impact) => (
          <Flex key={impact} flexDirection="row" alignItems="center" gap={0.5}>
            <Typography variant="caption" color="secondary">
              {totals.byImpact[impact]}
            </Typography>
            <ImpactPill impact={impact} />
          </Flex>
        ))}
      </Flex>
      <Divider />
      <Flex gap={0.5}>
        <Typography variant="h5" as="div">
          {totals.components}
        </Typography>
        <Typography variant="caption" color="secondary">
          Components
        </Typography>
      </Flex>
      <Flex gap={0.5}>
        <Typography variant="h5" as="div">
          {totals.tests}
        </Typography>
        <Typography variant="caption" color="secondary">
          Total tests
        </Typography>
      </Flex>
    </Flex>
  );
}
