"use client";

import { Pill } from "@/components/Pill";
import { impactTone, type WireImpact } from "@/lib/a11y";

/** axe impact chip; critical renders filled for maximum urgency. */
export function ImpactPill({ impact }: { impact: WireImpact }) {
  return (
    <Pill tone={impactTone[impact]} filled={impact === "critical"}>
      {impact}
    </Pill>
  );
}
