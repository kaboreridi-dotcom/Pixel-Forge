import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pixel Forge — Offline Image Editor",
  description:
    "Pixel Forge is a 100% offline, browser-based professional image editor. Layers, filters, brushes, and export — no account, no server, no tracking.",
  keywords: [
    "image editor",
    "offline",
    "photo editor",
    "canvas",
    "layers",
    "filters",
    "open source",
  ],
  authors: [{ name: "Pixel Forge Contributors" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Pixel Forge — Offline Image Editor",
    description:
      "A professional, 100% offline image editor that runs entirely in your browser.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${jetbrains.variable} font-mono antialiased bg-background text-foreground overflow-hidden`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
