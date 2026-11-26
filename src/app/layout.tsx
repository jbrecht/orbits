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
  title: "Helical Trajectories — Planetary Orbits as the Sun Moves",
  description:
    "An interactive 3D view of the planets' orbits drawn as helices, traced as the Sun moves through the galaxy.",
};

export const viewport: Viewport = {
  themeColor: "#050811",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
