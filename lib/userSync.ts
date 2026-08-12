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
 * 서버 설정과 로컬 설정을 필드별로 안전하게 병합.
 *
 * ⚠️ 단순 스프레드({...local, ...remote}) 는 쓰면 안 됨.
 *    remote 가 오래된 값(예: 예전 API 키)을 갖고 있으면 방금 이 기기에서 입력한
 *    값을 덮어써서 "인증은 되는데 실제 호출은 실패" 같은 증상이 남.
 *
 * 규칙:
 *  - hchatApiKey: 로컬에 값이 있으면 로컬 우선 (이 기기에서 직접 입력한 게 정답).
 *                 로컬이 비어있을 때만 서버 값으로 복원 (새 기기 최초 로그인).
 *  - examDate / targetLevel / hchatModel: 서버 값이 있으면 서버 우선 (기기 간 공유 대상).
 *  - 불린 플래그: 한 번 true 면 false 로 되돌리지 않음 (진행 상태 후퇴 방지).
 *  - flame: 더 최근에 학습한 쪽(lastStudyDay)을 채택. 같으면 레벨/연속일이 큰 쪽.
 */
function mergeSettings(local: UserSettings, remote: UserSettings): UserSettings {
  const pickFlame = () => {
    const l = local.flame;
    const r = remote.flame;
    if (!l) return r;
    if (!r) return l;
    if ((l.lastStudyDay || "") !== (r.lastStudyDay || "")) {
      return (l.lastStudyDay || "") > (r.lastStudyDay || "") ? l : r;
    }
    if (l.level !== r.level) return l.level > r.level ? l : r;
    return l.streak >= r.streak ? l : r;
  };

  return {
    ...local,
    // 기기 간 공유 대상 — 서버 값이 있으면 서버 우선
    examDate: remote.examDate || local.examDate,
    targetLevel: remote.targetLevel || local.targetLevel,
    hchatModel: remote.hchatModel || local.hchatModel,
    hchatEndpoint: remote.hchatEndpoint || local.hchatEndpoint,
    // API 키 — 로컬 우선. 로컬이 비었을 때만 서버에서 복원
    hchatApiKey: local.hchatApiKey || remote.hchatApiKey || "",
    // 진행 플래그 — 한 번 true 면 유지
    setupCompleted: local.setupCompleted || remote.setupCompleted || false,
    onboardingSeen: local.onboardingSeen || remote.onboardingSeen,
    onboardingSkipForever:
      local.onboardingSkipForever || remote.onboardingSkipForever,
    noticesAccepted: local.noticesAccepted || remote.noticesAccepted,
    flame: pickFlame(),
  };
}

/**
 * 서버(KV)에서 본인 데이터를 가져와 localStorage 에 복원.
 * 회사 PC 가 브라우저 종료 시 캐시를 지워도, 다음 로그인 때 자동 복원되도록.
 * 호출 시점: 로그인/등록 성공 직후, 대시보드 진입 시.
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
      storage.saveSettings(mergeSettings(local, remote.settings));
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
