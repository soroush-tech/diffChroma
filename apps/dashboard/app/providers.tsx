"use client";

import { useServerInsertedHTML } from "next/navigation";
import { useState } from "react";
import createCache from "@emotion/cache";
import { CacheProvider, Global } from "@soroush.tech/design-system/engine";
import { ThemeProvider } from "@soroush.tech/design-system/theme";
import { light } from "@/theme";

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
      <ThemeProvider theme={light}>
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
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
