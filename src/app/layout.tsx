import type { Metadata, Viewport } from "next";
import { Oswald, Inter, IBM_Plex_Mono } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

const oswald = Oswald({ variable: "--font-oswald", subsets: ["latin"], weight: ["500", "600", "700"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "VCT Predicts",
  description: "Centro de seguimiento, análisis y predicción del Valorant Champions Tour.",
  appleWebApp: {
    capable: true,
    title: "VCT Predicts",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0e14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${oswald.variable} ${inter.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-bg text-text">
        <div className="md:flex">
          <Sidebar />
          <main className="flex-1 min-w-0 pb-16 md:pb-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
