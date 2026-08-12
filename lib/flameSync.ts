"use client";

import { decayedFlame } from "./flame";
import { storage } from "./storage";

export interface RankingEntry {
  employeeId: string;
  name: string;
  team: string;
  position: string;
  flameLevel: number;
  flameColor: string;
  flameStreak: number;
}

/** 내 현재 불꽃을 공용 저장소(KV)에 올린다. 실패해도 조용히 무시. */
export async function pushFlame(): Promise<void> {
  try {
    const session = storage.getSession();
    const settings = storage.getSettings();
    if (!session || session.isAdmin || !settings.flame) return;

    const f = decayedFlame(settings.flame);
    if (f.level <= 0) return;

    await fetch("/api/flame", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: session.employeeId,
        name: session.name,
        team: session.team || "",
        position: session.position || "",
        flameLevel: f.level,
        flameColor: settings.flame.color,
        flameStreak: f.streak,
        lastStudyDay: settings.flame.lastStudyDay,
      }),
    });
  } catch {
    /* 네트워크/미설정 시 무시 */
  }
}

/** 공용 저장소에서 전체 불꽃 랭킹을 가져온다. 비어있으면 빈 배열. */
export async function fetchRanking(): Promise<RankingEntry[]> {
  try {
    const res = await fetch("/api/flame", { cache: "no-store" });
    const data = await res.json();
    if (!data?.ok || !Array.isArray(data.entries)) return [];
    return data.entries as RankingEntry[];
  } catch {
    return [];
  }
}
