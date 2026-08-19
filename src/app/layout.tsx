import type { Metadata, Viewport } from "next";
import { Inter, Michroma, Space_Grotesk } from "next/font/google";
import "./globals.css";
import OfflineShell from "@/components/OfflineShell";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import InAppSurvey from "@/components/traction/InAppSurvey";
import TractionBootstrap from "@/components/traction/TractionBootstrap";
import { RouteNavigationGuard } from "@/components/layout/RouteNavigationGuard";
import { BandwidthProvider } from "@/contexts/BandwidthContext";
import { ThemeContextProvider } from "@/contexts/ThemeContext";
import { MuiThemeProvider } from "@/theme/MuiThemeProvider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });
const michroma = Michroma({ weight: "400", subsets: ["latin"], variable: "--font-brand" });

export const metadata: Metadata = {
  metadataBase: new URL("https://shadecodestudent.vercel.app"),
  title: { default: "Shadecode Student", template: "%s — Shadecode Student" },
  description: "AI-powered learning platform for students. Study smarter. Live sharper.",
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
    description: "Study smarter. Live sharper. An AI-powered learning platform for students.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Shadecode Student — Study smarter. Live sharper." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shadecode Student",
    description: "Study smarter. Live sharper.",
    images: ["/og-image.png"],
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Shadecode Student" },
  icons: {
    icon: [
      { url: "/icons/favicon.png", type: "image/png", sizes: "32x32" },
      { url: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/brand/shadecode-app-icon.svg", type: "image/svg+xml", sizes: "any" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", type: "image/png", sizes: "180x180" },
      { url: "/apple-icon.svg", type: "image/svg+xml", sizes: "any" },
    ],
    other: [{ rel: "mask-icon", url: "/brand/shadecode-mark-white.svg", color: "#22D3EE" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#06111C",
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icons/favicon.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" sizes="180x180" />
        <meta name="theme-color" content="#06111C" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${michroma.variable} antialiased`}>
        <ThemeContextProvider>
          <MuiThemeProvider>
            <BandwidthProvider>
              <RouteNavigationGuard />
              {children}
              <OfflineShell />
              <ServiceWorkerRegistration />
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
