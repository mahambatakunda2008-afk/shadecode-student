// src/app/layout.tsx
// Root layout — wraps the entire Next.js app.

import type { Metadata, Viewport } from "next";
import { Inter, Michroma } from "next/font/google";
import "./globals.css";
import OfflineShell from "@/components/OfflineShell";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import InAppSurvey from "@/components/traction/InAppSurvey";
import TractionBootstrap from "@/components/traction/TractionBootstrap";
import { BandwidthProvider } from "@/contexts/BandwidthContext";
import { ThemeContextProvider } from "@/contexts/ThemeContext";
import { MuiThemeProvider } from "@/theme/MuiThemeProvider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const michroma = Michroma({ weight: "400", subsets: ["latin"], variable: "--font-brand" });

export const metadata: Metadata = {
  metadataBase: new URL("https://shadecodestudent.vercel.app"),
  title: { default: "Shadecode Student", template: "%s — Shadecode Student" },
  description: "AI-powered learning platform for students. Learn Computer Science, Mathematics, and more with interactive AI tools.",
  keywords: ["Shadecode Student", "AI learning platform", "Computer Science", "A Level", "AS Level", "Zimbabwe students", "education"],
  authors: [{ name: "Shadecode" }],
  creator: "Shadecode",
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://shadecodestudent.vercel.app",
    siteName: "Shadecode Student",
    title: "Shadecode Student",
    description: "AI-powered learning platform for students.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Shadecode Student — AI-powered learning platform" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shadecode Student",
    description: "AI-powered learning platform for students.",
    images: ["/og-image.png"],
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/brand/shadecode-app-icon.svg", type: "image/svg+xml", sizes: "any" }],
    other: [
      { rel: "mask-icon", url: "/brand/shadecode-app-icon.svg", color: "#22D3EE" },
    ],
    apple: [{ url: "/apple-icon.svg", type: "image/svg+xml", sizes: "any" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#06111C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#06111C" />
      </head>
      <body className={`${inter.variable} ${michroma.variable} antialiased`}>
        <ThemeContextProvider>
          <MuiThemeProvider>
            <BandwidthProvider>
              {children}
              <OfflineShell />
              <PWAInstallPrompt />
              <InAppSurvey />
              <TractionBootstrap />
              <Analytics />
              <SpeedInsights />
            </BandwidthProvider>
          </MuiThemeProvider>
        </ThemeContextProvider>
      </body>
    </html>
  );
}
