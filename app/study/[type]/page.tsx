"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import type { QuestionType } from "@/types";
import { storage } from "@/lib/storage";
import { filterByTargetLevel } from "@/lib/levelFilter";
import StudySession from "@/components/study/StudySession";
import ChartRenderer from "@/components/charts/ChartRenderer";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type1 from "@/data/type1_business_casual.json";
import type2 from "@/data/type2_opinion.json";
import type3 from "@/data/type3_visual.json";
import type4 from "@/data/type4_summary.json";

const TYPE_INFO: Record<number, { name: string; desc: string }> = {
  1: { name: "Business Casual", desc: "일상/개인 관련 질문에 자연스럽게 답하기" },
  2: { name: "Opinion", desc: "주제에 대한 의견을 논리적 근거와 함께 표현" },
  3: { name: "Visual Description", desc: "그래프/사진을 보고 분석/묘사하기" },
  4: { name: "Passage Summary", desc: "들은 지문을 60초 내로 요약하기" },
};

function interleaveType3(items: any[]): any[] {
  const photos = items.filter((i) => i.subtype === "photo");
  const charts = items.filter((i) => i.subtype !== "photo");

  const chartTypes = Array.from(new Set(charts.map((c) => c.subtype)));
  const chartsByType: Record<string, any[]> = {};
  chartTypes.forEach((t) => {
    chartsByType[t] = charts.filter((c) => c.subtype === t);
  });

  const variedCharts: any[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const t of chartTypes) {
      const next = chartsByType[t].shift();
      if (next) {
        variedCharts.push(next);
        added = true;
      }
    }
  }

  const result: any[] = [];
  const maxLen = Math.max(variedCharts.length, photos.length);
  for (let i = 0; i < maxLen; i++) {
    if (variedCharts[i]) result.push(variedCharts[i]);
    if (photos[i]) result.push(photos[i]);
  }
  return result;
}

export default function StudyPage() {
  const params = useParams<{ type: string }>();
  const type = Number(params?.type) as QuestionType;
  const router = useRouter();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!storage.isSetupComplete()) {
      router.push("/setup");
      return;
    }
    setMounted(true);
  }, [router]);

  if (!mounted || ![1, 2, 3, 4].includes(type)) return null;

  const target = storage.getSettings().targetLevel;
  const items = (() => {
    if (type === 1) return filterByTargetLevel(type1.questions as any, target);
    if (type === 2) return filterByTargetLevel(type2.questions as any, target);
    if (type === 3) return interleaveType3(filterByTargetLevel(type3.items as any, target));
    return filterByTargetLevel(type4.passages as any, target);
  })();

  const current: any = items[currentIdx % items.length];

  if (!current) return null;

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <Link href="/dashboard" className="text-xs text-teczen-gray-600 hover:text-teczen-navy mb-1 inline-block">
              ← 대시보드
            </Link>
            <h1 className="text-2xl font-bold text-teczen-gray-900">
              유형 {type}. {TYPE_INFO[type].name}
            </h1>
            <p className="text-sm text-teczen-gray-600">{TYPE_INFO[type].desc}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-teczen-gray-500">진행</div>
            <div className="text-lg font-bold text-teczen-navy">
              {(currentIdx % items.length) + 1} / {items.length}
            </div>
          </div>
        </div>

        <StudySessionForType type={type} item={current} key={current.id} />

        <div className="mt-6 flex justify-between">
          <Button
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            variant="secondary"
            disabled={currentIdx === 0}
          >
            ← 이전 문제
          </Button>
          <Button onClick={() => setCurrentIdx((i) => i + 1)}>다음 문제 →</Button>
        </div>
      </main>
    </>
  );
}

function StudySessionForType({ type, item }: { type: QuestionType; item: any }) {
  if (type === 3) {
    return (
      <StudySession
        type={3}
        questionId={item.id}
        question={item.question}
        sampleAnswer={item.sample_answer}
        visualContent={
          item.subtype === "photo" ? (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-teczen-red">PHOTO</span>
                <span className="text-[11px] font-bold text-teczen-blue">
                  👥 사람과 그들의 행동을 중심으로 묘사하세요
                </span>
              </div>
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.image_description}
                  className="w-full max-h-96 object-cover rounded-xl bg-teczen-gray-100"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = "none";
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                style={{ display: "none" }}
                className="w-full h-64 bg-gradient-to-br from-teczen-navy/10 to-teczen-gray-100 rounded-xl items-center justify-center text-center p-6"
              >
                <div>
                  <div className="text-3xl mb-2">🖼️</div>
                  <div className="text-sm text-teczen-gray-700 max-w-md">
                    {item.image_description}
                  </div>
                  <div className="text-xs text-teczen-gray-400 mt-2">
                    (이미지 로드 실패 — 아래 설명으로 답변 연습)
                  </div>
                </div>
              </div>
              <div className="mt-3 p-3 bg-teczen-blue/5 border border-teczen-blue/20 rounded-xl">
                <div className="text-[10px] font-black tracking-wider text-teczen-blue mb-1">
                  📝 SCENE DESCRIPTION
                </div>
                <p className="text-sm text-teczen-ink leading-relaxed">
                  {item.image_description}
                </p>
              </div>
            </div>
          ) : (
            <ChartRenderer item={item} />
          )
        }
      />
    );
  }

  if (type === 4) {
    return (
      <StudySession
        type={4}
        questionId={item.id}
        question="Listen to the passage and summarize the main points in your own words (60 seconds)."
        passageText={item.passage}
        sampleAnswer={item.sample_summary}
        passageRepeats={2}
      />
    );
  }

  return (
    <StudySession
      type={type}
      questionId={item.id}
      question={item.question}
      followUps={item.follow_ups}
      sampleAnswer={item.sample_answer}
    />
  );
}
