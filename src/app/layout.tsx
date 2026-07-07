import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { AuthGate } from "@/components/AuthGate";
import { Footer } from "@/components/Footer";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "장평 문제해결연구소",
  description: "장평중학교 하트이로봇 동아리 바이브 코딩 수업 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        <AuthGate>{children}</AuthGate>
        <Footer />
      </body>
    </html>
  );
}
