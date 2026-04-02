import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AppLayoutClient } from "@/components/app-layout-client";
import "./globals.css";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: { default: "Juxa Sign", template: "%s | Juxa Sign" },
  description: "Gestión de firmas electrónicas con DIGID México.",
  icons: { icon: "/favicon.svg" },
};

/** Evita que `next build` ejecute Prisma contra DB inexistente durante el prerender estático. */
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${fontSans.variable} font-sans`}>
        <AppLayoutClient>{children}</AppLayoutClient>
      </body>
    </html>
  );
}
