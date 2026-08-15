// src/app/layout.tsx
// Root layout — wraps the entire Next.js app.

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import OfflineShell from "@/components/OfflineShell";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { BandwidthProvider } from "@/contexts/BandwidthContext";
import { ThemeContextProvider } from "@/contexts/ThemeContext";
import { MuiThemeProvider } from "@/theme/MuiThemeProvider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL("https://shadecodestudent.vercel.app"),
  title: { default: "Shadecode Student", template: "%s — Shadecode Student" },
  description: "AI-powered learning platform for students. Learn Computer Science, Mathematics, and more with interactive AI tools.",
  keywords: ["Shadecode Student", "AI learning platform", "Computer Science", "A Level", "AS Level", "Zimbabwe students", "education"],
  authors: [{ name: "Shadecode" }],
  creator: "Shadecode",
  openGraph: { type: "website", locale: "en_US", url: "https://shadecodestudent.vercel.app", siteName: "Shadecode Student", title: "Shadecode Student", description: "AI-powered learning platform for students.", images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Shadecode Student — AI-powered learning platform" }] },
  twitter: { card: "summary_large_image", title: "Shadecode Student", description: "AI-powered learning platform for students.", images: ["/og-image.png"] },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/brand/shadecode-mark.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/brand/shadecode-app-icon.svg", type: "image/svg+xml", sizes: "256x256" },
    ],
    apple: [{ url: "/brand/shadecode-app-icon.svg", type: "image/svg+xml", sizes: "256x256" }],
  },
};

export const viewport: Viewport = { themeColor: "#2563EB", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <ThemeContextProvider>
          <MuiThemeProvider>
            <BandwidthProvider>
              {children}
              <OfflineShell />
              <PWAInstallPrompt />
              <Analytics />
              <SpeedInsights />
            </BandwidthProvider>
          </MuiThemeProvider>
        </ThemeContextProvider>
      </body>
    </html>
  );
}
