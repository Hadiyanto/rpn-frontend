import type { Metadata, Viewport } from "next";
import { Archivo, Assistant, Space_Mono } from "next/font/google";
import "./globals.css";
import { BRAND_NAME } from '@/utils/brand';

// Type in the spirit of levainbakery.com, with free Google Fonts in place of its commercial ones:
// headings Archivo (≈ Platform), body Assistant, labels/prices Space Mono (≈ Pitch).
const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", weight: ["500", "600", "700", "800", "900"] });
const assistant = Assistant({ subsets: ["latin"], variable: "--font-assistant" });
const spaceMono = Space_Mono({ subsets: ["latin"], variable: "--font-space-mono", weight: ["400", "700"] });

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: "Business Login Portal",
  manifest: "/json/manifest.json",
  icons: {
    icon: "/icon.png",
    apple: "/images/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2D5A37",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${archivo.variable} ${assistant.variable} ${spaceMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
