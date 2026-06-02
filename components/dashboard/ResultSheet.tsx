"use client";

import type { Level } from "@/types";

export interface ResultSheetData {
  name: string;
  team?: string;
  date?: string;
  totalScore: number;
  level: Level;
  criteria: {
    pronunciation: number;
    listening: number;
    vocabulary: number;
    grammar: number;
    fluency: number;
  };
}

const AREAS = [
  { key: "pronunciation", label: "발음", max: 12, desc: "Pronunciation · 억양·강세·속도" },
  { key: "listening", label: "청취·답변", max: 36, desc: "Listening & Response · 이해·요약·관련성" },
  { key: "vocabulary", label: "어휘", max: 12, desc: "Vocabulary · 정확도·고급 표현" },
  { key: "grammar", label: "문법", max: 24, desc: "Grammar · 시제·구문·연결사" },
  { key: "fluency", label: "유창성", max: 12, desc: "Fluency · 논리 흐름·자유로운 표현" },
] as const;

function recommendation(lv: Level) {
  if (lv <= 2) {
    return {
      pronunciation: "발음 기초 — 단어 단위 강세부터",
      structure: "기초 회화 패턴 (자기소개·일상)",
      fluency: "한 문장 완성 → 2~3문장 연결",
    };
  }
  if (lv <= 4) {
    return {
      pronunciation: "강세·억양 — 의문문/서술문 패턴",
      structure: "이유 + 근거 1개로 답변 확장",
      fluency: "30초 이상 발화 (connector 도입)",
    };
  }
  if (lv <= 6) {
    return {
      pronunciation: "자연스러운 연음(linking)·약화",
      structure: "PREP/STAR 구조화된 답변",
      fluency: "1분 길이 + 비즈니스 어휘 결합",
    };
  }
  return {
    pronunciation: "원어민 수준 — 감정·뉘앙스 표현",
    structure: "복잡한 논리(반박/양보) 구조",
    fluency: "비격식·격식 자유로운 전환",
  };
}

export default function ResultSheet({ data }: { data: ResultSheetData }) {
  const rec = recommendation(data.level);
  const areas = AREAS.map((a) => {
    const raw = Math.max(0, Math.min(a.max, (data.criteria as any)[a.key] ?? 0));
    return { ...a, raw, pct: Math.round((raw / a.max) * 100) };
  });

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 border border-teczen-gray-200 shadow-lg">
      <div className="text-center mb-6">
        <div className="text-xs font-bold tracking-[0.25em] text-teczen-blue mb-1">
          SPEAKZEN OFFICIAL REPORT
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-teczen-ink">
          <span className="text-teczen-blue">SPA</span> 진단 결과지
        </h2>
        {data.date && (
          <div className="text-xs text-teczen-gray-500 mt-1">발급일 {data.date}</div>
        )}
      </div>

      {/* 상단: 응시자 + 총점 */}
      <div className="grid md:grid-cols-2 gap-3 mb-6">
        <div className="bg-teczen-blue/5 border border-teczen-blue/20 rounded-2xl p-5 text-center">
          <div className="text-[10px] font-bold text-teczen-blue tracking-widest mb-2">응시자 정보</div>
          <div className="text-4xl font-black text-teczen-navy mb-1">Lv {data.level}</div>
          <div className="text-sm font-bold text-teczen-ink">{data.name}</div>
          {data.team && <div className="text-xs text-teczen-gray-500 mt-0.5">{data.team}</div>}
        </div>

        <div className="bg-teczen-blue/5 border border-teczen-blue/20 rounded-2xl p-5 text-center flex flex-col justify-center">
          <div className="text-[10px] font-bold text-teczen-blue tracking-widest mb-1">SPA 종합 점수</div>
          <div className="text-5xl font-black text-teczen-blue leading-none">
            {data.totalScore}
            <span className="text-lg text-teczen-gray-400 font-bold"> / 96</span>
          </div>
          <div className="w-full bg-teczen-gray-100 rounded-full h-2 overflow-hidden mt-3">
            <div
              className="bg-gradient-to-r from-teczen-blue to-teczen-navy h-2"
              style={{ width: `${(data.totalScore / 96) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 영역별 점수 (SPA 96점 만점 분배) */}
      <div className="mb-6">
        <h3 className="font-black text-teczen-ink text-base mb-1">📊 SPA 평가 영역별 점수</h3>
        <p className="text-xs text-teczen-gray-500 mb-4">
          현대차그룹 공식 SPA 채점 기준 · 영역별 만점이 다릅니다 (합계 96점)
        </p>
        <div className="space-y-3">
          {areas.map((a) => {
            const color =
              a.pct >= 75
                ? "bg-green-500"
                : a.pct >= 50
                ? "bg-teczen-blue"
                : a.pct >= 25
                ? "bg-amber-500"
                : "bg-teczen-red";
            return (
              <div key={a.key}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-sm font-bold text-teczen-ink">{a.label}</span>
                    <span className="text-[11px] text-teczen-gray-500 ml-2">{a.desc}</span>
                  </div>
                  <span className="text-sm font-black tabular-nums">
                    <span className="text-teczen-blue">{a.raw}</span>
                    <span className="text-teczen-gray-400"> / {a.max}</span>
                  </span>
                </div>
                <div className="w-full bg-teczen-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`${color} h-3 rounded-full transition-all`}
                    style={{ width: `${Math.max(2, a.pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
          <div className="border-t border-teczen-gray-200 pt-3 mt-3 flex items-center justify-between">
            <span className="text-sm font-bold text-teczen-ink">총점</span>
            <span className="text-xl font-black text-teczen-navy">
              {data.totalScore} <span className="text-sm text-teczen-gray-500">/ 96</span>
            </span>
          </div>
        </div>
      </div>

      {/* 추천 학습 단계 */}
      <div>
        <h3 className="font-black text-teczen-ink text-base mb-3">📚 맞춤 학습 추천</h3>
        <div className="grid md:grid-cols-3 gap-3">
          <RecCard color="blue" title="발음 강화" body={rec.pronunciation} />
          <RecCard color="navy" title="구조 강화" body={rec.structure} />
          <RecCard color="red" title="유창성 강화" body={rec.fluency} />
        </div>
      </div>

      <p className="text-[11px] text-teczen-gray-500 leading-relaxed mt-5 pt-4 border-t border-teczen-gray-100">
        ※ 본 결과지는 SPA 채점 기준(발음 12 · 청취·답변 36 · 어휘 12 · 문법 24 · 유창성 12 = 96점)에
        따른 AI 진단 결과입니다. 학습 방향 가이드 목적으로 제공됩니다.
      </p>
    </div>
  );
}

function RecCard({
  color,
  title,
  body,
}: {
  color: "blue" | "navy" | "red";
  title: string;
  body: string;
}) {
  const ring =
    color === "blue"
      ? "border-l-teczen-blue bg-teczen-blue/5"
      : color === "navy"
      ? "border-l-teczen-navy bg-teczen-navy/5"
      : "border-l-teczen-red bg-teczen-red/5";
  const text =
    color === "blue"
      ? "text-teczen-blue"
      : color === "navy"
      ? "text-teczen-navy"
      : "text-teczen-red";
  return (
    <div className={`border-l-4 rounded-xl px-4 py-3 ${ring}`}>
      <div className={`text-xs font-black tracking-wider ${text} mb-1`}>{title}</div>
      <div className="text-sm text-teczen-ink font-semibold leading-snug">{body}</div>
    </div>
  );
}
