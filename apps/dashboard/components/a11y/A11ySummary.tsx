"use client";

import { Flex } from "@soroush.tech/design-system/Flex";
import { Stat, StatDivider } from "@/components/StatStrip";
import { ImpactPill } from "./ImpactPill";
import type { A11ySummaryResponse, WireImpact } from "@/lib/a11y";

const IMPACTS: WireImpact[] = ["critical", "serious", "moderate", "minor"];

/** Reference-style stat strip: Violations | divider | Components · Total tests,
 *  with per-impact chips beside the violation count. */
export function A11ySummary({ totals }: { totals: A11ySummaryResponse["totals"] }) {
  return (
    <Flex flexDirection="row" alignItems="center" flexWrap="wrap" gap={2}>
      <Stat label="Violations" value={totals.violations} />
      <Flex flexDirection="row" alignItems="center" flexWrap="wrap" gap={0.5}>
        {IMPACTS.filter((impact) => totals.byImpact[impact] > 0).map((impact) => (
          <ImpactPill key={impact} impact={impact}>
            {totals.byImpact[impact]}
          </ImpactPill>
        ))}
      </Flex>
      <StatDivider />
      <Flex flexDirection="row" alignItems="center" gap={2}>
        <Stat label="Components" value={totals.components} />
        <Stat label="Total tests" value={totals.tests} />
      </Flex>
    </Flex>
  );
}
