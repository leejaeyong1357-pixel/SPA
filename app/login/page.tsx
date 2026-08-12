"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { storage } from "@/lib/storage";
import { hashPassword, getStoredPwHash, setStoredPwHash } from "@/lib/passwordStore";
import { pullUserFromServer } from "@/lib/userSync";
import Button from "@/components/ui/Button";

// 코드 노출 시 평문 추출 방지를 위해 SHA-256 해시로 저장.
// 비교 시 입력값을 동일 알고리즘으로 해시 후 (id, pw) 페어가 화이트리스트에 있는지 검증.
const ADMINS: Array<{ idH: string; pwH: string; name: string }> = [
  // 기본 관리자
  {
    idH: "ab8513704d7bfe91003950d8c7fc5b6426488ce945547d9e3be8e1128627c2ea",
    pwH: "778d23214edb22677a254c956305d3d52830e37a53350d0f3ff437a87c20eaa5",
    name: "관리자",
  },
  // ICT 관리자 (teczenict / ictteczen)
  {
    idH: "258cae22d87d673bb66f5d8ca92778a8790e6230a06b4621ed310af5d5e81c04",
    pwH: "b3861fdf986918cc31e7cd80cb7fe291ed54b369a4f0a6bb5ef89356aeadf72a",
    name: "ICT 관리자",
  },
];

async function sha256Hex(s: string): Promise<string> {
  const enc = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"user" | "admin">("user");
  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [userPw, setUserPw] = useState("");
  const [adminPw, setAdminPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const switchMode = (m: "user" | "admin") => {
    setMode(m);
    setError("");
    setName("");
    setEmployeeId("");
    setUserPw("");
    setAdminPw("");
  };

  const navigateAfterLogin = () => {
    const settings = storage.getSettings();
    if (!settings.onboardingSeen && !settings.onboardingSkipForever) {
      router.push("/onboarding");
    } else if (!settings.setupCompleted) {
      router.push("/setup");
    } else if (!settings.noticesAccepted) {
      router.push("/notices");
    } else {
      router.push("/dashboard");
    }
  };

  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedId = employeeId.trim();
    const trimmedName = name.trim();

    if (!trimmedName || !trimmedId) {
      setError("이름과 사번을 입력해주세요.");
      return;
    }
    if (!userPw) {
      setError("비밀번호를 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      // 1) 직원 정보 검증
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, employeeId: trimmedId }),
      });
      const data = await res.json();
      if (!data.ok) {
        setLoading(false);
        setError(data.error || "이름과 사번이 일치하지 않습니다.");
        return;
      }
      const u = data.user;
      const serverId = String(u.employeeId);

      // 2) 비번 해시 확인 — 로컬에 없으면 서버(KV)에서 가져옴
      let storedHash = getStoredPwHash(serverId);
      if (!storedHash) {
        try {
          const r = await fetch(
            `/api/user-settings?employeeId=${encodeURIComponent(serverId)}`,
            { cache: "no-store" },
          );
          const j = await r.json();
          if (j?.data?.pwHash) {
            storedHash = j.data.pwHash as string;
            setStoredPwHash(serverId, storedHash);
          }
        } catch {}
      }
      if (!storedHash) {
        setLoading(false);
        setError("등록된 비밀번호가 없습니다. '등록하기'로 먼저 등록해주세요.");
        return;
      }

      const inputHash = await hashPassword(userPw);
      if (inputHash !== storedHash) {
        setLoading(false);
        setError("비밀번호가 일치하지 않습니다.");
        return;
      }

      // 3) 세션 저장 + 서버에서 설정 복원
      storage.saveSession({
        name: u.name,
        employeeId: serverId,
        rrnFront: "",
        team: u.team,
        position: u.position,
        loggedInAt: Date.now(),
        isAdmin: false,
      });
      await pullUserFromServer(serverId);

      setLoading(false);
      navigateAfterLogin();
    } catch (err: any) {
      setLoading(false);
      setError("서버 오류: " + (err?.message || "unknown"));
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const [idH, pwH] = await Promise.all([
      sha256Hex(employeeId.trim()),
      sha256Hex(adminPw),
    ]);
    const matched = ADMINS.find((a) => a.idH === idH && a.pwH === pwH);
    if (!matched) {
      setError("관리자 인증 실패. ID 또는 비밀번호를 확인하세요.");
      return;
    }

    setLoading(true);
    storage.saveSession({
      name: matched.name,
      employeeId: employeeId.trim(),
      rrnFront: "",
      team: "관리팀",
      position: "Admin",
      loggedInAt: Date.now(),
      isAdmin: true,
    });

    router.push("/admin");
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-white via-blue-50 to-teczen-gray-50">
      <div className="max-w-md w-full">
        <Link href="/landing" className="text-xs text-teczen-gray-600 hover:text-teczen-navy mb-6 inline-block">
          ← 홈으로
        </Link>

        <div className="text-center mb-6">
          <Image
            src="/teczen-logo.webp"
            alt="TECZEN"
            width={100}
            height={24}
            priority
            className="h-6 w-auto mx-auto mb-3"
          />
          <h1 className="font-brand text-3xl text-teczen-navy mb-1">SPEAKZEN</h1>
          <p className="text-sm text-teczen-gray-600">
            {mode === "user" ? "이름·사번·비밀번호로 로그인하세요" : "관리자 인증"}
          </p>
        </div>

        <div className="flex bg-teczen-gray-100 rounded-full p-1 mb-4">
          {(
            [
              { id: "user", label: "이용자" },
              { id: "admin", label: "🔐 관리자" },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => switchMode(m.id)}
              className={`flex-1 py-2 text-sm font-bold rounded-full transition-all ${
                mode === m.id
                  ? "bg-white text-teczen-navy shadow-sm"
                  : "text-teczen-gray-500"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === "user" ? (
          <form onSubmit={handleUserLogin} className="bg-white rounded-3xl border border-teczen-gray-200 shadow-sm p-8 space-y-5">
            <div>
              <label className="block text-xs font-bold text-teczen-gray-700 mb-1.5">이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="w-full border-2 border-teczen-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-teczen-navy transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-teczen-gray-700 mb-1.5">사번</label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="8자리 사원번호"
                className="w-full border-2 border-teczen-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-teczen-navy transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-teczen-gray-700 mb-1.5">비밀번호</label>
              <input
                type="password"
                value={userPw}
                onChange={(e) => setUserPw(e.target.value)}
                placeholder="등록 시 설정한 비밀번호"
                className="w-full border-2 border-teczen-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-teczen-navy transition-colors"
              />
            </div>

            {error && (
              <div className="text-sm text-teczen-red bg-teczen-red/5 border border-teczen-red/20 p-3 rounded-xl">
                {error}
              </div>
            )}

            <Button type="submit" fullWidth disabled={loading} size="lg">
              {loading ? "로그인 중..." : "로그인 →"}
            </Button>

            <div className="text-center text-xs text-teczen-gray-500">
              처음이신가요?{" "}
              <Link href="/signup" className="text-teczen-navy font-bold underline">
                등록하기
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleAdminLogin} className="bg-teczen-navy text-white rounded-3xl shadow-sm p-8 space-y-5">
            <div className="text-center pb-2">
              <div className="text-3xl mb-1">🔐</div>
              <div className="font-bold">관리자 전용</div>
              <div className="text-xs text-blue-200 mt-1">
                학습자 통계 및 운영 데이터 접근
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-blue-200 mb-1.5">관리자 ID</label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="ID"
                className="w-full bg-white/10 border-2 border-white/20 text-white rounded-xl px-4 py-3 font-mono focus:outline-none focus:border-white transition-colors placeholder:text-white/30"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-blue-200 mb-1.5">비밀번호</label>
              <input
                type="password"
                value={adminPw}
                onChange={(e) => setAdminPw(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/10 border-2 border-white/20 text-white rounded-xl px-4 py-3 font-mono focus:outline-none focus:border-white transition-colors placeholder:text-white/30"
              />
            </div>

            {error && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-400/30 p-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-teczen-navy font-bold py-3.5 rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              {loading ? "인증 중..." : "관리자 로그인 →"}
            </button>

            <div className="text-center text-xs text-blue-300">
              승인된 관리자만 접근 가능합니다.
            </div>
          </form>
        )}

        <div className="mt-6 p-4 bg-white rounded-2xl border border-teczen-gray-200">
          <div className="text-xs font-bold text-teczen-gray-500 mb-1">문의사항</div>
          <div className="text-sm text-teczen-ink">
            미래성장팀 <b>이재용 매니저</b>
          </div>
          <a href="tel:055-280-1741" className="text-sm text-teczen-navy font-mono">
            ☎ 055-280-1741
          </a>
        </div>
      </div>
    </main>
  );
}
