"use client";

import { useState } from "react";
import Link from "next/link";
import type { AiFeedback, QuestionType } from "@/types";
import { levelLabel, scoreToLevel } from "@/lib/scoring";
import { storage } from "@/lib/storage";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ResultSheet from "@/components/dashboard/ResultSheet";

const TYPE_NAMES: Record<QuestionType, { name: string; mission: string }> = {
  1: { name: "Business Casual", mission: "일상 Q&A" },
  2: { name: "Opinion", mission: "의견 표현" },
  3: { name: "Visual Description", mission: "그래프·사진 묘사" },
  4: { name: "Passage Summary", mission: "지문 요약 (질문 없음)" },
};

interface AnswerWithFeedback {
  questionId: string;
  answer: string;
  feedback?: AiFeedback;
}

interface Props {
  totalScore: number;
  answers: Record<QuestionType, AnswerWithFeedback>;
  durationMs?: number;
}

export default function MockSummary({ totalScore, answers, durationMs }: Props) {
  const [activeTab, setActiveTab] = useState<"report" | "summary" | QuestionType>("report");
  const session = storage.getSession();
  const allFeedbacks = ([1, 2, 3, 4] as QuestionType[])
    .map((t) => answers[t]?.feedback)
    .filter(Boolean) as AiFeedback[];

  // 종합 분석
  const criteriaAvg = {
    pronunciation: avg(allFeedbacks.map((f) => f.criteria?.pronunciation ?? 0)),
    listening: avg(allFeedbacks.map((f) => f.criteria?.listening ?? 0)),
    vocabulary: avg(allFeedbacks.map((f) => f.criteria?.vocabulary ?? 0)),
    grammar: avg(allFeedbacks.map((f) => f.criteria?.grammar ?? 0)),
    fluency: avg(allFeedbacks.map((f) => f.criteria?.fluency ?? 0)),
  };
  const scores = ([1, 2, 3, 4] as QuestionType[]).map((t) => ({
    type: t,
    score: answers[t]?.feedback?.scoreEstimate ?? 0,
  }));
  const strongestType = [...scores].sort((a, b) => b.score - a.score)[0];
  const weakestType = [...scores].sort((a, b) => a.score - b.score)[0];
  const allStrengths = allFeedbacks.flatMap((f) => f.strengths || []).slice(0, 6);
  const allImprovements = allFeedbacks.flatMap((f) => f.improvements || []).slice(0, 6);

  const tabBtn = (id: typeof activeTab, label: string) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2.5 text-sm font-bold rounded-xl whitespace-nowrap transition-colors ${
        activeTab === id
          ? "bg-teczen-blue text-white"
          : "bg-white border border-teczen-gray-200 text-teczen-gray-700 hover:border-teczen-blue hover:text-teczen-blue"
      }`}
    >
      {label}
    </button>
  );

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-4">
      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <div className="text-xs font-bold text-teczen-red mb-1">모의고사 결과</div>
            <h1 className="text-2xl font-black text-teczen-ink">📊 종합 분석</h1>
            {durationMs && (
              <div className="text-xs text-teczen-gray-500 mt-1">
                소요 시간 {Math.round(durationMs / 60000)}분
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs text-teczen-gray-500">예상 점수</div>
            <div className="text-5xl font-black text-teczen-navy leading-none">{totalScore}</div>
            <div className="text-sm text-teczen-gray-600">/ 96</div>
            <div className="mt-2 inline-block px-3 py-1 bg-teczen-blue/10 text-teczen-blue rounded-full text-sm font-bold">
              {levelLabel(scoreToLevel(totalScore))}
            </div>
          </div>
        </div>
        <div className="w-full bg-teczen-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-teczen-blue to-teczen-navy h-3 transition-all"
            style={{ width: `${(totalScore / 96) * 100}%` }}
          />
        </div>
      </Card>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabBtn("report", "📄 결과지")}
        {tabBtn("summary", "📋 종합 분석")}
        {([1, 2, 3, 4] as QuestionType[]).map((t) => {
          const s = answers[t]?.feedback?.scoreEstimate ?? 0;
          return tabBtn(t, `유형 ${t} · ${s}점`);
        })}
      </div>

      {activeTab === "report" && (
        <ResultSheet
          data={{
            name: session?.name || "학습자",
            team: session?.team,
            date: new Date().toISOString().slice(0, 10),
            totalScore,
            level: scoreToLevel(totalScore),
            criteria: {
              pronunciation: Math.round(criteriaAvg.pronunciation),
              listening: Math.round(criteriaAvg.listening),
              vocabulary: Math.round(criteriaAvg.vocabulary),
              grammar: Math.round(criteriaAvg.grammar),
              fluency: Math.round(criteriaAvg.fluency),
            },
          }}
        />
      )}

      {activeTab === "summary" && (
        <div className="space-y-4">
          {/* 유형별 점수 한눈에 */}
          <Card>
            <h2 className="font-bold text-teczen-ink mb-3">📊 유형별 점수</h2>
            <div className="space-y-3">
              {([1, 2, 3, 4] as QuestionType[]).map((t) => {
                const fb = answers[t]?.feedback;
                const s = fb?.scoreEstimate ?? 0;
                const max = 96;
                const pct = (s / max) * 100;
                return (
                  <div key={t}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-teczen-ink">유형 {t}</span>
                        <span className="text-xs text-teczen-gray-500">
                          {TYPE_NAMES[t].name} · {TYPE_NAMES[t].mission}
                        </span>
                      </div>
                      <div className="text-sm font-bold tabular-nums">
                        <span className="text-teczen-blue">{s}</span>
                        <span className="text-teczen-gray-400"> / {max}</span>
                      </div>
                    </div>
                    <div className="w-full bg-teczen-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-teczen-blue h-2.5 rounded-full transition-all"
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-5">
              {strongestType.score > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                  <div className="text-xs font-bold text-green-800 mb-0.5">💪 가장 강한 유형</div>
                  <div className="text-sm font-bold text-teczen-ink">
                    유형 {strongestType.type} · {strongestType.score}점
                  </div>
                </div>
              )}
              {weakestType.score < strongestType.score && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <div className="text-xs font-bold text-red-800 mb-0.5">📌 보강 필요</div>
                  <div className="text-sm font-bold text-teczen-ink">
                    유형 {weakestType.type} · {weakestType.score}점
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* SPA 5개 영역 평균 */}
          <Card>
            <h2 className="font-bold text-teczen-ink mb-1">📐 SPA 5개 영역 평균</h2>
            <p className="text-xs text-teczen-gray-500 mb-4">
              4유형 평균 점수. 모의고사 전체 채점 기준 통합.
            </p>
            <div className="space-y-3">
              {[
                { key: "pronunciation", label: "발음", max: 12 },
                { key: "listening", label: "청취·답변", max: 36 },
                { key: "vocabulary", label: "어휘", max: 12 },
                { key: "grammar", label: "문법", max: 24 },
                { key: "fluency", label: "유창성", max: 12 },
              ].map((c) => {
                const v = Math.round((criteriaAvg as any)[c.key]);
                const pct = (v / c.max) * 100;
                const color =
                  pct >= 75
                    ? "bg-green-500"
                    : pct >= 50
                    ? "bg-teczen-blue"
                    : pct >= 25
                    ? "bg-amber-500"
                    : "bg-teczen-red";
                return (
                  <div key={c.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-teczen-ink">{c.label}</span>
                      <span className="text-sm font-bold tabular-nums">
                        <span className="text-teczen-blue">{v}</span>
                        <span className="text-teczen-gray-400"> / {c.max}</span>
                      </span>
                    </div>
                    <div className="w-full bg-teczen-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`${color} h-2.5 rounded-full transition-all`}
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            {allStrengths.length > 0 && (
              <Card>
                <h3 className="font-bold text-teczen-ink mb-3 flex items-center gap-2">
                  <span className="text-green-600">✓</span> 잘한 점 (전 유형)
                </h3>
                <ul className="space-y-1.5 text-sm text-teczen-gray-700">
                  {allStrengths.map((s, i) => (
                    <li key={i} className="leading-relaxed">• {s}</li>
                  ))}
                </ul>
              </Card>
            )}
            {allImprovements.length > 0 && (
              <Card>
                <h3 className="font-bold text-teczen-ink mb-3 flex items-center gap-2">
                  <span className="text-teczen-red">!</span> 개선 포인트 (전 유형)
                </h3>
                <ul className="space-y-1.5 text-sm text-teczen-gray-700">
                  {allImprovements.map((s, i) => (
                    <li key={i} className="leading-relaxed">• {s}</li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          <Card>
            <div className="text-center text-sm text-teczen-gray-600 mb-3">
              상단 탭에서 유형별 상세 피드백을 볼 수 있어요.
            </div>
            <Link href="/dashboard">
              <Button fullWidth>대시보드로</Button>
            </Link>
          </Card>
        </div>
      )}

      {([1, 2, 3, 4] as QuestionType[]).map(
        (t) =>
          activeTab === t && (
            <TypeDetail
              key={t}
              type={t}
              answer={answers[t]?.answer || ""}
              feedback={answers[t]?.feedback}
            />
          ),
      )}
    </main>
  );
}

function TypeDetail({
  type,
  answer,
  feedback,
}: {
  type: QuestionType;
  answer: string;
  feedback?: AiFeedback;
}) {
  if (!feedback) {
    return (
      <Card>
        <div className="py-8 text-center text-sm text-teczen-gray-500">
          이 유형의 채점 결과를 찾을 수 없습니다.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs font-bold text-teczen-red mb-1">
              유형 {type} · {TYPE_NAMES[type].name}
            </div>
            <div className="text-xs text-teczen-gray-500">{TYPE_NAMES[type].mission}</div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-teczen-navy">
              {feedback.scoreEstimate}
            </div>
            <div className="text-xs text-teczen-gray-500">/ 96</div>
            <div className="mt-1 inline-block px-2 py-0.5 bg-teczen-blue/10 text-teczen-blue rounded-full text-xs font-bold">
              {levelLabel(feedback.estimatedLevel)}
            </div>
          </div>
        </div>
      </Card>

      {answer && (
        <Card>
          <h3 className="font-bold text-teczen-ink mb-2">🗣 내 답변</h3>
          <p className="text-sm text-teczen-gray-700 leading-relaxed bg-teczen-gray-50 p-4 rounded-xl whitespace-pre-wrap">
            {answer}
          </p>
        </Card>
      )}

      {feedback.criteria && (
        <Card>
          <h3 className="font-bold text-teczen-ink mb-3">📐 영역별 점수</h3>
          <div className="space-y-2.5">
            {[
              { key: "pronunciation", label: "발음", max: 12 },
              { key: "listening", label: "청취·답변", max: 36 },
              { key: "vocabulary", label: "어휘", max: 12 },
              { key: "grammar", label: "문법", max: 24 },
              { key: "fluency", label: "유창성", max: 12 },
            ].map((c) => {
              const v = (feedback.criteria as any)[c.key] ?? 0;
              const pct = (v / c.max) * 100;
              return (
                <div key={c.key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-bold text-teczen-ink">{c.label}</span>
                    <span className="tabular-nums">
                      <span className="text-teczen-blue font-bold">{v}</span>
                      <span className="text-teczen-gray-400"> / {c.max}</span>
                    </span>
                  </div>
                  <div className="w-full bg-teczen-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-teczen-blue h-2 rounded-full"
                      style={{ width: `${Math.max(2, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {feedback.strengths.length > 0 && (
          <Card>
            <h3 className="font-bold text-teczen-ink mb-2 flex items-center gap-2">
              <span className="text-green-600">✓</span> 잘한 점
            </h3>
            <ul className="space-y-1.5 text-sm text-teczen-gray-700">
              {feedback.strengths.map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          </Card>
        )}
        {feedback.improvements.length > 0 && (
          <Card>
            <h3 className="font-bold text-teczen-ink mb-2 flex items-center gap-2">
              <span className="text-teczen-red">!</span> 개선 포인트
            </h3>
            <ul className="space-y-1.5 text-sm text-teczen-gray-700">
              {feedback.improvements.map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {feedback.grammarIssues.length > 0 && (
        <Card>
          <h3 className="font-bold text-teczen-ink mb-2">📝 문법 교정</h3>
          <ul className="space-y-1.5 text-sm text-teczen-gray-700">
            {feedback.grammarIssues.map((s, i) => (
              <li key={i} className="leading-relaxed">• {s}</li>
            ))}
          </ul>
        </Card>
      )}

      {feedback.vocabularySuggestions.length > 0 && (
        <Card>
          <h3 className="font-bold text-teczen-ink mb-2">📚 어휘 제안</h3>
          <ul className="space-y-1.5 text-sm text-teczen-gray-700">
            {feedback.vocabularySuggestions.map((s, i) => (
              <li key={i} className="leading-relaxed">• {s}</li>
            ))}
          </ul>
        </Card>
      )}

      {feedback.betterExpressions.length > 0 && (
        <Card>
          <h3 className="font-bold text-teczen-ink mb-2">💡 자연스러운 표현</h3>
          <ul className="space-y-1.5 text-sm text-teczen-gray-700">
            {feedback.betterExpressions.map((s, i) => (
              <li key={i} className="leading-relaxed">• {s}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h3 className="font-bold text-teczen-ink mb-2">⭐ 모범 답안 (목표 등급 기준)</h3>
        <p className="text-sm text-teczen-gray-700 leading-relaxed bg-teczen-blue/5 border border-teczen-blue/20 p-4 rounded-xl whitespace-pre-wrap">
          {feedback.modelAnswer}
        </p>
      </Card>
    </div>
  );
}

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
