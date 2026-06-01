"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { getDaysUntil, scoreToLevel } from "@/lib/scoring";
import { decayedFlame, FLAME_COLORS, MAX_FLAME_LEVEL } from "@/lib/flame";
import { getFlameTop5 } from "@/lib/flameTop5";
import { pushFlame, fetchRanking, type RankingEntry } from "@/lib/flameSync";
import { pushUserToServer } from "@/lib/userSync";
import type { UserSettings, StudyRecord, MockExamResult, UserSession } from "@/types";
import Header from "@/components/layout/Header";
import Flame from "@/components/Flame";
import Roadmap from "@/components/dashboard/Roadmap";
import AppLaunchPopup from "@/components/dashboard/AppLaunchPopup";
import type1 from "@/data/type1_business_casual.json";
import type2 from "@/data/type2_opinion.json";
import type3 from "@/data/type3_visual.json";
import type4 from "@/data/type4_summary.json";

const TYPE_INFO = [
  { type: 1, name: "Business Casual", desc: "일상 Q&A", total: type1.questions.length },
  { type: 2, name: "Opinion", desc: "의견 표현", total: type2.questions.length },
  { type: 3, name: "Visual", desc: "그래프·사진 묘사", total: type3.items.length },
  { type: 4, name: "Summary", desc: "지문 요약", total: type4.passages.length },
];

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [records, setRecords] = useState<StudyRecord[]>([]);
  const [mockResults, setMockResults] = useState<MockExamResult[]>([]);
  const [activeTab, setActiveTab] = useState<"home" | "study" | "mock" | "stats">("home");
  const [selectedRecord, setSelectedRecord] = useState<StudyRecord | null>(null);
  const [showRanking, setShowRanking] = useState(false);

  useEffect(() => {
    if (!storage.isLoggedIn()) {
      router.push("/login");
      return;
    }
    if (!storage.isSetupComplete()) {
      router.push("/setup");
      return;
    }
    setSession(storage.getSession());
    setSettings(storage.getSettings());
    setRecords(storage.getRecords());
    setMockResults(storage.getMockResults());
    // 내 불꽃을 공용 저장소에 올려서 다른 사람 랭킹에도 반영되게
    pushFlame();
  }, [router]);

  if (!session || !settings) return null;

  const dDay = getDaysUntil(settings.examDate);
  const totalScore = records.reduce((sum, r) => sum + (r.score || 0), 0);
  const avgScore = records.length > 0 ? Math.round(totalScore / records.length) : 0;
  const estimatedLevel = avgScore > 0 ? scoreToLevel(avgScore) : 1;
  const reachedTarget = estimatedLevel >= settings.targetLevel;

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-2 text-sm text-teczen-gray-500">
          안녕하세요, <span className="font-bold text-teczen-ink">{session.name}</span>님
        </div>
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="headline-xl text-teczen-ink">
            언제 어디서든,
            <br />
            <span className="highlight-blue">목표 등급</span>까지.
          </h1>
          <a
            href="/api/assets?key=api-key-guide"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 px-4 py-2.5 bg-teczen-blue text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors whitespace-nowrap shadow-sm"
          >
            📘 HChat 연동법
          </a>
        </div>
        <p className="text-teczen-gray-600 mb-6">
          시간·장소 구애받지 않아요. 본인 등급에 맞춘 SPA 학습.
        </p>

        <Roadmap />

        <div className="flex gap-1 border-b border-teczen-gray-200 mb-8 overflow-x-auto">
          <TabBtn active={activeTab === "home"} onClick={() => setActiveTab("home")}>
            홈
          </TabBtn>
          <TabBtn active={activeTab === "study"} onClick={() => setActiveTab("study")}>
            학습
          </TabBtn>
          <TabBtn active={activeTab === "mock"} onClick={() => setActiveTab("mock")}>
            모의고사
          </TabBtn>
          <TabBtn active={activeTab === "stats"} onClick={() => setActiveTab("stats")}>
            분석
          </TabBtn>
        </div>

        {activeTab === "home" && (
          <div className="space-y-6">
            <FlameSection
              settings={settings}
              onColorChange={(c) => {
                const flame = settings.flame ? { ...settings.flame, color: c } : { level: 0, streak: 0, lastStudyDay: "", color: c };
                const next = { ...settings, flame };
                storage.saveSettings(next);
                setSettings(next);
              }}
              onShowRanking={() => setShowRanking(true)}
            />

            <div className="grid md:grid-cols-3 gap-4">
              <MetricCard
                label="시험까지"
                value={dDay >= 0 ? `D-${dDay}` : "—"}
                sub={settings.examDate}
                accent="red"
              />
              <MetricCard
                label="목표 등급"
                value={`Lv ${settings.targetLevel}`}
                sub="우측 상단에서 변경"
                accent="blue"
              />
              <MetricCard
                label="현재 예상"
                value={records.length > 0 ? `Lv ${estimatedLevel}` : "—"}
                sub={records.length > 0 ? `평균 ${avgScore}점 / 96` : "학습 시작 전"}
                accent={reachedTarget ? "green" : "gray"}
              />
            </div>

            <div className="bg-white rounded-2xl border border-teczen-gray-200 p-6">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <div className="text-xs font-bold text-teczen-blue mb-1">QUICK START</div>
                  <h2 className="text-2xl font-black text-teczen-ink">
                    오늘 <span className="highlight-blue">한 문제</span>만이라도.
                  </h2>
                </div>
                <Link
                  href="/study/1"
                  className="px-5 py-2.5 bg-teczen-blue text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  바로 시작 →
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                {TYPE_INFO.map((t) => {
                  const rs = records.filter((r) => r.type === t.type);
                  const done = rs.length;
                  const pct = Math.min(100, Math.round((done / t.total) * 100));
                  return (
                    <Link
                      key={t.type}
                      href={`/study/${t.type}`}
                      className="group block p-4 rounded-xl bg-white border-2 border-teczen-gray-200 hover:border-teczen-blue hover:shadow-md transition-all"
                    >
                      <div className="text-xs font-bold text-teczen-red mb-1">유형 {t.type}</div>
                      <div className="font-bold text-teczen-ink text-sm mb-1">{t.name}</div>
                      <div className="text-xs text-teczen-gray-500 mb-3">{t.desc}</div>
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-xs text-teczen-gray-500">진도</span>
                        <span className="text-sm">
                          <b className="text-teczen-blue">{done}</b>
                          <span className="text-teczen-gray-400"> / {t.total}</span>
                        </span>
                      </div>
                      <div className="w-full bg-teczen-gray-200 rounded-full h-1.5 overflow-hidden mb-3">
                        <div
                          className="bg-teczen-blue h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="block w-full text-center px-3 py-2 bg-teczen-blue text-white text-xs font-bold rounded-lg group-hover:bg-blue-700 transition-colors">
                        학습하러 가기 →
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Link
                href="/mock"
                style={{ background: "linear-gradient(135deg, #2E5BFF 0%, #003D7A 100%)" }}
                className="block text-white rounded-2xl p-6 hover:shadow-2xl hover:-translate-y-0.5 transition-all relative overflow-hidden shadow-lg shadow-teczen-blue/30"
              >
                <div className="absolute -right-6 -bottom-6 text-[10rem] font-black opacity-10">M</div>
                <div className="relative">
                  <div className="text-xs font-bold text-white mb-1 tracking-wider">실전 시험 환경</div>
                  <div className="text-3xl font-black mb-2 text-white">13분, 4유형 연속</div>
                  <p className="text-sm text-white mb-4 opacity-95">점수대별 50회 세트</p>
                  <div
                    className="inline-flex items-center gap-1 px-4 py-2 bg-white text-sm font-black rounded-lg"
                    style={{ color: "#2E5BFF" }}
                  >
                    모의고사 시작 →
                  </div>
                </div>
              </Link>
              <Link
                href="/vocab"
                className="block bg-white border border-teczen-gray-200 rounded-2xl p-6 hover:border-teczen-blue transition-colors"
              >
                <div className="text-xs font-bold text-teczen-blue mb-1">VOCAB</div>
                <div className="text-2xl font-black text-teczen-ink mb-2">내 단어장</div>
                <p className="text-sm text-teczen-gray-600 mb-3">AI 피드백에서 모은 표현 + TTS</p>
                <div className="text-sm font-bold text-teczen-blue">보러가기 →</div>
              </Link>
            </div>

            {records.length > 0 && (
              <div className="bg-white rounded-2xl border border-teczen-gray-200 p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-teczen-ink">최근 학습</h3>
                  <button
                    onClick={() => {
                      if (!confirm("최근 학습 기록 전체를 삭제할까요?\n(불꽃·연속학습 일수는 유지됩니다)")) return;
                      if (typeof window !== "undefined" && session?.employeeId) {
                        localStorage.setItem(
                          `spa.records.${session.employeeId}`,
                          JSON.stringify([]),
                        );
                      }
                      setRecords([]);
                      pushUserToServer();
                    }}
                    className="text-xs font-bold text-white bg-teczen-red hover:bg-teczen-red-dark px-3 py-1.5 rounded-lg transition-colors"
                  >
                    🗑 초기화
                  </button>
                </div>
                <div className="space-y-2">
                  {[...records]
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .slice(0, 5)
                    .map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setSelectedRecord(r)}
                        className="w-full flex items-center justify-between p-3 bg-teczen-gray-50 hover:bg-teczen-blue/10 rounded-xl transition-colors text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-bold text-teczen-red">유형 {r.type}</span>
                            <span className="text-xs text-teczen-gray-400">
                              {new Date(r.createdAt).toLocaleDateString("ko-KR")}
                            </span>
                          </div>
                          <p className="text-sm text-teczen-gray-700 truncate">{r.userAnswer}</p>
                        </div>
                        <div className="ml-3 text-right shrink-0">
                          <div className="font-black text-2xl text-teczen-blue">{r.score || "—"}</div>
                          <div className="text-xs text-teczen-blue font-semibold">상세보기 →</div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "study" && (
          <div className="grid md:grid-cols-2 gap-4">
            {TYPE_INFO.map((t) => (
              <Link
                key={t.type}
                href={`/study/${t.type}`}
                className="block bg-white border-2 border-teczen-gray-200 hover:border-teczen-blue rounded-2xl p-6 transition-colors"
              >
                <div className="text-xs font-bold text-teczen-red mb-2">유형 {t.type}</div>
                <h3 className="text-2xl font-black text-teczen-ink mb-2">{t.name}</h3>
                <p className="text-sm text-teczen-gray-600 mb-4">{t.desc}</p>
                <div className="text-sm font-bold text-teczen-blue">학습 시작 →</div>
              </Link>
            ))}
          </div>
        )}

        {activeTab === "mock" && (
          <div className="bg-white rounded-2xl border border-teczen-gray-200 p-8 text-center">
            <h3 className="text-2xl font-black text-teczen-ink mb-2">
              <span className="highlight-blue">실전</span> 모의고사
            </h3>
            <p className="text-teczen-gray-600 mb-6">점수대별 50회 세트. 13분 4유형 연속.</p>
            <Link
              href="/mock"
              className="inline-block px-8 py-3.5 bg-teczen-blue text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
            >
              모의고사 목록 보기 →
            </Link>
          </div>
        )}

        {activeTab === "stats" && (
          <div className="bg-white rounded-2xl border border-teczen-gray-200 p-8 text-center">
            <h3 className="text-2xl font-black text-teczen-ink mb-2">학습 분석</h3>
            <p className="text-teczen-gray-600 mb-6">유형별 강약점·점수 추이·모의고사 히스토리</p>
            <Link
              href="/stats"
              className="inline-block px-8 py-3.5 bg-teczen-blue text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
            >
              통계 보러가기 →
            </Link>
          </div>
        )}
      </main>

      <AppLaunchPopup />
      {selectedRecord && (
        <RecordDetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}
      {showRanking && (
        <FlameRankingModal
          onClose={() => setShowRanking(false)}
          currentUser={
            session && settings.flame
              ? {
                  employeeId: session.employeeId,
                  name: session.name,
                  team: session.team || "",
                  position: session.position || "",
                  flameLevel: decayedFlame(settings.flame).level,
                  flameColor: settings.flame.color,
                  flameStreak: decayedFlame(settings.flame).streak,
                }
              : null
          }
        />
      )}
    </>
  );
}

function FlameSection({
  settings,
  onColorChange,
  onShowRanking,
}: {
  settings: UserSettings;
  onColorChange: (c: string) => void;
  onShowRanking: () => void;
}) {
  const flame = decayedFlame(settings.flame);
  const isLit = flame.level > 0;
  const color = flame.color || FLAME_COLORS[0].value;

  return (
    <div className="bg-white rounded-2xl border border-teczen-gray-200 p-6 md:p-8">
      <div className="grid md:grid-cols-[160px_1fr_auto] gap-6 items-center">
        <div className="flex justify-center">
          <Flame level={flame.level} color={color} size={140} />
        </div>

        <div className="text-center md:text-left">
          {isLit ? (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teczen-blue/10 text-teczen-blue text-xs font-bold mb-2">
                🔥 {flame.streak}일째 불꽃 키우는 중!
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-teczen-ink mb-1">
                {flame.level >= MAX_FLAME_LEVEL ? (
                  <>불꽃이 <span className="highlight-blue">최고조</span>예요!</>
                ) : (
                  <>불씨가 <span className="highlight-blue">점점 커져요!</span></>
                )}
              </h2>
              <p className="text-sm text-teczen-gray-600 mb-2">
                {flame.level >= MAX_FLAME_LEVEL
                  ? `Lv ${flame.level} / ${MAX_FLAME_LEVEL} · 매일 한 문제씩 풀면 불꽃이 유지돼요.`
                  : `Lv ${flame.level} / ${MAX_FLAME_LEVEL} · 오늘 한 문제만 더 풀면 다음 단계로! 하루라도 빠지면 한 단계 작아져요.`}
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teczen-gray-100 text-teczen-gray-600 text-xs font-bold mb-2">
                불꽃이 꺼져있어요
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-teczen-ink mb-1">
                학습을 시작해서 <span className="highlight-blue">불꽃을 키워주세요!</span>
              </h2>
              <p className="text-sm text-teczen-gray-600">
                하루에 한 문제씩 학습하면 불꽃이 커집니다 (최대 {MAX_FLAME_LEVEL}단계)
              </p>
            </>
          )}
        </div>

        <div className="flex md:flex-col gap-3 items-center md:items-end">
          <div className="flex md:flex-col gap-2 items-center">
            <span className="text-xs text-teczen-gray-500">색상</span>
            <div className="flex md:flex-col gap-1.5">
              {FLAME_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => onColorChange(c.value)}
                  title={c.name}
                  className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${
                    color === c.value ? "ring-2 ring-offset-1 ring-teczen-ink" : ""
                  }`}
                  style={{ background: c.value }}
                />
              ))}
            </div>
          </div>
          <button
            onClick={onShowRanking}
            className="px-3 py-2 bg-teczen-blue text-white text-xs font-bold rounded-lg hover:bg-blue-700 whitespace-nowrap"
          >
            🏆 불꽃 랭킹 →
          </button>
        </div>
      </div>
    </div>
  );
}

interface RankingUser {
  employeeId: string;
  name: string;
  team: string;
  position: string;
  flameLevel: number;
  flameColor: string;
  flameStreak: number;
}

function FlameRankingModal({
  onClose,
  currentUser,
}: {
  onClose: () => void;
  currentUser: RankingUser | null;
}) {
  const [serverEntries, setServerEntries] = useState<RankingEntry[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchRanking().then((entries) => {
      if (alive) setServerEntries(entries);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 공용 저장소에 실제 데이터가 있으면 그걸 쓰고, 아직 없으면(초기) mock 으로 자리만 채움
  const base: RankingUser[] =
    serverEntries && serverEntries.length > 0 ? serverEntries : getFlameTop5();
  const combined: RankingUser[] = [...base];
  if (currentUser && currentUser.flameLevel > 0) {
    const existing = combined.findIndex((l) => l.employeeId === currentUser.employeeId);
    if (existing >= 0) combined[existing] = currentUser;
    else combined.push(currentUser);
  }
  const sorted = [...combined].sort(
    (a, b) => b.flameLevel - a.flameLevel || b.flameStreak - a.flameStreak,
  );
  const top5 = sorted.slice(0, 5);
  const myRank = currentUser
    ? sorted.findIndex((l) => l.employeeId === currentUser.employeeId) + 1
    : 0;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs font-bold text-teczen-red mb-1">FLAME RANKING</div>
            <h2 className="text-2xl font-black text-teczen-ink">🏆 불꽃 TOP 5</h2>
            <p className="text-xs text-teczen-gray-500 mt-1">실시간 학습자 불꽃 순위</p>
          </div>
          <button
            onClick={onClose}
            className="text-teczen-gray-400 hover:text-teczen-ink text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {top5.length === 0 ? (
          <div className="text-center py-12 text-teczen-gray-500 text-sm">
            아직 불꽃을 켠 학습자가 없어요
          </div>
        ) : (
          <div className="space-y-3">
            {top5.map((l, i) => {
              const isMe = currentUser && l.employeeId === currentUser.employeeId;
              return (
              <div
                key={l.employeeId}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  isMe
                    ? "bg-teczen-blue/10 border-2 border-teczen-blue"
                    : i === 0
                    ? "bg-gradient-to-r from-amber-50 to-transparent border border-amber-200"
                    : "bg-teczen-gray-50"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold ${
                    i === 0
                      ? "bg-amber-400 text-white"
                      : i === 1
                      ? "bg-teczen-gray-300 text-teczen-ink"
                      : i === 2
                      ? "bg-amber-200 text-amber-900"
                      : "bg-teczen-gray-100 text-teczen-gray-600"
                  }`}
                >
                  {i + 1}
                </div>
                <div className="flex items-center justify-center" style={{ width: 48, height: 48 }}>
                  <Flame level={l.flameLevel} color={l.flameColor} size={48} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-teczen-ink">{l.name}</div>
                  <div className="text-xs text-teczen-gray-500">
                    {l.team} · {l.position}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-black text-lg" style={{ color: l.flameColor }}>
                    Lv {l.flameLevel}
                  </div>
                  <div className="text-xs text-teczen-gray-500">{l.flameStreak}일째</div>
                </div>
              </div>
              );
            })}
            {currentUser && currentUser.flameLevel > 0 && myRank > 5 && (
              <div className="mt-3 pt-3 border-t border-teczen-gray-200">
                <div className="text-xs text-teczen-gray-500 mb-2">내 순위</div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-teczen-blue/10 border-2 border-teczen-blue">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold bg-teczen-blue text-white">
                    {myRank}
                  </div>
                  <div className="flex items-center justify-center" style={{ width: 48, height: 48 }}>
                    <Flame level={currentUser.flameLevel} color={currentUser.flameColor} size={48} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-teczen-ink">{currentUser.name} (나)</div>
                    <div className="text-xs text-teczen-gray-500">
                      {currentUser.team} · {currentUser.position}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-black text-lg" style={{ color: currentUser.flameColor }}>
                      Lv {currentUser.flameLevel}
                    </div>
                    <div className="text-xs text-teczen-gray-500">{currentUser.flameStreak}일째</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RecordDetailModal({
  record,
  onClose,
}: {
  record: StudyRecord;
  onClose: () => void;
}) {
  const fb = record.feedback;
  const criteriaLabels: Record<string, string> = {
    pronunciation: "발음",
    vocabulary: "어휘",
    grammar: "문법",
    fluency: "발화량",
    coherence: "일관성",
  };
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs font-bold text-teczen-red mb-1">
              유형 {record.type} · {new Date(record.createdAt).toLocaleString("ko-KR")}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-black text-4xl text-teczen-blue">{record.score ?? "—"}</span>
              <span className="text-teczen-gray-500">/ 96</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-teczen-gray-400 hover:text-teczen-ink text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <div className="text-xs font-bold text-teczen-gray-500 mb-1">내 답변</div>
          <p className="text-sm text-teczen-gray-800 bg-teczen-gray-50 p-3 rounded-xl leading-relaxed whitespace-pre-wrap">
            {record.userAnswer || "(답변 없음)"}
          </p>
        </div>

        {fb?.criteria && (
          <div className="mb-4">
            <div className="text-xs font-bold text-teczen-gray-500 mb-2">평가 기준별 점수</div>
            <div className="space-y-2">
              {Object.entries(criteriaLabels).map(([key, label]) => {
                const v = (fb.criteria as any)[key] ?? 0;
                const color = v >= 75 ? "bg-green-500" : v >= 50 ? "bg-teczen-blue" : v >= 30 ? "bg-amber-500" : "bg-teczen-red";
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="font-semibold text-teczen-gray-700">{label}</span>
                      <span className="font-bold tabular-nums">{v}</span>
                    </div>
                    <div className="w-full bg-teczen-gray-100 rounded-full h-2">
                      <div className={`${color} h-2 rounded-full`} style={{ width: `${v}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {fb && fb.improvements.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-bold text-teczen-red mb-1">개선 포인트</div>
            <ul className="text-sm text-teczen-gray-700 space-y-1">
              {fb.improvements.map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          </div>
        )}

        {fb && fb.grammarIssues.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-bold text-teczen-gray-500 mb-1">문법 교정</div>
            <ul className="text-sm text-teczen-gray-700 space-y-1">
              {fb.grammarIssues.map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          </div>
        )}

        {fb?.modelAnswer && (
          <div>
            <div className="text-xs font-bold text-teczen-gray-500 mb-1">모범 답안</div>
            <p className="text-sm text-teczen-gray-700 bg-teczen-blue/5 p-3 rounded-xl leading-relaxed">
              {fb.modelAnswer}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-3 text-base font-bold transition-colors relative ${
        active ? "text-teczen-blue" : "text-teczen-gray-500 hover:text-teczen-ink"
      }`}
    >
      {children}
      {active && (
        <span className="absolute left-3 right-3 -bottom-px h-0.5 bg-teczen-blue rounded-full" />
      )}
    </button>
  );
}

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: "red" | "blue" | "green" | "gray";
}) {
  const colors = {
    red: "text-teczen-red",
    blue: "text-teczen-blue",
    green: "text-green-600",
    gray: "text-teczen-gray-700",
  };
  return (
    <div className="bg-white border border-teczen-gray-200 rounded-2xl p-5">
      <div className="text-xs font-bold text-teczen-gray-500 uppercase tracking-wider mb-2">
        {label}
      </div>
      <div className={`font-black text-4xl ${colors[accent]} mb-1`}>{value}</div>
      <div className="text-xs text-teczen-gray-500">{sub}</div>
    </div>
  );
}

