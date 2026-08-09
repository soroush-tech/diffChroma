"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@soroush.tech/design-system/Button";
import { Card } from "@soroush.tech/design-system/Card";
import { Flex } from "@soroush.tech/design-system/Flex";
import { Grid } from "@soroush.tech/design-system/Grid";
import { Skeleton } from "@soroush.tech/design-system/Skeleton";
import { Typography } from "@soroush.tech/design-system/Typography";
import { View } from "@soroush.tech/design-system/View";
import { ComponentTile, FolderTile, TileGrid } from "@/components/LibraryTiles";
import { Pill } from "@/components/Pill";
import { SearchInput } from "@/components/SearchInput";
import { SectionLabel } from "@/components/SectionLabel";
import { NavLink } from "@/components/ui";
import { api } from "@/lib/api";
import { filterComponents, sectionize, thumbsOf, type LibraryResponse } from "@/lib/library";

function LoadingGrid() {
  return (
    <TileGrid>
      {Array.from({ length: 8 }, (_, i) => (
        <Flex key={i} gap={1}>
          <Skeleton variant="rectangular" width="100%" height="160px" borderRadius="sm" />
        </Flex>
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
    <Flex gap={2}>
      <Flex flexDirection="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Typography variant="h3">Library</Typography>
        {data?.latest && (
          <Button
            variant="outlined"
            size="sm"
            onClick={() => router.push(`/projects/${id}/builds/${data.latest!.buildId}`)}
          >
            View latest build
          </Button>
        )}
      </Flex>

      <Flex flexDirection="row" alignItems="center" flexWrap="wrap" gap={1.5}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Find component"
          label="Find component"
        />
        {data && (
          <>
            <Pill>
              {data.totals.components} {data.totals.components === 1 ? "component" : "components"}
            </Pill>
            <Pill>
              {data.totals.stories} {data.totals.stories === 1 ? "story" : "stories"}
            </Pill>
            {data.latest && (
              <View ml="auto">
                <Pill tone="info">
                  {data.latest.branch} · Build {data.latest.buildNumber}
                </Pill>
              </View>
            )}
          </>
        )}
      </Flex>

      {!data && <LoadingGrid />}

      {data && data.components.length === 0 && (
        <Card variant="bracketBox" title="No baselines yet" maxWidth="560px">
          <Typography variant="body2" color="secondary" mt={1}>
            The library shows each story&apos;s accepted baseline snapshot. Baselines appear after
            your first build is approved. <NavLink href={`/projects/${id}/builds`}>Go to builds</NavLink>
          </Typography>
        </Card>
      )}

      {data && detail && (
        <Flex gap={2}>
          <Flex flexDirection="row" alignItems="center" gap={1}>
            <Button variant="text" size="sm" onClick={() => setQuery({ component: null })}>
              ← All components
            </Button>
            <Typography variant="h5">{detail.title}</Typography>
            <Pill>
              {detail.storyCount} {detail.storyCount === 1 ? "story" : "stories"}
            </Pill>
          </Flex>
          {detail.stories.map((story) => (
            <Card key={story.storyId} title={story.name}>
              <Grid gridTemplateColumns="repeat(auto-fill, minmax(260px, 1fr))" gap={1.5} mt={1}>
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
            </Card>
          ))}
        </Flex>
      )}

      {data && !detail && data.components.length > 0 && (
        <Flex gap={3}>
          {group && search.trim() === "" && (
            <Flex flexDirection="row" alignItems="center" gap={1}>
              <Button variant="text" size="sm" onClick={() => setQuery({ group: null })}>
                ← Back
              </Button>
            </Flex>
          )}
          {sections.map((section) => (
            <Flex key={section.name} gap={1.5}>
              <SectionLabel>{section.name}</SectionLabel>
              <TileGrid>
                {section.tiles.map((tile) =>
                  tile.kind === "component" ? (
                    <ComponentTile
                      key={`c:${tile.component.title}`}
                      href={`/projects/${id}/library?component=${encodeURIComponent(tile.component.title)}`}
                      name={tile.name}
                      storyCount={tile.component.storyCount}
                      thumbs={thumbsOf(tile.component)}
                    />
                  ) : (
                    <FolderTile
                      key={`f:${tile.name}`}
                      name={tile.name}
                      componentCount={tile.componentCount}
                      thumbs={tile.thumbs}
                      onOpen={() => setQuery({ group: tile.prefix.join("/") })}
                    />
                  ),
                )}
              </TileGrid>
            </Flex>
          ))}
          {sections.length === 0 && (
            <Typography variant="body2" color="secondary">
              No components match “{search}”.
            </Typography>
          )}
        </Flex>
      )}
    </Flex>
  );
}
