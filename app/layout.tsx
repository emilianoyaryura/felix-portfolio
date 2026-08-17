import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { artist } from "./data/artist";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif-display",
  weight: "400",
  subsets: ["latin"],
});

const description = `Photography by ${artist.name}. ${artist.role} based in ${artist.location}.`;

export const metadata: Metadata = {
  // Dominio de prod del sitio — ajustar si el custom domain del Worker es otro.
  metadataBase: new URL("https://felixgomezroca.com"),
  title: `${artist.name} — ${artist.role}`,
  description,
  keywords: [
    "photography",
    "photographer",
    artist.name,
    artist.location,
    "portfolio",
  ],
  authors: [{ name: artist.name }],
  creator: artist.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: artist.name,
    title: `${artist.name} — ${artist.role}`,
    description,
    images: [
      {
        url: "/og/og.png",
        width: 1200,
        height: 630,
        alt: `${artist.name} — ${artist.role}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${artist.name} — ${artist.role}`,
    description: `Photography by ${artist.name}.`,
    creator: `@${artist.instagram}`,
    images: ["/og/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
