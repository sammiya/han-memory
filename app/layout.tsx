import "./globals.css";
import { Noto_Sans_JP, Noto_Sans_KR } from "next/font/google";
import type { Metadata } from "next";

// ① 日本語用フォントを読み込み
const notoSansJP = Noto_Sans_JP({
  weight: ["400", "700"],
  variable: "--font-noto-sans-jp",
});

// ② 韓国語用フォントを読み込み
const notoSansKR = Noto_Sans_KR({
  weight: ["400", "700"],
  variable: "--font-noto-sans-kr",
});

export const metadata: Metadata = {
  title: "韓国語学習アプリ",
  description: "韓国語の学習アプリです。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} ${notoSansKR.variable}`}>
      <body>{children}</body>
    </html>
  );
}
