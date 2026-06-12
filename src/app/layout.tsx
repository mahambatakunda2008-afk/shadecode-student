// src/app/layout.tsx
//
// Root layout — wraps the entire Next.js app.
// Keep this as minimal as possible.
// All auth/sidebar/provider logic lives in route group layouts:
//   - (public)/layout.tsx → landing, auth pages
//   - (app)/layout.tsx    → authenticated app pages

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import OfflineShell from "@/components/OfflineShell";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://shadecodestudent.vercel.app"),
  title: {
    default: "Shadecode Student",
    template: "%s — Shadecode Student",
  },
  description:
    "AI-powered learning platform for students. Learn Computer Science, Mathematics, and more with interactive AI tools.",
  keywords: [
    "Shadecode Student",
    "AI learning platform",
    "Computer Science",
    "A Level",
    "AS Level",
    "Zimbabwe students",
    "education",
  ],
  authors: [{ name: "Shadecode" }],
  creator: "Shadecode",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://shadecodestudent.vercel.app",
    siteName: "Shadecode Student",
    title: "Shadecode Student",
    description: "AI-powered learning platform for students.",
  },
  twitter: {
    card: "summary",
    title: "Shadecode Student",
    description: "AI-powered learning platform for students.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <OfflineShell />
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
