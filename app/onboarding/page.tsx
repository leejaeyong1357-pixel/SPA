"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { pushUserToServer } from "@/lib/userSync";
import Button from "@/components/ui/Button";

const SECTIONS = [
  {
    badge: "SPA 시험이란?",
    title: "Speaking Proficiency Assessment",
    body: (
      <>
        <p className="text-teczen-gray-700 leading-relaxed">
          현대자동차그룹 임직원의 영어 말하기 능력을 평가하는 사내 표준 시험.
          <br />
          승진, 해외 주재원 선발, 글로벌 직무 배치의 기준이 됩니다.
        </p>
        <div className="mt-4 p-4 bg-teczen-red/5 border border-teczen-red/20 rounded-xl">
          <div className="font-bold text-teczen-red mb-1">⚠ 2026년부터 달라진 점</div>
          <div className="text-sm text-teczen-gray-800">
            <span className="line-through text-teczen-gray-500">실시간 대면 평가</span> →{" "}
            <span className="font-bold">실시간 비대면 화상 시험</span>
            <br />
            카메라/마이크 환경에서 즉석으로 답변. 화면에 차트·사진이 나오면 묘사.
          </div>
        </div>
      </>
    ),
  },
  {
    badge: "출제 유형",
    title: "4가지 유형 · 약 13분",
    body: (
      <div className="space-y-3">
        {[
          {
            n: 1,
            name: "Business Casual",
            desc: "일상·개인 관련 Q&A (취미, 주말, 출퇴근 등)",
            time: "약 3분",
          },
          {
            n: 2,
            name: "Opinion",
            desc: "사회/비즈니스 이슈에 대한 의견 + 근거 제시",
            time: "약 3분",
          },
          {
            n: 3,
            name: "Visual Description",
            desc: "차트·그래프·사진을 보고 분석/묘사",
            time: "약 3분",
          },
          {
            n: 4,
            name: "Passage Summary",
            desc: "60초 지문을 듣고 1분 안에 요약",
            time: "약 4분",
          },
        ].map((t) => (
          <div key={t.n} className="flex items-start gap-3 p-3 bg-teczen-gray-50 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-teczen-navy text-white font-bold flex items-center justify-center shrink-0">
              {t.n}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-teczen-ink">{t.name}</span>
                <span className="text-xs text-teczen-gray-500">{t.time}</span>
              </div>
              <p className="text-sm text-teczen-gray-700 mt-0.5">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    badge: "등급 체계",
    title: "8등급 · 96점 만점",
    body: (
      <div className="space-y-2">
        {[
          ["Lv 1", "0~15점", "기초 입문", "bg-teczen-gray-100"],
          ["Lv 2", "16~24점", "기본 의사소통 시작", "bg-teczen-gray-100"],
          ["Lv 3", "25~34점", "단순 일상 표현", "bg-teczen-gray-100"],
          ["Lv 4", "35~49점", "기본 비즈니스 표현", "bg-blue-50"],
          ["Lv 5", "50~64점", "기본 비즈니스 의사소통", "bg-blue-50"],
          ["Lv 6", "65~74점", "해외 주재원 최소 기준", "bg-blue-100"],
          ["Lv 7", "75~84점", "유창한 업무 영어 (승진 우대)", "bg-blue-200"],
          ["Lv 8", "85~96점", "원어민 수준 비즈니스 영어", "bg-blue-300"],
        ].map(([lv, range, desc, bg]) => (
          <div key={lv} className={`flex items-center gap-3 p-2.5 rounded-lg ${bg}`}>
            <div className="font-bold text-teczen-navy w-12">{lv}</div>
            <div className="text-sm font-mono text-teczen-gray-700 w-24">{range}</div>
            <div className="text-sm text-teczen-gray-800 flex-1">{desc}</div>
          </div>
        ))}
      </div>
    ),
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!storage.isLoggedIn()) {
      router.replace("/login");
      return;
    }
    setMounted(true);
  }, [router]);

  if (!mounted) return null;

  const isLast = idx === SECTIONS.length - 1;
  const section = SECTIONS[idx];

  const finish = (skipForever: boolean) => {
    const settings = storage.getSettings();
    storage.saveSettings({
      ...settings,
      onboardingSeen: true,
      onboardingSkipForever: skipForever,
    });
    pushUserToServer();
    if (!settings.setupCompleted) {
      router.push("/setup");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-white to-blue-50">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-6">
          <div className="font-brand text-2xl text-teczen-navy mb-1">SPEAKZEN</div>
          <div className="text-sm text-teczen-gray-500">시작하기 전에 꼭 확인하세요</div>
        </div>

        <div className="bg-white rounded-3xl border border-teczen-gray-200 shadow-lg p-8 mb-4">
          <div className="flex items-center gap-2 mb-2">
            {SECTIONS.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i === idx ? "w-8 bg-teczen-navy" : i < idx ? "w-4 bg-teczen-navy/30" : "w-4 bg-teczen-gray-200"
                }`}
              />
            ))}
            <span className="ml-auto text-xs text-teczen-gray-500">{idx + 1} / {SECTIONS.length}</span>
          </div>

          <div className="text-xs font-bold text-teczen-red mb-1">{section.badge}</div>
          <h2 className="text-2xl font-bold text-teczen-ink mb-4">{section.title}</h2>
          <div>{section.body}</div>

          <div className="mt-8 flex items-center justify-between gap-3">
            {idx > 0 ? (
              <Button onClick={() => setIdx(idx - 1)} variant="ghost">← 이전</Button>
            ) : (
              <div />
            )}
            {isLast ? (
              <div className="flex gap-2">
                <Button onClick={() => finish(true)} variant="outline" size="sm">
                  다시 보지 않기
                </Button>
                <Button onClick={() => finish(false)}>확인했습니다 →</Button>
              </div>
            ) : (
              <Button onClick={() => setIdx(idx + 1)}>다음 →</Button>
            )}
          </div>
        </div>

        <div className="text-center text-xs text-teczen-gray-500">
          나중에 설정 메뉴에서 다시 볼 수 있습니다.
        </div>
      </div>
    </main>
  );
}
