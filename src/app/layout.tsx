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
      <body>
        <main className="max-w-md mx-auto min-h-screen pb-20">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}