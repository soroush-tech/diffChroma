"use client";

import NextLink from "next/link";
import { useServerInsertedHTML } from "next/navigation";
import { useState } from "react";
import createCache from "@emotion/cache";
import { CacheProvider, Global, styled } from "@soroush.tech/design-system";
import { AppBar } from "@soroush.tech/design-system/AppBar";
import { Flex } from "@soroush.tech/design-system/Flex";
import { ThemeProvider } from "@soroush.tech/design-system/ThemeProvider";
import { Typography } from "@soroush.tech/design-system/Typography";
import { View } from "@soroush.tech/design-system/View";

const Brand = styled(NextLink)(({ theme }) => ({
  color: theme.text.initial,
  textDecoration: "none",
  fontFamily: theme.fonts.mono,
  fontWeight: theme.fontWeights.bold,
  letterSpacing: theme.letterSpacings.wide,
  fontSize: theme.fontSizes[2],
  "&:hover": { color: theme.text.primary },
}));

/** Collects emotion styles rendered on the server and re-injects them into the
 *  HTML stream, so server-rendered markup arrives already styled. */
function useEmotionRegistry() {
  const [{ cache, flush }] = useState(() => {
    const cache = createCache({ key: "dc" });
    cache.compat = true;
    const prevInsert = cache.insert;
    let inserted: string[] = [];
    cache.insert = (...args) => {
      const serialized = args[1];
      if (cache.inserted[serialized.name] === undefined) inserted.push(serialized.name);
      return prevInsert(...args);
    };
    const flush = () => {
      const prev = inserted;
      inserted = [];
      return prev;
    };
    return { cache, flush };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) return null;
    let styles = "";
    for (const name of names) styles += cache.inserted[name];
    return (
      <style
        data-emotion={`${cache.key} ${names.join(" ")}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return cache;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const cache = useEmotionRegistry();
  return (
    <CacheProvider value={cache}>
      <ThemeProvider>
        <Global
          styles={(theme) => ({
            "*, *::before, *::after": { boxSizing: "border-box" },
            body: {
              margin: 0,
              backgroundColor: theme.background.primary,
              color: theme.text.initial,
              fontFamily: theme.fonts.body,
            },
          })}
        />
        <AppBar position="sticky" top={0}>
          <Flex flexDirection="row" alignItems="center" justifyContent="space-between">
            <Brand href="/">◧ DIFFCHROMA</Brand>
            <Typography variant="caption" color="secondary" fontFamily="mono">
              visual regression testing
            </Typography>
          </Flex>
        </AppBar>
        <View as="main" maxWidth="1200px" mx="auto" p={3}>
          {children}
        </View>
      </ThemeProvider>
    </CacheProvider>
  );
}
