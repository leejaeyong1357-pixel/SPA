"use client";

import { useState } from "react";

const STAGES = [
  {
    num: 1,
    title: "SPEAKZEN 6.2 탄생",
    desc: "사내 최초 AI 기반 SPA 학습 웹앱 출시",
    emoji: "🎉",
  },
  {
    num: 2,
    title: "SPA 시험 진행 & 사용률 분석",
    desc: "임직원 학습 데이터로 정식 도입 수요 검증",
    emoji: "📊",
  },
  {
    num: 3,
    title: "모바일 앱으로 제작",
    desc: "iOS / Android 네이티브 앱 출시",
    emoji: "📱",
  },
  {
    num: 4,
    title: "그룹사 최초 AI 커스터마이징 SPA 웹앱",
    desc: "개인 맞춤 학습 · 등급별 모범답안",
    emoji: "🏆",
  },
  {
    num: 5,
    title: "임직원 글로벌 역량 향상",
    desc: "Global readiness up — 우리의 최종 목표",
    emoji: "🌏",
  },
];

const CURRENT = 1;

export default function Roadmap() {
  const [hovered, setHovered] = useState<number | null>(null);
  const focus = hovered ?? CURRENT;
  const focusStage = STAGES.find((s) => s.num === focus)!;

  return (
    <div className="bg-gradient-to-br from-teczen-navy via-[#0a2540] to-teczen-ink rounded-3xl p-6 md:p-8 my-6 relative overflow-hidden border border-white/5">
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-teczen-blue/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-teczen-red/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
          <div>
            <div className="text-[10px] font-bold tracking-[0.2em] text-blue-300 mb-1">
              SPEAKZEN ROADMAP
            </div>
            <h3 className="text-xl md:text-2xl font-black text-white">우리의 여정</h3>
          </div>
          <div className="text-xs text-blue-200">
            현재 <b className="text-teczen-red">STAGE {CURRENT}</b> · 5개 단계
          </div>
        </div>

        <div className="relative h-28 md:h-32 mt-6 mb-4">
          <svg
            viewBox="0 0 800 100"
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="rmActive" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#FF6B35" />
                <stop offset="100%" stopColor="#FFB073" />
              </linearGradient>
            </defs>
            <path
              d="M 30 50 Q 130 10 230 50 T 430 50 T 630 50 T 770 50"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="3"
              strokeDasharray="6 6"
              fill="none"
            />
            <path
              d="M 30 50 Q 80 30 130 45"
              stroke="url(#rmActive)"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
          </svg>

          <div className="absolute inset-0 flex items-center justify-between px-3">
            <span className="text-2xl md:text-3xl drop-shadow-lg" title="시작">
              🚩
            </span>
            {STAGES.map((s) => {
              const isActive = s.num === CURRENT;
              const isFocused = s.num === focus;
              return (
                <button
                  key={s.num}
                  onMouseEnter={() => setHovered(s.num)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setHovered(s.num)}
                  className={`relative w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center font-black text-sm transition-all ${
                    isActive
                      ? "bg-teczen-red text-white ring-4 ring-teczen-red/40 scale-110 shadow-lg shadow-teczen-red/50"
                      : isFocused
                      ? "bg-white text-teczen-navy ring-2 ring-white/60 scale-105"
                      : "bg-white/15 text-white/80 hover:bg-white/25"
                  }`}
                >
                  {s.num}
                  {isActive && (
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-bold text-teczen-red bg-white px-2 py-0.5 rounded-full whitespace-nowrap shadow-md">
                      현재
                    </span>
                  )}
                </button>
              );
            })}
            <span className="text-2xl md:text-3xl drop-shadow-lg" title="목표">
              🏁
            </span>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4 transition-all">
          <div className="flex items-start gap-3">
            <div className="text-3xl shrink-0">{focusStage.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                <span className="text-[10px] font-bold tracking-wider text-blue-300">
                  STAGE {focusStage.num}
                </span>
                {focusStage.num === CURRENT && (
                  <span className="text-[10px] font-bold text-teczen-red bg-white/95 px-2 py-0.5 rounded-full">
                    NOW
                  </span>
                )}
              </div>
              <div className="text-white font-bold text-sm md:text-base leading-snug">
                {focusStage.title}
              </div>
              <div className="text-blue-200 text-xs mt-1">{focusStage.desc}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
