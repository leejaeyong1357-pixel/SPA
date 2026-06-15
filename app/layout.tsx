import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Teczen SPA Trainer",
  description: "현대자동차그룹 SPA 영어시험 AI 학습 플랫폼",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
