import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const DESCRIPTION =
  "Upload a contract and get a plain-language map of every clause, grounded in verified quotes. Information, not legal advice.";

export const metadata: Metadata = {
  title: {
    default: "Clause Compass",
    template: "%s · Clause Compass",
  },
  description: DESCRIPTION,
  applicationName: "Clause Compass",
  keywords: ["contract review", "legal document", "clause analysis", "plain language contracts"],
  openGraph: {
    title: "Clause Compass",
    description: DESCRIPTION,
    type: "website",
    siteName: "Clause Compass",
  },
  twitter: {
    card: "summary",
    title: "Clause Compass",
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#faf7f0",
};

// The CSP nonce in proxy.ts is regenerated on every request; a statically
// prerendered page would bake in a build-time nonce that never matches it,
// silently blocking every script (including hydration) in production.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink font-body">
        <a
          href="#main-content"
          className="sr-only-focusable fixed left-4 top-4 z-50 rounded bg-harbor px-4 py-2 text-sm font-medium text-paper-raised"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
