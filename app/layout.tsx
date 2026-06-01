import "./globals.css";
import type { Metadata } from "next";
import MobileGuard from "@/components/layout/MobileGuard";

export const metadata: Metadata = {
  title: "Teczen SPA Trainer",
  description: "현대자동차그룹 SPA 영어시험 AI 학습 플랫폼",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        {children}
        <MobileGuard />
      </body>
    </html>
  );
}
