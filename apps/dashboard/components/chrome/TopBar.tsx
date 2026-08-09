"use client";

import NextLink from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { styled } from "@soroush.tech/design-system";
import { AppBar } from "@soroush.tech/design-system/AppBar";
import { Button } from "@soroush.tech/design-system/Button";
import { Flex } from "@soroush.tech/design-system/Flex";
import { Typography } from "@soroush.tech/design-system/Typography";
import { NavLink } from "@/components/ui";
import { getToken, setToken } from "@/lib/api";
import { clearSessionCache, useMe, useProject } from "@/lib/useProject";
import { TOPBAR_HEIGHT } from "./constants";

const Brand = styled(NextLink)(({ theme }) => ({
  color: theme.text.initial,
  textDecoration: "none",
  fontFamily: theme.fonts.mono,
  fontWeight: theme.fontWeights.bold,
  letterSpacing: theme.letterSpacings.wide,
  fontSize: theme.fontSizes[2],
  "&:hover": { color: theme.text.primary },
}));

const Sep = styled("span")(({ theme }) => ({
  color: theme.text.secondary,
  margin: "0 0.35em",
}));

export function TopBar() {
  const router = useRouter();
  const params = useParams<{ id?: string | string[] }>();
  const projectId = typeof params.id === "string" ? params.id : undefined;
  const project = useProject(projectId);
  const me = useMe();
  // localStorage is unreadable during SSR/hydration; gate the session cluster.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const signedIn = mounted && getToken() !== null;

  function signOut() {
    setToken(null);
    clearSessionCache();
    router.push("/login");
  }

  return (
    <AppBar
      position="sticky"
      top={0}
      height={TOPBAR_HEIGHT}
      size="sm"
      color="appBar"
      blur
      borderBottom="1px solid"
      borderColor="default"
    >
      <Flex
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        gap={2}
        height="100%"
      >
        <Flex flexDirection="row" alignItems="center" minWidth={0}>
          <Brand href="/">◧ DIFFCHROMA</Brand>
          {projectId && (
            <Typography variant="body2" noWrap>
              <Sep>/</Sep>
              <NavLink href={`/projects/${projectId}/builds`}>{project?.name ?? "…"}</NavLink>
            </Typography>
          )}
        </Flex>
        <Flex flexDirection="row" alignItems="center" gap={1.5}>
          {signedIn ? (
            <>
              {me && (
                <Typography variant="caption" color="secondary" fontFamily="mono" noWrap>
                  {me.email}
                </Typography>
              )}
              <Button variant="text" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </>
          ) : (
            <Typography variant="caption" color="secondary" fontFamily="mono">
              visual regression testing
            </Typography>
          )}
        </Flex>
      </Flex>
    </AppBar>
  );
}
