"use client";

import NextLink from "next/link";
import { styled } from "@soroush.tech/design-system";
import { Grid } from "@soroush.tech/design-system/Grid";
import { Icon } from "@soroush.tech/design-system/Icon";
import { Pressable } from "@soroush.tech/design-system/Pressable";
import { Skeleton } from "@soroush.tech/design-system/Skeleton";
import { Typography } from "@soroush.tech/design-system/Typography";

const TileShell = styled("div")({
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
});

const Thumb = styled("div")(({ theme }) => ({
  aspectRatio: "1 / 1",
  width: "100%",
  backgroundColor: theme.background.paper,
  border: `${theme.borderWidths.thin} solid ${theme.border.default}`,
  borderRadius: theme.radii.sm,
  overflow: "hidden",
  marginBottom: "8px",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gridAutoRows: "1fr",
  gap: "2px",
  padding: "3px",
  transition: "transform 150ms, box-shadow 150ms",
  "a:hover &, [role='button']:hover &": {
    transform: "translateY(-2px)",
    boxShadow: "rgba(0,0,0,.08) 0 3px 10px 0",
  },
}));

const ThumbCell = styled("div")({
  backgroundColor: "#fff",
  borderRadius: "3px",
  overflow: "hidden",
  minHeight: 0,
  "& img": {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "top left",
    display: "block",
  },
});

const TileLink = styled(NextLink)(({ theme }) => ({
  display: "block",
  textDecoration: "none",
  color: theme.text.initial,
  minWidth: 0,
}));

function ThumbGrid({ thumbs, alt }: { thumbs: string[]; alt: string }) {
  const cells = thumbs.length > 1 ? thumbs.slice(0, 4) : thumbs;
  return (
    <Thumb style={cells.length <= 1 ? { gridTemplateColumns: "1fr" } : undefined}>
      {cells.length === 0 && <Skeleton variant="rectangular" height="100%" />}
      {cells.map((url, i) => (
        <ThumbCell key={i}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={i === 0 ? alt : ""} loading="lazy" />
        </ThumbCell>
      ))}
    </Thumb>
  );
}

function Caption({
  icon,
  name,
  sub,
}: {
  icon?: React.ReactNode;
  name: string;
  sub: string;
}) {
  return (
    <>
      <Typography variant="body2" fontWeight="bold" noWrap as="div">
        {icon} {name}
      </Typography>
      <Typography variant="caption" color="secondary">
        {sub}
      </Typography>
    </>
  );
}

export function ComponentTile({
  href,
  name,
  storyCount,
  thumbs,
}: {
  href: string;
  name: string;
  storyCount: number;
  thumbs: string[];
}) {
  return (
    <TileLink href={href}>
      <TileShell>
        <ThumbGrid thumbs={thumbs} alt={name} />
        <Caption name={name} sub={`${storyCount} ${storyCount === 1 ? "story" : "stories"}`} />
      </TileShell>
    </TileLink>
  );
}

export function FolderTile({
  name,
  componentCount,
  thumbs,
  onOpen,
}: {
  name: string;
  componentCount: number;
  thumbs: string[];
  onOpen: () => void;
}) {
  return (
    <Pressable onClick={onOpen} display="block" minWidth={0} textAlign="left">
      <TileShell>
        <ThumbGrid thumbs={thumbs} alt={name} />
        <Caption
          icon={<Icon name="folder" size="0.9rem" color="secondary" />}
          name={name}
          sub={`${componentCount} ${componentCount === 1 ? "component" : "components"}`}
        />
      </TileShell>
    </Pressable>
  );
}

/** Responsive tile grid used by every library section. */
export function TileGrid({ children }: { children: React.ReactNode }) {
  return (
    <Grid gridTemplateColumns="repeat(auto-fill, minmax(160px, 1fr))" gap={2} width="100%">
      {children}
    </Grid>
  );
}
