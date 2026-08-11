"use client";

import { useMemo, useState } from "react";
import type { AiFeedback, CriteriaKey, Level, SpeakingMetrics } from "@/types";
import { LEVEL_RANGES } from "@/lib/scoring";
import { storage } from "@/lib/storage";
import Card from "@/components/ui/Card";

interface Props {
  loading: boolean;
  feedback: AiFeedback | null;
  userAnswer: string;
  sampleAnswer: string;
  onRestart: () => void;
  metrics?: SpeakingMetrics;
}

const AREAS: { key: CriteriaKey; ko: string; en: string; max: number }[] = [
  { key: "pronunciation", ko: "발음", en: "Pronunciation", max: 12 },
  { key: "listening", ko: "청취·답변", en: "Listening & Response", max: 36 },
  { key: "vocabulary", ko: "어휘", en: "Vocabulary", max: 12 },
  { key: "grammar", ko: "문법", en: "Grammar", max: 24 },
  { key: "fluency", ko: "유창성", en: "Fluency", max: 12 },
];

const SLICE_COLORS = ["#2E5BFF", "#5B7FFF", "#8FA8FF", "#BCCBFF", "#DDE4F5"];

export default function FeedbackPanel({
  loading,
  feedback,
  userAnswer,
  sampleAnswer,
  onRestart,
  metrics,
}: Props) {
  const [tab, setTab] = useState<CriteriaKey>("pronunciation");

  const settings = useMemo(() => storage.getSettings(), []);
  const targetLevel = (settings.targetLevel || 6) as Level;

  // 지난 학습 기록에서 영역별 내 평균(백분율) 산출 — 비교 막대용
  const myAverages = useMemo(() => {
    const records = storage.getRecords().filter((r) => r.feedback?.criteria);
    if (records.length === 0) return null;
    const acc: Record<string, number[]> = {};
    records.forEach((r) => {
      const c = r.feedback!.criteria!;
      AREAS.forEach((a) => {
        const v = (c as any)[a.key] ?? 0;
        (acc[a.key] ||= []).push((v / a.max) * 100);
      });
    });
    const out: Record<string, number> = {};
    AREAS.forEach((a) => {
      const arr = acc[a.key] || [];
      out[a.key] = arr.length
        ? Math.round(arr.reduce((s, n) => s + n, 0) / arr.length)
        : 0;
    });
    return out;
  }, [feedback]);

  const answerStats = useMemo(() => {
    const words = userAnswer.trim().split(/\s+/).filter(Boolean);
    const counts = new Map<string, number>();
    words.forEach((w) => {
      const k = w.toLowerCase().replace(/[^a-z']/g, "");
      if (k.length > 2) counts.set(k, (counts.get(k) || 0) + 1);
    });
    const repeated = Array.from(counts.values()).filter((n) => n >= 3).length;
    return { wordCount: words.length, repeated };
  }, [userAnswer]);

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="inline-block w-10 h-10 border-4 border-teczen-blue border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-teczen-gray-700 font-semibold">
              AI가 답변을 정밀 분석하고 있어요...
            </p>
            <p className="text-xs text-teczen-gray-500 mt-1">
              5개 영역 채점 · 발화 내용 분석 · 맞춤 학습 추천
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (!feedback) return null;

  const raw = feedback.scoreEstimate;
  const total100 = Math.round((raw / 96) * 100);
  const level = feedback.estimatedLevel;
  const [lvMin, lvMax] = LEVEL_RANGES[level] || [0, 96];
  const targetPct = Math.round((LEVEL_RANGES[targetLevel][0] / 96) * 100);

  const areaRows = AREAS.map((a) => {
    const rawScore = (feedback.criteria as any)?.[a.key] ?? 0;
    return {
      ...a,
      raw: rawScore,
      pct: Math.round((rawScore / a.max) * 100),
      avg: myAverages ? myAverages[a.key] : null,
      analysis: feedback.areas?.[a.key],
    };
  });

  const tips = (feedback.detailTips || []).filter((t) => t.area === tab);
  const tabArea = areaRows.find((a) => a.key === tab);
  const breakdown = (feedback.contentBreakdown || []).slice(0, 5);

  return (
    <div className="space-y-4">
      {/* ───────── 종합 점수 ───────── */}
      <Card>
        <div className="grid md:grid-cols-[1fr_auto] gap-6 items-start">
          <div className="min-w-0">
            <div className="text-xs font-bold text-teczen-gray-500 mb-2">종합 점수</div>
            <div className="flex items-end gap-3 flex-wrap mb-1">
              <span className="text-6xl font-black text-teczen-blue leading-none">
                {total100}
              </span>
              <span className="text-lg text-teczen-gray-400 font-bold mb-1">/ 100</span>
              <span className="mb-1 px-3 py-1 bg-teczen-blue/10 text-teczen-blue rounded-full text-sm font-bold whitespace-nowrap">
                Lv {level} ({Math.round((lvMin / 96) * 100)}~
                {Math.round((lvMax / 96) * 100)}점)
              </span>
            </div>
            <div className="text-xs text-teczen-gray-500 mb-4">
              SPA 원점수 {raw} / 96점
            </div>
            <div className="w-full bg-teczen-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-2.5 rounded-full bg-gradient-to-r from-teczen-blue to-purple-500 transition-all"
                style={{ width: `${Math.max(2, total100)}%` }}
              />
            </div>
          </div>

          <div className="md:max-w-xs md:border-l md:border-teczen-gray-100 md:pl-6">
            <div className="text-xs font-bold text-teczen-gray-500 mb-2">평가 요약</div>
            <p className="text-sm text-teczen-ink leading-relaxed mb-4">
              {feedback.summaryComment}
            </p>
            <button
              onClick={onRestart}
              className="px-4 py-2 bg-teczen-blue/10 text-teczen-blue text-sm font-bold rounded-xl hover:bg-teczen-blue/20 transition-colors"
            >
              다시 평가
            </button>
          </div>
        </div>
      </Card>

      {/* ───────── 영역별 세부 분석 ───────── */}
      <Card>
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h3 className="font-black text-teczen-ink">
            영역별 세부 분석{" "}
            <span className="text-sm font-bold text-teczen-gray-500">(5개 영역)</span>
          </h3>
          <div className="flex items-center gap-4 text-[11px] text-teczen-gray-600">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 bg-teczen-blue rounded" /> 내 점수
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 bg-teczen-gray-300 rounded" /> 내 평균
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 border-t border-dashed border-teczen-gray-500" />{" "}
              목표 점수
            </span>
          </div>
        </div>

        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full min-w-[820px] text-sm border-collapse">
            <thead>
              <tr className="text-xs text-teczen-gray-500 border-y border-teczen-gray-200 bg-teczen-gray-50">
                <th className="text-left py-2.5 px-3 font-bold">영역</th>
                <th className="text-center py-2.5 px-2 font-bold w-[70px]">점수</th>
                <th className="text-left py-2.5 px-3 font-bold w-[170px]"> </th>
                <th className="text-left py-2.5 px-3 font-bold">분석 요약</th>
                <th className="text-left py-2.5 px-3 font-bold">강점</th>
                <th className="text-left py-2.5 px-3 font-bold">개선 포인트</th>
              </tr>
            </thead>
            <tbody>
              {areaRows.map((a) => (
                <tr
                  key={a.key}
                  className="border-b border-teczen-gray-100 align-top hover:bg-teczen-gray-50/60"
                >
                  <td className="py-4 px-3">
                    <div className="font-bold text-teczen-ink">{a.ko}</div>
                    <div className="text-[11px] text-teczen-gray-500">{a.en}</div>
                    <div className="text-[10px] text-teczen-gray-400 mt-0.5">
                      SPA {a.raw}/{a.max}점
                    </div>
                  </td>
                  <td className="py-4 px-2">
                    <ScoreRing pct={a.pct} />
                  </td>
                  <td className="py-4 px-3">
                    <CompareBars pct={a.pct} avg={a.avg} target={targetPct} />
                  </td>
                  <td className="py-4 px-3 text-teczen-gray-700 leading-relaxed max-w-[240px]">
                    {a.analysis?.summary || "—"}
                  </td>
                  <td className="py-4 px-3">
                    <ul className="space-y-1">
                      {(a.analysis?.strengths || []).map((s, i) => (
                        <li key={i} className="flex gap-1.5 text-teczen-gray-700">
                          <span className="text-green-600 font-bold shrink-0">✓</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-4 px-3">
                    <ul className="space-y-1">
                      {(a.analysis?.improvements || []).map((s, i) => (
                        <li key={i} className="flex gap-1.5 text-teczen-gray-700">
                          <span className="text-teczen-red font-bold shrink-0">!</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ───────── AI 종합 코멘트 + 발화 내용 분석 ───────── */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-black text-teczen-blue mb-3">AI 종합 코멘트</h3>
          <p className="text-sm text-teczen-ink leading-relaxed mb-5">
            {feedback.overallComment}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <MetricTile
              label="응답 시간"
              value={metrics?.responseSec ? `${metrics.responseSec.toFixed(1)}초` : "—"}
              note={
                metrics?.responseSec
                  ? metrics.responseSec <= 3
                    ? "적정"
                    : "느림"
                  : ""
              }
            />
            <MetricTile
              label="말하기 길이"
              value={metrics?.speakingSec ? `${Math.round(metrics.speakingSec)}초` : "—"}
              note={
                metrics?.speakingSec
                  ? metrics.speakingSec >= 40
                    ? "적절"
                    : "짧음"
                  : ""
              }
            />
            <MetricTile
              label="단어 수"
              value={`${answerStats.wordCount}단어`}
              note={answerStats.wordCount >= 60 ? "적절" : "부족"}
            />
            <MetricTile
              label="반복 단어"
              value={`${answerStats.repeated}개`}
              note={answerStats.repeated <= 5 ? "적정" : "많음"}
            />
            <MetricTile
              label="자신감 지수"
              value={`${feedback.confidence ?? 0}%`}
              gauge={feedback.confidence ?? 0}
            />
          </div>
        </Card>

        <Card>
          <h3 className="font-black text-teczen-blue mb-3">발화 내용 분석</h3>
          {breakdown.length === 0 ? (
            <div className="py-10 text-center text-sm text-teczen-gray-500">
              분석할 발화 내용이 부족해요.
            </div>
          ) : (
            <div className="flex items-center gap-5 flex-wrap justify-center sm:justify-start">
              <Donut
                slices={breakdown}
                centerLabel="주제 적합도"
                centerValue={`${feedback.topicRelevance ?? 0}%`}
              />
              <ul className="space-y-2 min-w-[150px] flex-1">
                {breakdown.map((s, i) => (
                  <li key={s.label} className="flex items-center gap-2 text-sm">
                    <span
                      className="inline-block w-3 h-3 rounded-sm shrink-0"
                      style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }}
                    />
                    <span className="text-teczen-gray-700 flex-1">{s.label}</span>
                    <span className="font-bold text-teczen-ink tabular-nums">
                      {s.percent}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      {/* ───────── 세부 피드백 + 어휘 제안 ───────── */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h3 className="font-black text-teczen-ink">세부 피드백</h3>
            <div className="flex gap-1 flex-wrap">
              {AREAS.map((a) => (
                <button
                  key={a.key}
                  onClick={() => setTab(a.key)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                    tab === a.key
                      ? "bg-teczen-blue text-white"
                      : "bg-teczen-gray-100 text-teczen-gray-600 hover:bg-teczen-gray-200"
                  }`}
                >
                  {a.ko}
                </button>
              ))}
            </div>
          </div>

          <ul className="space-y-3">
            {(tips.length > 0
              ? tips
              : (tabArea?.analysis?.improvements || []).map((t) => ({
                  area: tab,
                  label: tabArea?.ko || "",
                  text: t,
                  example: undefined as string | undefined,
                }))
            ).map((t, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-teczen-blue/10 text-teczen-blue text-[11px] font-black flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="text-sm text-teczen-ink leading-relaxed">
                    {t.label && <b className="text-teczen-blue mr-1">{t.label}:</b>}
                    {t.text}
                  </div>
                  {t.example && (
                    <div className="mt-1 text-xs text-teczen-gray-600 bg-teczen-gray-50 border border-teczen-gray-200 rounded-lg px-2.5 py-1.5 font-mono break-words">
                      예) {t.example}
                    </div>
                  )}
                </div>
              </li>
            ))}
            {tips.length === 0 && !(tabArea?.analysis?.improvements || []).length && (
              <li className="text-sm text-teczen-gray-500 py-6 text-center">
                이 영역은 특별한 지적 사항이 없어요. 잘하고 있습니다!
              </li>
            )}
          </ul>
        </Card>

        <Card>
          <h3 className="font-black text-teczen-ink mb-4">고급 어휘 &amp; 표현 제안</h3>
          <div className="space-y-2.5">
            {(feedback.vocabularyGroups || []).map((g) => (
              <div
                key={g.title}
                className="border border-teczen-gray-200 rounded-xl overflow-hidden"
              >
                <div className="px-3 py-1.5 bg-teczen-gray-50 text-xs font-bold text-teczen-gray-700 border-b border-teczen-gray-200">
                  {g.title}
                </div>
                <div className="px-3 py-2.5 flex flex-wrap gap-x-2 gap-y-1.5">
                  {g.items.map((it) => (
                    <button
                      key={it}
                      onClick={() => {
                        storage.addVocab({
                          word: it,
                          meaning: g.title,
                          example: userAnswer.slice(0, 120),
                          source: "AI 표현 제안",
                          addedAt: Date.now(),
                        });
                        alert(`"${it}" 단어장에 추가됨`);
                      }}
                      title="클릭해서 단어장에 추가"
                      className="text-sm font-mono text-teczen-blue hover:underline"
                    >
                      {it}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {feedback.grammarIssues.length > 0 && (
            <div className="mt-4 pt-4 border-t border-teczen-gray-100">
              <div className="text-xs font-bold text-teczen-gray-500 mb-2">📝 문법 교정</div>
              <ul className="space-y-1.5 text-sm text-teczen-gray-700">
                {feedback.grammarIssues.map((s, i) => (
                  <li key={i} className="leading-relaxed">
                    • {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      {/* ───────── 모범 답안 + 추천 학습 액션 ───────── */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-black text-teczen-ink mb-3">
            모범 답안{" "}
            <span className="text-sm font-bold text-teczen-gray-500">
              (목표 등급 Lv {targetLevel})
            </span>
          </h3>
          <p className="text-sm text-teczen-ink leading-relaxed bg-teczen-blue/5 border border-teczen-blue/20 p-4 rounded-xl whitespace-pre-wrap">
            {feedback.modelAnswer || sampleAnswer}
          </p>
        </Card>

        <Card>
          <h3 className="font-black text-teczen-ink mb-4">추천 학습 액션</h3>
          <ul className="space-y-3">
            {(feedback.learningActions || []).map((a, i) => (
              <li key={i} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0 w-4 h-4 rounded-full border-2 border-teczen-gray-300" />
                  <span className="text-sm text-teczen-ink truncate">{a.label}</span>
                </div>
                <span className="text-xs font-bold text-teczen-gray-500 tabular-nums shrink-0">
                  0 / {a.target}
                  {a.unit}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-teczen-gray-500 mt-4 pt-3 border-t border-teczen-gray-100">
            💡 매일 한 문제씩 풀면 불꽃이 커지고 목표 등급에 가까워져요.
          </p>
        </Card>
      </div>
    </div>
  );
}

/* ───────────────────────── 서브 컴포넌트 ───────────────────────── */

function ScoreRing({ pct }: { pct: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, pct)) / 100) * c;
  const color =
    pct >= 80 ? "#16A34A" : pct >= 60 ? "#2E5BFF" : pct >= 40 ? "#F59E0B" : "#E60012";
  return (
    <div className="relative w-[52px] h-[52px] mx-auto">
      <svg viewBox="0 0 52 52" className="w-full h-full -rotate-90">
        <circle cx="26" cy="26" r={r} fill="none" stroke="#E9ECEF" strokeWidth="5" />
        <circle
          cx="26"
          cy="26"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-black text-teczen-ink leading-none">{pct}</span>
        <span className="text-[8px] text-teczen-gray-400 leading-none mt-0.5">/100</span>
      </div>
    </div>
  );
}

function CompareBars({
  pct,
  avg,
  target,
}: {
  pct: number;
  avg: number | null;
  target: number;
}) {
  return (
    <div className="relative pt-1">
      <div className="relative h-2 bg-teczen-gray-100 rounded-full overflow-hidden mb-1">
        <div
          className="absolute inset-y-0 left-0 bg-teczen-blue rounded-full"
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
      {avg !== null && (
        <div className="relative h-2 bg-teczen-gray-100 rounded-full overflow-hidden mb-1">
          <div
            className="absolute inset-y-0 left-0 bg-teczen-gray-300 rounded-full"
            style={{ width: `${Math.max(2, avg)}%` }}
          />
        </div>
      )}
      <div
        className="absolute top-0 bottom-4 border-l border-dashed border-teczen-gray-500"
        style={{ left: `${Math.min(100, target)}%` }}
      />
      <div className="flex items-center gap-3 text-[10px] text-teczen-gray-500 tabular-nums">
        <span className="font-bold text-teczen-blue">{pct}</span>
        {avg !== null && <span>{avg}</span>}
        <span>{target}</span>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  note,
  gauge,
}: {
  label: string;
  value: string;
  note?: string;
  gauge?: number;
}) {
  return (
    <div className="bg-teczen-gray-50 border border-teczen-gray-200 rounded-xl p-2.5 text-center">
      <div className="text-[10px] text-teczen-gray-500 mb-1 leading-tight">{label}</div>
      {gauge !== undefined ? (
        <div className="flex flex-col items-center">
          <div className="w-full bg-teczen-gray-200 rounded-full h-1.5 mb-1 overflow-hidden">
            <div
              className="bg-teczen-blue h-1.5 rounded-full"
              style={{ width: `${Math.max(2, gauge)}%` }}
            />
          </div>
          <div className="text-sm font-black text-teczen-ink">{value}</div>
        </div>
      ) : (
        <>
          <div className="text-sm font-black text-teczen-ink leading-tight">{value}</div>
          {note && <div className="text-[10px] text-teczen-gray-500 mt-0.5">({note})</div>}
        </>
      )}
    </div>
  );
}

function Donut({
  slices,
  centerLabel,
  centerValue,
}: {
  slices: { label: string; percent: number }[];
  centerLabel: string;
  centerValue: string;
}) {
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative w-[150px] h-[150px] shrink-0">
      <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#F1F3F5" strokeWidth="20" />
        {slices.map((s, i) => {
          const len = (Math.max(0, s.percent) / 100) * c;
          const el = (
            <circle
              key={s.label}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={SLICE_COLORS[i % SLICE_COLORS.length]}
              strokeWidth="20"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] text-teczen-gray-500">{centerLabel}</span>
        <span className="text-2xl font-black text-teczen-ink">{centerValue}</span>
      </div>
    </div>
  );
}
