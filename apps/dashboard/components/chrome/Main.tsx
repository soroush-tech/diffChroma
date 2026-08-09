"use client";

import { View } from "@soroush.tech/design-system/View";

/** Standard page column. Project pages get it from the project layout; other
 *  routes wrap their own content. */
export function Main({ children }: { children: React.ReactNode }) {
  return (
    <View as="main" width="100%" maxWidth="1200px" mx="auto" p={3}>
      {children}
    </View>
  );
}
