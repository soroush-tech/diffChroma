"use client";

import { useMemo, useRef, useState } from "react";
import { useTheme } from "@soroush.tech/design-system/theme";
import { Flex } from "@soroush.tech/design-system/Flex";
import { Typography } from "@soroush.tech/design-system/Typography";
import type { A11yTimeseriesResponse } from "@/lib/a11y";

type Point = A11yTimeseriesResponse["points"][number];

const HEIGHT = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 40 };
const WIDTH = 720; // viewBox width; the svg scales to its container

/** 1/2/5 ladder for a readable y-axis. */
function niceStep(max: number, ticks: number): number {
  const raw = Math.max(1, max / ticks);
  const pow = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 5, 10]) if (raw <= m * pow) return m * pow;
  return 10 * pow;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Dependency-free SVG line chart of violations per audited build. */
export function ViolationsChart({ points }: { points: Point[] }) {
  const theme = useTheme();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const layout = useMemo(() => {
    if (points.length < 2) return null;
    const times = points.map((p) => new Date(p.date).getTime());
    const t0 = Math.min(...times);
    const t1 = Math.max(...times);
    const span = Math.max(1, t1 - t0);
    const maxV = Math.max(1, ...points.map((p) => p.violations));
    const step = niceStep(maxV, 4);
    const yMax = Math.ceil(maxV / step) * step;
    const x = (t: number) => PAD.left + ((t - t0) / span) * (WIDTH - PAD.left - PAD.right);
    const y = (v: number) => PAD.top + (1 - v / yMax) * (HEIGHT - PAD.top - PAD.bottom);
    const coords = points.map((p, i) => ({ p, cx: x(times[i]!), cy: y(p.violations) }));
    const yTicks = Array.from({ length: Math.floor(yMax / step) + 1 }, (_, i) => i * step);
    return { coords, yTicks, y };
  }, [points]);

  if (!layout) {
    return (
      <Flex alignItems="center" justifyContent="center" height={`${HEIGHT}px`}>
        <Typography variant="body2" color="secondary">
          Not enough audited builds yet — the trend appears after two builds.
        </Typography>
      </Flex>
    );
  }

  const { coords, yTicks, y } = layout;
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.cx},${c.cy}`).join(" ");
  const accent = theme.palette.primary.main;
  const hovered = hover !== null ? coords[hover] : null;

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let best = 0;
    let bestDist = Infinity;
    coords.forEach((c, i) => {
      const d = Math.abs(c.cx - px);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setHover(best);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Line chart of accessibility violations per build"
        style={{ display: "block", width: "100%", height: "auto" }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke={theme.border.default}
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(tick) + 4}
              textAnchor="end"
              fontSize={11}
              fill={theme.text.secondary}
            >
              {tick}
            </text>
          </g>
        ))}
        {[coords[0]!, coords[Math.floor(coords.length / 2)]!, coords[coords.length - 1]!]
          .filter((c, i, arr) => arr.findIndex((o) => o.cx === c.cx) === i)
          .map((c) => (
            <text
              key={c.cx}
              x={c.cx}
              y={HEIGHT - 8}
              textAnchor="middle"
              fontSize={11}
              fill={theme.text.secondary}
            >
              {fmtDate(c.p.date)}
            </text>
          ))}
        <path d={line} fill="none" stroke={accent} strokeWidth={2} />
        {coords.map((c, i) => (
          <circle
            key={c.p.buildId}
            cx={c.cx}
            cy={c.cy}
            r={hover === i ? 5 : 3}
            fill={accent}
          />
        ))}
        {hovered && (
          <line
            x1={hovered.cx}
            x2={hovered.cx}
            y1={PAD.top}
            y2={HEIGHT - PAD.bottom}
            stroke={theme.border.default}
            strokeWidth={1}
          />
        )}
      </svg>
      {hovered && (
        <div
          style={{
            position: "absolute",
            left: `${(hovered.cx / WIDTH) * 100}%`,
            top: 0,
            transform: `translateX(${hovered.cx > WIDTH * 0.7 ? "-105%" : "8px"})`,
            background: theme.background.paper,
            border: `1px solid ${theme.border.default}`,
            borderRadius: theme.radii.sm,
            padding: "8px 10px",
            pointerEvents: "none",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            whiteSpace: "nowrap",
          }}
        >
          <Typography variant="caption" as="div" fontWeight="bold">
            {hovered.p.violations} violations
          </Typography>
          <Typography variant="caption" as="div" color="secondary">
            Build #{hovered.p.buildNumber} · {fmtDate(hovered.p.date)}
          </Typography>
        </div>
      )}
    </div>
  );
}
