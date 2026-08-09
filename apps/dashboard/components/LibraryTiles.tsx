"use client";

import NextLink from "next/link";
import { styled } from "@soroush.tech/design-system";
import { Icon } from "@soroush.tech/design-system/Icon";
import { Skeleton } from "@soroush.tech/design-system/Skeleton";

/** Reference grid: 15px column gutter / 20px row gap via item padding, column
 *  widths 50% → 33% → 25% → 20% by breakpoint. */
export const TileGrid = styled("ul")({
  listStyle: "none",
  display: "flex",
  flexWrap: "wrap",
  margin: "0 -7.5px",
  padding: 0,
  width: "calc(100% + 15px)",
});

export const TileCell = styled("li")({
  padding: "0 7.5px 20px",
  minWidth: "150px",
  width: "50%",
  "@media (min-width: 420px)": { width: "33.333%" },
  "@media (min-width: 600px)": { width: "25%" },
  "@media (min-width: 900px)": { width: "20%" },
});

const TileShell = styled("span")({
  display: "block",
  minWidth: 0,
  textAlign: "left",
});

const Thumb = styled("span")(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gridAutoRows: "1fr",
  aspectRatio: "1 / 1",
  width: "100%",
  backgroundColor: theme.background.paper,
  borderRadius: "5px",
  boxShadow: "rgba(0, 0, 0, 0.05) 0 1px 3px 0, rgba(0, 0, 0, 0.05) 0 0 0 1px inset",
  overflow: "hidden",
  marginBottom: "8px",
  padding: "3px",
  gap: "2px",
  transition: "transform 150ms, box-shadow 150ms",
  "a:hover &, a:focus-visible &, button:hover &, button:focus-visible &": {
    transform: "translateY(-3px)",
    boxShadow: "rgba(0, 0, 0, 0.08) 0 3px 10px 0, rgba(0, 0, 0, 0.05) 0 0 0 1px inset",
  },
}));

const ThumbCell = styled("span")({
  display: "block",
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

const Name = styled("span")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: "4px",
  fontSize: "14px",
  lineHeight: "16px",
  fontWeight: theme.fontWeights.bold,
  color: theme.text.initial,
  marginBottom: "2px",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
}));

const Sub = styled("span")(({ theme }) => ({
  display: "block",
  fontSize: "12px",
  lineHeight: "14px",
  color: theme.text.secondary,
}));

const TileLink = styled(NextLink)({
  display: "block",
  textDecoration: "none",
  minWidth: 0,
});

const TileButton = styled("button")({
  display: "block",
  width: "100%",
  padding: 0,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontFamily: "inherit",
});

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
        <Name>{name}</Name>
        <Sub>
          {storyCount} {storyCount === 1 ? "story" : "stories"}
        </Sub>
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
    <TileButton type="button" onClick={onOpen}>
      <TileShell>
        <ThumbGrid thumbs={thumbs} alt={name} />
        <Name>
          <Icon name="folder" size="14px" color="secondary" /> {name}
        </Name>
        <Sub>
          {componentCount} {componentCount === 1 ? "component" : "components"}
        </Sub>
      </TileShell>
    </TileButton>
  );
}
