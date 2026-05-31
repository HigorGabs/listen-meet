import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const materialSymbolNames = [
  "article",
  "audio_file",
  "autorenew",
  "bar_chart",
  "calendar_month",
  "category",
  "check",
  "check_circle",
  "chevron_right",
  "circle",
  "close",
  "cloud_upload",
  "dark_mode",
  "delete",
  "description",
  "dns",
  "download",
  "error",
  "expand_less",
  "expand_more",
  "filter_list",
  "graphic_eq",
  "group",
  "groups",
  "hard_drive",
  "headphones",
  "help",
  "info",
  "key",
  "light_mode",
  "mic",
  "monitor",
  "more_vert",
  "open_in_new",
  "pause",
  "person",
  "play_arrow",
  "play_circle",
  "progress_activity",
  "psychology",
  "radio_button_checked",
  "route",
  "schedule",
  "search",
  "sell",
  "settings",
  "smart_toy",
  "stop",
  "subtitles",
  "sync",
  "timeline",
  "timer",
  "tune",
  "upload",
  "verified_user",
].join(",");

const materialSymbolsHref = `https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300..700,0..1,-25..200&icon_names=${materialSymbolNames}&display=block`;

export const metadata: Metadata = {
  title: "Listen Meet - Transcreva e processe suas reuniões",
  description: "Aplicação para transcrever e processar reuniões com IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={materialSymbolsHref} />
      </head>
      <body className={`${roboto.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
