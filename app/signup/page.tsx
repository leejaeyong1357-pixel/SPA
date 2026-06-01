"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { storage } from "@/lib/storage";
import { hashPassword, getStoredPwHash, setStoredPwHash } from "@/lib/passwordStore";
import { pushUserToServer, pullUserFromServer } from "@/lib/userSync";
import Button from "@/components/ui/Button";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const trimmedId = employeeId.trim();
    if (!trimmedName || !trimmedId) {
      setError("이름과 사번을 입력해주세요.");
      return;
    }
    if (pw.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (pw !== pwConfirm) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, employeeId: trimmedId }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "직원 정보를 확인할 수 없습니다. 사번·이름을 다시 확인해주세요.");
        setLoading(false);
        return;
      }

      const u = data.user;
      const serverId = String(u.employeeId);

      // 이미 서버에 등록되어 있으면 막음 (다른 PC 에서 등록한 경우 포함)
      const existingRes = await fetch(
        `/api/user-settings?employeeId=${encodeURIComponent(serverId)}`,
        { cache: "no-store" },
      );
      const existing = await existingRes.json();
      if (existing?.data?.pwHash || getStoredPwHash(serverId)) {
        setError("이미 등록된 사번입니다. 로그인 페이지로 이동해 주세요.");
        setLoading(false);
        return;
      }

      const hash = await hashPassword(pw);
      setStoredPwHash(serverId, hash);

      storage.saveSession({
        name: u.name,
        employeeId: serverId,
        rrnFront: "",
        team: u.team,
        position: u.position,
        loggedInAt: Date.now(),
        isAdmin: false,
      });

      // 등록 직후 비번 해시를 서버에 올려 다른 PC 에서도 로그인 가능하게
      await pushUserToServer();
      await pullUserFromServer(serverId); // 혹시 모를 기존 설정 복원

      const s = storage.getSettings();
      if (!s.onboardingSeen && !s.onboardingSkipForever) {
        router.push("/onboarding");
      } else if (!s.setupCompleted) {
        router.push("/setup");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError("서버 오류: " + (err?.message || "unknown"));
      setLoading(false);
    }
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
          <p className="text-sm text-teczen-gray-600">처음이신가요? 등록하고 시작해보세요</p>
        </div>

        <form
          onSubmit={submit}
          className="bg-white rounded-3xl border border-teczen-gray-200 shadow-sm p-8 space-y-5"
        >
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
            <label className="block text-xs font-bold text-teczen-gray-700 mb-1.5">
              비밀번호 <span className="text-teczen-gray-400 font-normal">(6자 이상)</span>
            </label>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="영문·숫자·특수문자 조합 권장"
              className="w-full border-2 border-teczen-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-teczen-navy transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-teczen-gray-700 mb-1.5">
              비밀번호 확인
            </label>
            <input
              type="password"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              placeholder="다시 한 번 입력"
              className="w-full border-2 border-teczen-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-teczen-navy transition-colors"
            />
          </div>

          {error && (
            <div className="text-sm text-teczen-red bg-teczen-red/5 border border-teczen-red/20 p-3 rounded-xl">
              {error}
            </div>
          )}

          <Button type="submit" fullWidth disabled={loading} size="lg">
            {loading ? "등록 중..." : "등록 완료 →"}
          </Button>

          <div className="text-center text-xs text-teczen-gray-500">
            이미 등록했다면{" "}
            <Link href="/login" className="text-teczen-navy font-bold underline">
              로그인
            </Link>
          </div>

          <div className="text-[11px] text-teczen-gray-400 text-center leading-relaxed pt-2 border-t border-teczen-gray-100">
            비밀번호는 본인 PC에 SHA-256 해시로만 저장됩니다.
            <br />
            서버나 관리자에게 전송되지 않습니다.
          </div>
        </form>
      </div>
    </main>
  );
}
