import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Manrope } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: "500",
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Defense Watch",
  description:
    "America's defense manufacturing readiness platform — ranking, mapping, and monitoring the companies that build America's weapons systems.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${plexMono.variable} ${manrope.variable}`}
    >
      <body className="min-h-screen flex flex-col font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
