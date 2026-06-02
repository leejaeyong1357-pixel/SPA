"use client";

import { useEffect, useState } from "react";
import Flame from "@/components/Flame";

const STAGES = [
  {
    num: 1,
    date: "2026.6.2",
    title: "그룹사 최초 SPA AI SPEAKZEN 탄생!",
    emoji: "🎉",
  },
  {
    num: 2,
    date: "2026.7",
    title: "SPA 시험 진행 및 사용률 분석",
    emoji: "📊",
  },
  {
    num: 3,
    date: "2026.8",
    title: "모바일 앱 정식 개발",
    emoji: "📱",
  },
  {
    num: 4,
    date: "2026.10",
    title: "개인맞춤형 AI 영어 비서 제작",
    emoji: "🤖",
  },
  {
    num: 5,
    date: "최종 목표",
    title: "임직원 글로벌 역량 향상",
    emoji: "🏆",
  },
];

const STEP_PX = 64; // stage 사이 세로 간격

export default function Roadmap() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((s) => (s + 1) % STAGES.length);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-gradient-to-br from-orange-50 via-white to-blue-50 rounded-3xl p-5 md:p-6 border border-teczen-blue/15 shadow-sm relative overflow-hidden h-full">
      <div className="absolute -top-12 -right-10 w-32 h-32 bg-teczen-red/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-10 w-32 h-32 bg-teczen-blue/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="text-[10px] font-bold tracking-[0.2em] text-teczen-blue mb-1">
          SPEAKZEN ROADMAP
        </div>
        <h3 className="font-black text-teczen-ink text-lg md:text-xl mb-5">
          우리의 여정 🚀
        </h3>

        <div className="relative pl-3">
          {/* 세로 연결선 */}
          <div className="absolute left-[19px] top-3 bottom-3 w-[3px] bg-gradient-to-b from-teczen-red/40 via-teczen-blue/30 to-teczen-blue/10 rounded-full" />

          {/* 단계들 */}
          {STAGES.map((s, i) => {
            const isActive = i === active;
            return (
              <div
                key={s.num}
                className="flex items-start gap-3 relative"
                style={{ height: STEP_PX }}
              >
                <div
                  className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shrink-0 transition-all duration-500 ${
                    isActive
                      ? "bg-teczen-red text-white scale-110 shadow-lg shadow-teczen-red/40"
                      : "bg-white border-2 border-teczen-blue/40 text-teczen-blue"
                  }`}
                >
                  {s.num}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div
                    className={`text-[10px] font-black tracking-wider transition-colors ${
                      isActive ? "text-teczen-red" : "text-teczen-blue/70"
                    }`}
                  >
                    {s.date}
                  </div>
                  <div
                    className={`text-[13px] font-bold leading-snug transition-colors ${
                      isActive ? "text-teczen-ink" : "text-teczen-gray-700"
                    }`}
                  >
                    {s.title}
                  </div>
                </div>
              </div>
            );
          })}

          {/* 움직이는 불꽃 캐릭터 — 숫자 버튼 위에 떠 보이도록 z-30 */}
          <div
            className="absolute left-[-6px] z-30 pointer-events-none transition-all duration-700 ease-in-out drop-shadow-lg"
            style={{ top: `${active * STEP_PX - 18}px` }}
          >
            <div className="flame-bobble">
              <Flame level={5} color="#FF6B35" size={56} />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes bobble {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-4px) rotate(2deg); }
        }
        :global(.flame-bobble) {
          animation: bobble 1.1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
