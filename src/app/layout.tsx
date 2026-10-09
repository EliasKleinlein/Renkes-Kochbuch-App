import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import RecipeBootstrap from "@/components/RecipeBootstrap";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import "./globals.css";
import "@fontsource/caveat";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "Renkes Kochbuch",
  title: {
    default: "Renkes Kochbuch",
    template: "%s | Renkes Kochbuch",
  },
  description: "Echte Rezepte, magischer Kochbuch-Humor und eine Prise Code.",
  appleWebApp: {
    capable: true,
    title: "Renkes Kochbuch",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <RecipeBootstrap />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
