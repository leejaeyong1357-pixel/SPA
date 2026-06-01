"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";

const STAGES = [
  { at: 0, text: "프로필 분석 중..." },
  { at: 18, text: "목표 등급에 맞는 문제 선별 중..." },
  { at: 38, text: "난이도 매트릭스 계산 중..." },
  { at: 56, text: "모범 답안 템플릿 준비 중..." },
  { at: 72, text: "AI 채점 기준 로드 중..." },
  { at: 88, text: "대시보드 구성 중..." },
];

const DURATION_MS = 16000;
const TICK_MS = 100;

export default function LoadingSetupPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [session, setSession] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const s = storage.getSession();
    const cfg = storage.getSettings();
    if (!s) {
      router.replace("/login");
      return;
    }
    setSession(s);
    setSettings(cfg);

    const startedAt = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const pct = Math.min(100, (elapsed / DURATION_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(id);
        setTimeout(() => {
          const cfg = storage.getSettings();
          router.replace(cfg.noticesAccepted ? "/dashboard" : "/notices");
        }, 400);
      }
    }, TICK_MS);

    return () => clearInterval(id);
  }, [router]);

  if (!session || !settings) return null;

  const currentStage = [...STAGES].reverse().find((s) => progress >= s.at) || STAGES[0];

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-blue-50 to-teczen-gray-50 p-6">
      <div className="max-w-md w-full text-center">
        <div className="font-brand text-3xl text-teczen-navy mb-1">SPEAKZEN</div>
        <div className="text-xs text-teczen-gray-500 mb-12">by TECZEN</div>

        <h1 className="text-2xl font-black text-teczen-ink mb-3 leading-tight">
          <span className="text-teczen-blue">{session.name}</span>님께
          <br />
          맞춤 커스터마이징 중
        </h1>
        <p className="text-sm text-teczen-gray-600 mb-10">
          목표 Lv {settings.targetLevel} 학습 환경을 준비하고 있습니다.
        </p>

        <div className="relative mb-3">
          <div className="w-full h-3 bg-teczen-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teczen-blue to-teczen-navy transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm mb-8">
          <span className="text-teczen-gray-600">{currentStage.text}</span>
          <span className="font-mono font-bold text-teczen-blue">
            {Math.floor(progress)}%
          </span>
        </div>

        <div className="text-xs text-teczen-gray-400">
          약 {Math.max(0, Math.ceil((DURATION_MS - (progress / 100) * DURATION_MS) / 1000))}초 남음
        </div>
      </div>
    </main>
  );
}
