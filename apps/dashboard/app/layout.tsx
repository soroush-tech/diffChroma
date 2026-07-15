import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "DiffChroma",
  description: "Self-hosted visual regression testing for Storybook",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            ◧ DiffChroma
          </Link>
          <span className="muted">visual regression testing</span>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
