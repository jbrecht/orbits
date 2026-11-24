import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Earth’s Helical Orbit — 3D Geometric Visualization",
  description:
    "An interactive 3D view of Earth's orbit as a helix, traced as the Sun moves through the galaxy, with the Moon and the other planets.",
};

export const viewport: Viewport = {
  themeColor: "#050811",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
