import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/nav/BottomNav";

export const metadata: Metadata = {
  title: "Shadecode Student",
  description: "Study smarter. Live sharper.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
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