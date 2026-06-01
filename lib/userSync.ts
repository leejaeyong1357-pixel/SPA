"use client";

import type { UserSettings } from "@/types";
import { storage } from "./storage";
import { pwKey, setStoredPwHash } from "./passwordStore";

interface ServerUser {
  settings: UserSettings | null;
  pwHash: string | null;
  updatedAt: number;
}

/**
 * 서버(KV)에서 본인 데이터를 가져와 localStorage 에 복원.
 * 회사 PC 가 브라우저 종료 시 캐시를 지워도, 다음 로그인 때 자동 복원되도록.
 * 호출 시점: 로그인/등록 성공 직후 (세션 저장 후).
 */
export async function pullUserFromServer(employeeId: string): Promise<ServerUser | null> {
  try {
    const res = await fetch(
      `/api/user-settings?employeeId=${encodeURIComponent(employeeId)}`,
      { cache: "no-store" },
    );
    const data = await res.json();
    if (!data?.ok || !data.data) return null;

    const remote = data.data as ServerUser;

    if (remote.settings) {
      const local = storage.getSettings();
      // 서버 데이터가 더 최신이면 적용 (단순 머지 — 서버 우선)
      storage.saveSettings({ ...local, ...remote.settings });
    }
    if (remote.pwHash) {
      setStoredPwHash(employeeId, remote.pwHash);
    }
    return remote;
  } catch {
    return null;
  }
}

/**
 * 내 settings + 비번 해시를 서버(KV)에 올림. 실패해도 조용히 무시.
 * 호출 시점: 설정 저장 후, 비번 등록 후.
 */
export async function pushUserToServer(): Promise<void> {
  try {
    const session = storage.getSession();
    if (!session || session.isAdmin) return;

    const settings = storage.getSettings();
    const records = storage.getRecords();
    const mockResults = storage.getMockResults();
    const pwHash =
      typeof window !== "undefined"
        ? localStorage.getItem(pwKey(session.employeeId))
        : null;

    const scores = records.map((r) => r.score || 0).filter((n) => n > 0);
    const avgScore = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    const recentScore = scores.length ? scores[scores.length - 1] : 0;
    const lastRecordAt = records.length
      ? Math.max(...records.map((r) => r.createdAt))
      : 0;

    await fetch("/api/user-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: session.employeeId,
        settings,
        pwHash,
        profile: {
          name: session.name,
          team: session.team || "",
          position: session.position || "",
        },
        stats: {
          totalProblems: records.length,
          mockExamCount: mockResults.length,
          avgScore,
          recentScore,
          lastActiveAt: lastRecordAt,
        },
      }),
    });
  } catch {
    /* 네트워크/미설정 시 무시 */
  }
}
