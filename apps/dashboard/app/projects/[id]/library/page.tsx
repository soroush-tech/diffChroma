"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { styled } from "@soroush.tech/design-system";
import { Button } from "@soroush.tech/design-system/Button";
import { Flex } from "@soroush.tech/design-system/Flex";
import { Grid } from "@soroush.tech/design-system/Grid";
import { Skeleton } from "@soroush.tech/design-system/Skeleton";
import { Typography } from "@soroush.tech/design-system/Typography";
import { ComponentTile, FolderTile, TileCell, TileGrid } from "@/components/LibraryTiles";
import { PageCard } from "@/components/PageCard";
import { PageHeader } from "@/components/PageHeader";
import { Pill } from "@/components/Pill";
import { SearchInput } from "@/components/SearchInput";
import { SectionLabel } from "@/components/SectionLabel";
import { NavLink } from "@/components/ui";
import { api } from "@/lib/api";
import { filterComponents, sectionize, thumbsOf, type LibraryResponse } from "@/lib/library";

const FilterBar = styled("div")({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  flexWrap: "wrap",
  justifyContent: "space-between",
  gap: "10px",
  minHeight: "40px",
  marginBottom: "0.75rem",
});

const Counts = styled("div")(({ theme }) => ({
  display: "none",
  "@media (min-width: 800px)": {
    display: "flex",
    flexDirection: "row",
    gap: "15px",
    fontSize: "14px",
    lineHeight: "20px",
    color: theme.text.secondary,
  },
}));

const BuildRef = styled("span")(({ theme }) => ({
  fontSize: "14px",
  lineHeight: "28px",
  fontWeight: theme.fontWeights.bold,
  color: theme.text.secondary,
  whiteSpace: "nowrap",
}));

const Section = styled("section")({
  marginTop: "24px",
  "&:first-of-type": { marginTop: 0 },
  "& > h3": { marginBottom: "12px", padding: "0 7.5px" },
});

function LoadingGrid() {
  return (
    <TileGrid>
      {Array.from({ length: 10 }, (_, i) => (
        <TileCell key={i}>
          <Skeleton variant="rectangular" width="100%" height="160px" borderRadius="md" />
        </TileCell>
      ))}
    </TileGrid>
  );
}

export default function LibraryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const group = searchParams.get("group");
  const componentTitle = searchParams.get("component");

  const [data, setData] = useState<LibraryResponse | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    void api<LibraryResponse>(`/projects/${id}/library`).then(setData).catch(() => undefined);
  }, [id]);

  function setQuery(next: { group?: string | null; component?: string | null }) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === undefined) params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    router.replace(`/projects/${id}/library${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  const searched = useMemo(
    () => (data ? filterComponents(data.components, search) : []),
    [data, search],
  );
  const sections = useMemo(
    () => sectionize(searched, search.trim() === "" && group ? group.split("/") : null),
    [searched, group, search],
  );
  const detail = useMemo(
    () => (data && componentTitle ? data.components.find((c) => c.title === componentTitle) : null),
    [data, componentTitle],
  );

  return (
    <>
      <PageHeader
        title="Library"
        actions={
          data?.latest && (
            <Button
              variant="outlined"
              size="sm"
              onClick={() => router.push(`/projects/${id}/builds/${data.latest!.buildId}`)}
            >
              View latest build
            </Button>
          )
        }
      />

      <FilterBar>
        <Flex flexDirection="row" alignItems="center" gap={2}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Find component"
            label="Find component"
          />
          {data && (
            <Counts>
              <span>
                {data.totals.components} {data.totals.components === 1 ? "component" : "components"}
              </span>
              <span>
                {data.totals.stories} {data.totals.stories === 1 ? "story" : "stories"}
              </span>
            </Counts>
          )}
        </Flex>
        {data?.latest && (
          <BuildRef title={data.latest.branch}>
            {data.latest.branch} – Build {data.latest.buildNumber}
          </BuildRef>
        )}
      </FilterBar>

      {!data && <LoadingGrid />}

      {data && data.components.length === 0 && (
        <PageCard style={{ maxWidth: "560px" }}>
          <Typography variant="h5" as="h2" m={0} mb={1}>
            No baselines yet
          </Typography>
          <Typography variant="body2" color="secondary">
            The library shows each story&apos;s accepted baseline snapshot. Baselines appear after
            your first build is approved. <NavLink href={`/projects/${id}/builds`}>Go to builds</NavLink>
          </Typography>
        </PageCard>
      )}

      {data && detail && (
        <Flex gap={2}>
          <Flex flexDirection="row" alignItems="center" gap={1}>
            <Button variant="text" size="sm" onClick={() => setQuery({ component: null })}>
              ← All components
            </Button>
            <Typography variant="h5" as="h2" m={0}>
              {detail.title}
            </Typography>
            <Pill>
              {detail.storyCount} {detail.storyCount === 1 ? "story" : "stories"}
            </Pill>
          </Flex>
          {detail.stories.map((story) => (
            <PageCard key={story.storyId}>
              <Typography variant="h6" as="h3" m={0} mb={1.5}>
                {story.name}
              </Typography>
              <Grid gridTemplateColumns="repeat(auto-fill, minmax(260px, 1fr))" gap={1.5}>
                {story.viewports.map((vp) => (
                  <Flex key={vp.viewport} gap={0.5}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={vp.imageUrl}
                      alt={`${detail.title} / ${story.name} @ ${vp.viewport}`}
                      loading="lazy"
                      style={{
                        width: "100%",
                        background: "#fff",
                        border: "1px solid rgba(128,128,128,0.25)",
                        borderRadius: "4px",
                      }}
                    />
                    <Flex flexDirection="row" alignItems="center" justifyContent="space-between">
                      <Pill>{vp.viewport}</Pill>
                      <Typography variant="caption" color="secondary">
                        <NavLink href={`/projects/${id}/builds/${vp.buildId}`}>
                          Review in build #{vp.buildNumber}
                        </NavLink>
                      </Typography>
                    </Flex>
                  </Flex>
                ))}
              </Grid>
            </PageCard>
          ))}
        </Flex>
      )}

      {data && !detail && data.components.length > 0 && (
        <div>
          {group && search.trim() === "" && (
            <Flex flexDirection="row" alignItems="center" mb={1}>
              <Button variant="text" size="sm" onClick={() => setQuery({ group: null })}>
                ← Back
              </Button>
            </Flex>
          )}
          {sections.map((section) => (
            <Section key={section.name}>
              <SectionLabel>{section.name}</SectionLabel>
              <TileGrid>
                {section.tiles.map((tile) =>
                  tile.kind === "component" ? (
                    <TileCell key={`c:${tile.component.title}`}>
                      <ComponentTile
                        href={`/projects/${id}/library?component=${encodeURIComponent(tile.component.title)}`}
                        name={tile.name}
                        storyCount={tile.component.storyCount}
                        thumbs={thumbsOf(tile.component)}
                      />
                    </TileCell>
                  ) : (
                    <TileCell key={`f:${tile.name}`}>
                      <FolderTile
                        name={tile.name}
                        componentCount={tile.componentCount}
                        thumbs={tile.thumbs}
                        onOpen={() => setQuery({ group: tile.prefix.join("/") })}
                      />
                    </TileCell>
                  ),
                )}
              </TileGrid>
            </Section>
          ))}
          {sections.length === 0 && (
            <Typography variant="body2" color="secondary">
              No components match “{search}”.
            </Typography>
          )}
        </div>
      )}
    </>
  );
}
