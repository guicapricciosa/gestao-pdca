import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";

import { getBranding } from "@/platform/pwa/branding";
import { PwaRegistration } from "@/ui/components/pwa-registration";

import "./globals.css";

const branding = getBranding();

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: branding.name,
  description: branding.description,
  manifest: "/manifest.webmanifest",
  applicationName: branding.name,
  appleWebApp: {
    capable: true,
    title: branding.shortName,
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: branding.themeColor,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt" className={geist.variable}>
      <body className="font-sans antialiased">
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}
