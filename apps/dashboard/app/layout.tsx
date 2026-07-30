import type { Metadata } from "next";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "DiffChroma",
  description: "Self-hosted visual regression testing for Storybook",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
