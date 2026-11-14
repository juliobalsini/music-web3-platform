import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { Abertura } from "@/components/abertura";
import { Cabecalho } from "@/components/cabecalho";
import { MiniPlayer } from "@/components/mini-player";
import { NavInferior } from "@/components/nav-inferior";
import { PlayerProvider } from "@/components/player-provider";
import { RegistrarSW } from "@/components/registrar-sw";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Base dos links absolutos (Open Graph). Na Vercel usa o domínio de produção; local, localhost.
const PRODUCAO = "https://radioon-ten.vercel.app";
const base = process.env.VERCEL ? PRODUCAO : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(base),
  title: "radioOn",
  description: "Música para os melhores ouvintes.",
};

export const viewport: Viewport = {
  themeColor: "#00112a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <RegistrarSW />
        <PlayerProvider>
          <Abertura />
          <Cabecalho />
          <div className="flex flex-1 flex-col pb-[calc(9.5rem+env(safe-area-inset-bottom))]">{children}</div>
          <MiniPlayer />
          <Suspense>
            <NavInferior />
          </Suspense>
        </PlayerProvider>
      </body>
    </html>
  );
}
