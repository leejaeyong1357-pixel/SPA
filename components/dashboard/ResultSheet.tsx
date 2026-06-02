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

// SPA Lv → 글로벌 시험 환산 (보수적 추정치, 참고용)
function levelEquivalents(lv: Level) {
  const m: Record<
    Level,
    { cefr: string; toeicSpeaking: string; opic: string; ielts: string; toefl: string; cambridge: string }
  > = {
    1: { cefr: "A1", toeicSpeaking: "30~60", opic: "NL", ielts: "2.0~3.0", toefl: "0~9", cambridge: "Pre-A1" },
    2: { cefr: "A1+", toeicSpeaking: "60~90", opic: "NM", ielts: "3.0~4.0", toefl: "10~16", cambridge: "A1" },
    3: { cefr: "A2", toeicSpeaking: "90~110", opic: "IM1", ielts: "4.0~4.5", toefl: "17~21", cambridge: "A2 (KET)" },
    4: { cefr: "A2+", toeicSpeaking: "110~130", opic: "IM2", ielts: "4.5~5.0", toefl: "20~22", cambridge: "A2+" },
    5: { cefr: "B1", toeicSpeaking: "130~150", opic: "IM3", ielts: "5.0~5.5", toefl: "20~22", cambridge: "B1 (PET)" },
    6: { cefr: "B1+", toeicSpeaking: "150~170", opic: "IH", ielts: "5.5~6.0", toefl: "23~25", cambridge: "B1+" },
    7: { cefr: "B2", toeicSpeaking: "170~190", opic: "AL", ielts: "6.0~6.5", toefl: "23~25", cambridge: "B2 (FCE)" },
    8: { cefr: "C1", toeicSpeaking: "190~200", opic: "AL+", ielts: "6.5~7.5", toefl: "26~30", cambridge: "C1 (CAE)" },
  };
  return m[lv];
}

function recommendation(lv: Level) {
  if (lv <= 2) {
    return {
      pronunciation: "발음 기초 — 알파벳/단어 단위 강세부터",
      structure: "기초 회화 패턴 (자기소개·일상)",
      fluency: "한 문장 완성 연습 → 2~3문장 연결",
    };
  }
  if (lv <= 4) {
    return {
      pronunciation: "강세·억양 — 의문문/서술문 패턴",
      structure: "이유 + 근거 1개로 답변 확장",
      fluency: "30초 이상 발화 유지 (connector 도입)",
    };
  }
  if (lv <= 6) {
    return {
      pronunciation: "자연스러운 연음(linking)·약화",
      structure: "PREP/STAR 등 구조화된 답변",
      fluency: "1분 길이 + 비즈니스 어휘 결합",
    };
  }
  return {
    pronunciation: "원어민 수준 — 감정·뉘앙스 표현",
    structure: "복잡한 논리(반박/양보) 구조 활용",
    fluency: "비격식·격식 자유로운 전환",
  };
}

export default function ResultSheet({ data }: { data: ResultSheetData }) {
  const eq = levelEquivalents(data.level);
  const rec = recommendation(data.level);

  const areas = [
    { label: "발음", pct: Math.round((data.criteria.pronunciation / 12) * 100) },
    { label: "청취·답변", pct: Math.round((data.criteria.listening / 36) * 100) },
    { label: "어휘", pct: Math.round((data.criteria.vocabulary / 12) * 100) },
    { label: "문법", pct: Math.round((data.criteria.grammar / 24) * 100) },
    { label: "유창성", pct: Math.round((data.criteria.fluency / 12) * 100) },
  ];
  const maxPct = Math.max(...areas.map((a) => a.pct), 1);

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

      {/* 상단 3분할 */}
      <div className="grid md:grid-cols-3 gap-3 mb-6">
        <div className="bg-teczen-blue/5 border border-teczen-blue/20 rounded-2xl p-5 text-center">
          <div className="text-[10px] font-bold text-teczen-blue tracking-widest mb-2">응시자 정보</div>
          <div className="text-4xl font-black text-teczen-navy mb-1">Lv {data.level}</div>
          <div className="text-sm font-bold text-teczen-ink">{data.name}</div>
          {data.team && <div className="text-xs text-teczen-gray-500 mt-0.5">{data.team}</div>}
        </div>

        <div className="bg-teczen-blue/5 border border-teczen-blue/20 rounded-2xl p-5 text-center">
          <div className="text-[10px] font-bold text-teczen-blue tracking-widest mb-2">SPA 점수</div>
          <div className="text-4xl font-black text-teczen-blue mb-1">{data.totalScore}</div>
          <div className="text-xs text-teczen-gray-500 mb-2">/ 96점</div>
          <div className="text-[10px] font-bold text-teczen-blue tracking-widest">CEFR 등급</div>
          <div className="text-xl font-bold text-teczen-navy">{eq.cefr}</div>
        </div>

        <div className="bg-teczen-blue/5 border border-teczen-blue/20 rounded-2xl p-4">
          <div className="text-[10px] font-bold text-teczen-blue tracking-widest mb-3 text-center">
            영역별 점수 (100점 만점)
          </div>
          <div className="flex items-end justify-between gap-1.5 h-28">
            {areas.map((a) => (
              <div key={a.label} className="flex-1 flex flex-col items-center justify-end h-full">
                <div className="text-[10px] font-black text-teczen-navy mb-0.5">{a.pct}</div>
                <div
                  className="w-full bg-teczen-blue rounded-t transition-all"
                  style={{ height: `${(a.pct / maxPct) * 75}%`, minHeight: "4px" }}
                />
                <div className="text-[9px] text-teczen-gray-700 mt-1 leading-none text-center">
                  {a.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 추천 학습 단계 */}
      <div className="mb-6">
        <h3 className="font-black text-teczen-ink text-base mb-3">
          📚 결과 점수 및 추천 학습 단계
        </h3>
        <div className="grid md:grid-cols-3 gap-3">
          <RecCard color="blue" title="발음 강화" body={rec.pronunciation} />
          <RecCard color="navy" title="구조 강화" body={rec.structure} />
          <RecCard color="red" title="유창성 강화" body={rec.fluency} />
        </div>
      </div>

      {/* 인증시험 환산 */}
      <div className="mb-4">
        <h3 className="font-black text-teczen-ink text-base mb-3">
          📊 인증 시험 및 지수 예측 데이터
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <EquivCard label="CEFR" value={eq.cefr} desc="유럽 공통 언어 표준" />
          <EquivCard label="TOEIC Speaking" value={eq.toeicSpeaking} desc="비즈니스 회화 평가" />
          <EquivCard label="OPIc" value={eq.opic} desc="구술 시험 등급" />
          <EquivCard label="IELTS Speaking" value={eq.ielts} desc="국제 영어 평가" />
          <EquivCard label="TOEFL Speaking" value={eq.toefl} desc="학술 영어 평가" />
          <EquivCard label="Cambridge" value={eq.cambridge} desc="케임브리지 영어" />
        </div>
      </div>

      <p className="text-[11px] text-teczen-gray-500 leading-relaxed mt-5 pt-4 border-t border-teczen-gray-100">
        ※ 본 결과지는 SPA 점수를 기반으로 한 <b>참고용 환산 예측</b>입니다. 각 인증시험의 실제
        점수와 다를 수 있으며, 학습 방향 가이드 목적으로 제공됩니다. (산정 기준: SPA 96점 만점 →
        CEFR 매핑)
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

function EquivCard({
  label,
  value,
  desc,
}: {
  label: string;
  value: string;
  desc: string;
}) {
  return (
    <div className="bg-teczen-gray-50 border border-teczen-gray-200 rounded-xl p-3">
      <div className="text-[10px] font-black tracking-widest text-teczen-blue">{label}</div>
      <div className="text-xl font-black text-teczen-ink leading-tight my-0.5">{value}</div>
      <div className="text-[10px] text-teczen-gray-500">{desc}</div>
    </div>
  );
}
