import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/nav/BottomNav";
import ServiceWorkerRegistrar from "@/components/shared/ServiceWorkerRegistrar";
import CommandPalette from "@/components/ui/CommandPalette";

export const metadata = {
  title: "Shadecode Student",
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
  metadataBase: new URL("https://shadecodestudent.vercel.app"),
  openGraph: {
    title: "Shadecode Student",
    description:
      "AI-powered learning platform for students.",
    url: "https://shadecodestudent.vercel.app",
    siteName: "Shadecode Student",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
         <ServiceWorkerRegistrar />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <CommandPalette />
        <ServiceWorkerRegistrar />
        <style>{`
          .main-content {
            max-width: 100%;
            min-height: 100vh;
            padding-bottom: 80px;
          }

          @media (min-width: 900px) {
            .main-content {
              margin-left: 220px;
              margin-right: 280px;
              padding-bottom: 24px;
              max-width: calc(100% - 500px);
            }
          }
        `}</style>
        <main className="main-content">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
