"use client";

import { Pill } from "@/components/Pill";
import { impactTone, type WireImpact } from "@/lib/a11y";

/** axe impact chip; critical renders filled for maximum urgency. Optional
 *  children prefix the impact word (e.g. a count). */
export function ImpactPill({
  impact,
  children,
}: {
  impact: WireImpact;
  children?: React.ReactNode;
}) {
  return (
    <Pill tone={impactTone[impact]} filled={impact === "critical"}>
      {children != null ? <>{children} </> : null}
      {impact}
    </Pill>
  );
}
