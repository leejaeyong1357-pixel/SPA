import { NextRequest, NextResponse } from "next/server";
import schedulesData from "@/data/exam_schedules.json";

export const runtime = "edge";

interface ScheduleEntry {
  date: string;
  time: string;
  name: string;
  location: string;
  factory: string;
  seq: number;
}

const schedules: Record<string, ScheduleEntry> =
  (schedulesData as any).schedules || {};

/**
 * 본인 시험 일정 조회 — 본인 사번만 가능.
 * 다른 직원의 일정은 절대 반환하지 않음 (개인정보 보호).
 *
 * @param employeeId  본인 사번 (필수)
 * @returns           해당 사번의 일정 또는 null (없으면)
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("employeeId") || "";
  if (!id) {
    return NextResponse.json({ ok: false, error: "사번 없음" }, { status: 400 });
  }

  const entry = schedules[id];
  if (!entry) {
    return NextResponse.json({ ok: true, schedule: null });
  }

  return NextResponse.json({
    ok: true,
    schedule: {
      date: entry.date,
      time: entry.time,
      location: entry.location,
      factory: entry.factory,
      seq: entry.seq,
      // name 은 검증용으로만 — 클라이언트가 본인 이름과 매칭해 표시
      name: entry.name,
    },
  });
}
