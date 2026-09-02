"use client";

import { styled } from "@soroush.tech/design-system";
import { Skeleton } from "@soroush.tech/design-system/Skeleton";

const RowShell = styled("div")(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: "20px",
  padding: "20px",
  borderBottom: `${theme.borderWidths.thin} solid ${theme.border.default}`,
  "&:last-of-type": { borderBottom: "none" },
  "@media (min-width: 800px)": { padding: "24px 30px" },
}));

const RowBody = styled("div")({
  flex: "1 1 auto",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
});

/** Placeholder rows shaped like the build list (dot + two lines + stats). */
export function BuildRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <RowShell key={i}>
          <Skeleton variant="circular" width={24} height={24} />
          <RowBody>
            <Skeleton variant="text" width="110px" />
            <Skeleton variant="text" width="260px" />
          </RowBody>
          <Skeleton variant="rectangular" width="72px" height="36px" borderRadius="sm" />
          <Skeleton variant="rectangular" width="72px" height="36px" borderRadius="sm" />
        </RowShell>
      ))}
    </div>
  );
}

/** Placeholder rows shaped like setting cards (icon + text block + action). */
export function SettingRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <RowShell key={i}>
          <Skeleton variant="rectangular" width={48} height={48} borderRadius="sm" />
          <RowBody>
            <Skeleton variant="text" width="160px" />
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="text" width="45%" />
          </RowBody>
          <Skeleton variant="rectangular" width="90px" height="32px" borderRadius="lg" />
        </RowShell>
      ))}
    </div>
  );
}

const GridShell = styled("div")({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
  gap: "12px",
});

/** Placeholder card grid (projects list, snapshot thumbnails). */
export function CardGridSkeleton({
  tiles = 6,
  height = "120px",
}: {
  tiles?: number;
  height?: string;
}) {
  return (
    <GridShell aria-busy="true">
      {Array.from({ length: tiles }, (_, i) => (
        <Skeleton key={i} variant="rectangular" width="100%" height={height} borderRadius="md" />
      ))}
    </GridShell>
  );
}

const Lines = styled("div")({
  display: "flex",
  flexDirection: "column",
  gap: "10px",
});

/** Generic text-block placeholder. */
export function LinesSkeleton({ lines = 3, width = "100%" }: { lines?: number; width?: string }) {
  return (
    <Lines aria-busy="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} variant="text" width={i === lines - 1 ? "60%" : width} />
      ))}
    </Lines>
  );
}

const StatShell = styled("div")({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: "25px",
});

/** Placeholder for the 28px stat strips. */
export function StatStripSkeleton() {
  return (
    <StatShell aria-busy="true">
      <Skeleton variant="rectangular" width="120px" height="52px" borderRadius="sm" />
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} variant="rectangular" width="80px" height="52px" borderRadius="sm" />
      ))}
    </StatShell>
  );
}
