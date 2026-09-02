"use client";

import { styled } from "@soroush.tech/design-system";
import { TOPBAR_HEIGHT } from "./constants";

const MainRoot = styled("main")({
  width: "100%",
  maxWidth: "1600px",
  margin: "0 auto",
  padding: "0 20px 48px",
  minHeight: `calc(100vh - ${TOPBAR_HEIGHT} - 1px)`,
  "@media (min-width: 600px)": { padding: "0 40px 48px" },
});

/** Standard page column. Project pages get it from the project layout; other
 *  routes wrap their own content. */
export function Main({ children }: { children: React.ReactNode }) {
  return <MainRoot>{children}</MainRoot>;
}
