"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { levelLabel } from "@/lib/scoring";
import Header from "@/components/layout/Header";
import {
  getAllLearners,
  getAdminStats,
  getTop5,
  getTeamAverages,
  getLevelDistribution,
  getFlameTop5,
  AdminLearnerRow,
} from "@/lib/adminData";
import Flame from "@/components/Flame";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { TECZEN_COLORS, CHART_MONO_NAVY } from "@/lib/colors";

interface RealLearner {
  employeeId: string;
  name: string;
  team: string;
  position: string;
  targetLevel: number;
  totalProblems: number;
  mockExamCount: number;
  avgScore: number;
  recentScore: number;
  lastActiveAt: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "started" | "not_started">("all");
  const [realLearners, setRealLearners] = useState<RealLearner[]>([]);

  useEffect(() => {
    fetch("/api/admin/learners", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && Array.isArray(d.learners)) setRealLearners(d.learners);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const session = storage.getSession();
    if (!session) {
      router.push("/login");
      return;
    }
    if (!session.isAdmin) {
      alert("관리자 권한이 필요합니다.");
      router.push("/dashboard");
      return;
    }
    setMounted(true);
  }, [router]);

  const stats = useMemo(() => {
    if (!mounted) return null;
    if (realLearners.length === 0) return getAdminStats();
    // 실제 데이터 기반으로 재계산
    const base = getAllLearners();
    const realMap = new Map(realLearners.map((r) => [r.employeeId, r]));
    const merged = base.map((l) => {
      const r = realMap.get(l.employeeId);
      if (!r) return l;
      const isActive = r.lastActiveAt > 0 && Date.now() - r.lastActiveAt < 7 * 86400000;
      return {
        ...l,
        status: (r.totalProblems === 0 ? "not_started" : isActive ? "active" : "inactive") as AdminLearnerRow["status"],
        targetLevel: r.targetLevel || l.targetLevel,
        totalProblems: r.totalProblems,
        mockExamCount: r.mockExamCount,
        averageScore: r.avgScore,
        recentScore: r.recentScore,
        estimatedLevel: r.avgScore > 0 ? Math.max(1, Math.min(8, Math.round(r.avgScore / 12))) : l.estimatedLevel,
      };
    });
    const started = merged.filter((l) => l.status !== "not_started");
    const active = merged.filter((l) => l.status === "active");
    const reached = started.filter(
      (l) => l.targetLevel && l.estimatedLevel && l.estimatedLevel >= l.targetLevel,
    );
    const avgScore = started.length
      ? Math.round(started.reduce((s, l) => s + l.averageScore, 0) / started.length)
      : 0;
    return {
      total: merged.length,
      started: started.length,
      notStarted: merged.length - started.length,
      active: active.length,
      avgScore,
      avgHours: 0,
      targetReached: reached.length,
    };
  }, [mounted, realLearners]);
  const flameTop = useMemo(() => (mounted ? getFlameTop5() : []), [mounted]);
  const allWithFlame = useMemo(
    () =>
      mounted
        ? getAllLearners()
            .filter((l) => l.flameLevel > 0)
            .sort((a, b) => b.flameLevel - a.flameLevel || b.flameStreak - a.flameStreak)
        : [],
    [mounted],
  );
  const avgFlame = allWithFlame.length > 0
    ? (allWithFlame.reduce((s, l) => s + l.flameLevel, 0) / allWithFlame.length).toFixed(1)
    : "0";
  const teamAvgs = useMemo(() => (mounted ? getTeamAverages() : []), [mounted]);
  const levelDist = useMemo(() => (mounted ? getLevelDistribution() : []), [mounted]);
  const allLearners = useMemo(() => {
    if (!mounted) return [];
    const base = getAllLearners();
    if (realLearners.length === 0) return base;
    const realMap = new Map(realLearners.map((r) => [r.employeeId, r]));
    return base.map((l) => {
      const r = realMap.get(l.employeeId);
      if (!r) return l;
      const isActive = r.lastActiveAt > 0 && Date.now() - r.lastActiveAt < 7 * 86400000;
      const status: AdminLearnerRow["status"] =
        r.totalProblems === 0 ? "not_started" : isActive ? "active" : "inactive";
      return {
        ...l,
        status,
        targetLevel: r.targetLevel || l.targetLevel,
        totalProblems: r.totalProblems,
        mockExamCount: r.mockExamCount,
        averageScore: r.avgScore,
        recentScore: r.recentScore,
        lastActiveAt: r.lastActiveAt || l.lastActiveAt,
      };
    });
  }, [mounted, realLearners]);

  const top5 = useMemo(() => {
    if (!mounted) return [];
    return [...allLearners]
      .filter((l) => l.status !== "not_started" && l.recentScore > 0)
      .sort((a, b) => b.recentScore - a.recentScore)
      .slice(0, 5);
  }, [mounted, allLearners]);

  if (!mounted || !stats) return null;

  const filtered = allLearners.filter((l) => {
    if (statusFilter === "started" && l.status === "not_started") return false;
    if (statusFilter === "not_started" && l.status !== "not_started") return false;
    if (teamFilter && l.team !== teamFilter) return false;
    if (search && !l.name.includes(search) && !l.team.includes(search) && !l.employeeId.includes(search)) return false;
    return true;
  });

  const allTeams = Array.from(new Set(allLearners.map((l) => l.team))).sort();

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto p-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <Link href="/dashboard" className="text-xs text-teczen-gray-600 hover:text-teczen-navy">
              ← 대시보드
            </Link>
            <h1 className="hero-headline text-3xl text-teczen-ink mt-1">관리자 대시보드</h1>
            <p className="text-sm text-teczen-gray-600">
              전체 임직원 {stats.total}명 · 학습 시작 {stats.started}명 · 이번 주 활동 {stats.active}명
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-5 gap-4 mb-6">
          <StatCard label="전체 임직원" value={`${stats.total}명`} sub={`${allTeams.length}개 팀`} accent="navy" />
          <StatCard label="학습 시작" value={`${stats.started}명`} sub={`참여율 ${Math.round((stats.started / stats.total) * 100)}%`} accent="navy" />
          <StatCard label="평균 점수" value={`${stats.avgScore}점`} sub="학습 시작자 기준" accent="navy" />
          <StatCard label="목표 도달자" value={`${stats.targetReached}명`} sub={`달성률 ${stats.started > 0 ? Math.round((stats.targetReached / stats.started) * 100) : 0}%`} accent="red" />
          <StatCard label="🔥 평균 불꽃" value={`Lv ${avgFlame}`} sub={`켜진 불꽃 ${allWithFlame.length}명`} accent="navy" />
        </div>

        <div className="bg-white rounded-3xl p-6 border border-teczen-gray-200 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-teczen-ink">🏆 우수 학습자 TOP 5</h2>
            <span className="text-xs text-teczen-gray-500">최근 모의고사 점수 기준</span>
          </div>
          <div className="space-y-2">
            {top5.length === 0 ? (
              <div className="text-center py-8 text-teczen-gray-500 text-sm">아직 학습 데이터가 없습니다</div>
            ) : (
              top5.map((l, i) => (
                <div
                  key={l.employeeId}
                  className={`flex items-center gap-4 p-3 rounded-xl ${
                    i === 0
                      ? "bg-gradient-to-r from-teczen-navy/5 to-transparent border border-teczen-navy/20"
                      : "bg-teczen-gray-50"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-lg ${
                      i === 0
                        ? "bg-teczen-navy text-white"
                        : i === 1
                        ? "bg-teczen-gray-300 text-teczen-ink"
                        : i === 2
                        ? "bg-amber-200 text-amber-900"
                        : "bg-teczen-gray-100 text-teczen-gray-600"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-teczen-ink">{l.name}</span>
                      <span className="text-xs text-teczen-gray-500">
                        {l.team} · {l.position} ({l.grade})
                      </span>
                    </div>
                    <div className="text-xs text-teczen-gray-600">
                      목표 Lv {l.targetLevel} · 학습 {l.totalProblems}문제 · 모의고사 {l.mockExamCount}회
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-brand text-2xl text-teczen-navy">{l.recentScore}</div>
                    <div className="text-xs text-teczen-gray-500">
                      {l.estimatedLevel ? levelLabel(l.estimatedLevel as any) : "—"}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-3xl p-6 border border-teczen-gray-200">
            <h2 className="font-bold text-lg text-teczen-ink mb-3">팀별 인원 / 평균</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={teamAvgs} layout="vertical" margin={{ left: 110 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="team" width={110} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="total" fill={TECZEN_COLORS.navyLight} radius={[0, 6, 6, 0]} name="전체" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-teczen-gray-200">
            <h2 className="font-bold text-lg text-teczen-ink mb-3">목표 등급 분포</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={levelDist}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="level" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {levelDist.map((_, i) => (
                    <Cell key={i} fill={CHART_MONO_NAVY[i % CHART_MONO_NAVY.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-teczen-gray-200">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-bold text-lg text-teczen-ink">전체 학습자 ({filtered.length}명)</h2>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-sm border border-teczen-gray-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-teczen-navy"
              >
                <option value="all">전체 상태</option>
                <option value="started">학습 시작</option>
                <option value="not_started">미시작</option>
              </select>
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="text-sm border border-teczen-gray-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-teczen-navy"
              >
                <option value="">전체 팀</option>
                {allTeams.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="이름/사번/팀 검색"
                className="text-sm border border-teczen-gray-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-teczen-navy"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-teczen-gray-500 border-b border-teczen-gray-200">
                  <th className="text-left py-2 px-2">이름 / 사번</th>
                  <th className="text-left py-2 px-2">팀 / 직위 / 직급</th>
                  <th className="text-center py-2 px-2">상태</th>
                  <th className="text-center py-2 px-2">🔥 불꽃</th>
                  <th className="text-center py-2 px-2">목표</th>
                  <th className="text-center py-2 px-2">현재</th>
                  <th className="text-right py-2 px-2">평균</th>
                  <th className="text-right py-2 px-2">최근</th>
                  <th className="text-right py-2 px-2">문제</th>
                  <th className="text-right py-2 px-2">모의고사</th>
                  <th className="text-right py-2 px-2">접속</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map((l) => (
                  <tr key={l.employeeId} className="border-b border-teczen-gray-100 hover:bg-teczen-gray-50">
                    <td className="py-2 px-2">
                      <div className="font-bold text-teczen-ink">{l.name}</div>
                      <div className="text-xs text-teczen-gray-500 font-mono">{l.employeeId}</div>
                    </td>
                    <td className="py-2 px-2 text-teczen-gray-700">
                      <div>{l.team}</div>
                      <div className="text-xs text-teczen-gray-500">
                        {l.position} · {l.grade}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="py-2 px-2 text-center">
                      {l.flameLevel > 0 ? (
                        <div className="inline-flex items-center gap-1">
                          <span style={{ color: l.flameColor }}>🔥</span>
                          <span className="font-bold" style={{ color: l.flameColor }}>
                            Lv {l.flameLevel}
                          </span>
                          <span className="text-xs text-teczen-gray-500">
                            ({l.flameStreak}일)
                          </span>
                        </div>
                      ) : (
                        <span className="text-teczen-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-teczen-navy">
                      {l.targetLevel ? `Lv ${l.targetLevel}` : "—"}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {l.estimatedLevel ? (
                        <span
                          className={
                            l.targetLevel && l.estimatedLevel >= l.targetLevel
                              ? "text-green-600 font-bold"
                              : "text-teczen-gray-700"
                          }
                        >
                          Lv {l.estimatedLevel}
                        </span>
                      ) : (
                        <span className="text-teczen-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right font-mono">{l.averageScore || "—"}</td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-teczen-navy">
                      {l.recentScore || "—"}
                    </td>
                    <td className="py-2 px-2 text-right text-teczen-gray-700">{l.totalProblems || "—"}</td>
                    <td className="py-2 px-2 text-right text-teczen-gray-700">
                      {l.mockExamCount ? `${l.mockExamCount}회` : "—"}
                    </td>
                    <td className="py-2 px-2 text-right text-xs text-teczen-gray-500">
                      {l.lastActiveAt ? new Date(l.lastActiveAt).toLocaleDateString("ko-KR") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 100 && (
              <div className="text-center text-xs text-teczen-gray-500 mt-3">
                상위 100명 표시 (검색/필터로 좁혀보세요)
              </div>
            )}
          </div>
        </div>

        <AssetsAdmin />

      </main>
    </>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: "navy" | "red" }) {
  return (
    <div className="bg-white rounded-3xl p-5 border border-teczen-gray-200">
      <div className="text-xs font-bold text-teczen-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`font-brand text-3xl mb-1 ${accent === "red" ? "text-teczen-red" : "text-teczen-navy"}`}>{value}</div>
      <div className="text-xs text-teczen-gray-500">{sub}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: AdminLearnerRow["status"] }) {
  if (status === "active") {
    return <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full font-semibold">활성</span>;
  }
  if (status === "inactive") {
    return <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-semibold">휴면</span>;
  }
  return <span className="text-xs px-2 py-0.5 bg-teczen-gray-100 text-teczen-gray-600 rounded-full">미시작</span>;
}

function AssetsAdmin() {
  return (
    <div className="mt-10 bg-white rounded-3xl border border-teczen-gray-200 p-6">
      <h2 className="text-xl font-black text-teczen-ink mb-1">📎 HChat API 가이드 업로드</h2>
      <p className="text-sm text-teczen-gray-600 mb-5">
        학습자가 설정·마이페이지·대시보드 상단에서 보고 다운받을 PDF를 업로드합니다.
      </p>
      <div className="max-w-md">
        <AssetUploader
          assetKey="api-key-guide"
          title="📘 HChat API 키 발급 가이드 (PDF)"
          accept="application/pdf"
          desc="설정·마이페이지·대시보드 상단 'HChat 연동법' 버튼에 노출됨"
        />
      </div>
    </div>
  );
}

function AssetUploader({
  assetKey,
  title,
  accept,
  desc,
}: {
  assetKey: string;
  title: string;
  accept: string;
  desc: string;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleFile = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      setMsg({ ok: false, text: "20MB 이하 파일만 업로드 가능합니다." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error("파일 읽기 실패"));
        r.readAsDataURL(file);
      });
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: assetKey, dataUrl, filename: file.name }),
      });
      const data = await res.json();
      if (!data.ok) {
        setMsg({ ok: false, text: data.error || "업로드 실패" });
      } else {
        setMsg({ ok: true, text: `✓ 업로드 완료 (${file.name})` });
      }
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || "오류" });
    }
    setBusy(false);
  };

  return (
    <div className="p-4 rounded-2xl border-2 border-teczen-gray-200 hover:border-teczen-blue transition-colors">
      <div className="font-bold text-teczen-ink mb-1">{title}</div>
      <div className="text-xs text-teczen-gray-500 mb-3">{desc}</div>
      <label className="inline-block">
        <input
          type="file"
          accept={accept}
          disabled={busy}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        <span
          className={`inline-block px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition-colors ${
            busy
              ? "bg-teczen-gray-200 text-teczen-gray-500"
              : "bg-teczen-blue text-white hover:bg-blue-700"
          }`}
        >
          {busy ? "업로드 중..." : "파일 선택"}
        </span>
      </label>
      {msg && (
        <div
          className={`mt-3 text-xs px-3 py-2 rounded-lg ${
            msg.ok
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {msg.text}
        </div>
      )}
    </div>
  );
}
