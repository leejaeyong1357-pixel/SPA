"use client";

import { useEffect, useState } from "react";
import { storage } from "@/lib/storage";

interface Schedule {
  date: string;
  time: string;
  location: string;
  factory: string;
  seq: number;
  name: string;
}

function calcDday(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

function weekday(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
}

export default function ExamScheduleCard() {
  const [schedule, setSchedule] = useState<Schedule | null | "loading">("loading");

  useEffect(() => {
    const session = storage.getSession();
    if (!session) {
      setSchedule(null);
      return;
    }
    fetch(`/api/exam-schedule?employeeId=${encodeURIComponent(session.employeeId)}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => {
        setSchedule(d?.schedule || null);
        // 본인 일정이 있으면 settings.examDate 자동 동기화 (D-day 카운터용)
        if (d?.schedule?.date) {
          const s = storage.getSettings();
          if (s.examDate !== d.schedule.date) {
            storage.saveSettings({ ...s, examDate: d.schedule.date });
          }
        }
      })
      .catch(() => setSchedule(null));
  }, []);

  if (schedule === "loading") return null;
  if (!schedule) {
    return (
      <div className="bg-white border border-teczen-gray-200 rounded-2xl p-5">
        <div className="text-[10px] sm:text-xs font-bold text-teczen-gray-500 uppercase tracking-wider mb-2">
          📅 내 시험 일정
        </div>
        <div className="text-sm text-teczen-gray-600 leading-relaxed">
          확정된 시험 일정이 없습니다.
          <br />
          <span className="text-xs text-teczen-gray-500">
            (미래성장팀 이재용 매니저에게 문의)
          </span>
        </div>
      </div>
    );
  }

  const dday = calcDday(schedule.date);
  const dLabel = dday > 0 ? `D-${dday}` : dday === 0 ? "D-DAY" : `D+${-dday}`;
  const isPast = dday < 0;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 ${
        isPast
          ? "bg-teczen-gray-50 border-teczen-gray-200"
          : "bg-gradient-to-br from-teczen-red/5 via-white to-teczen-blue/5 border-teczen-red/20"
      }`}
    >
      {!isPast && (
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-teczen-red/10 rounded-full blur-2xl pointer-events-none" />
      )}
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] sm:text-xs font-bold text-teczen-red uppercase tracking-wider">
            📅 내 시험 일정
          </div>
          <div
            className={`text-xs font-black px-2 py-0.5 rounded-full ${
              isPast
                ? "bg-teczen-gray-200 text-teczen-gray-600"
                : dday <= 7
                ? "bg-teczen-red text-white"
                : "bg-teczen-blue/10 text-teczen-blue"
            }`}
          >
            {dLabel}
          </div>
        </div>

        <div className="font-black text-2xl sm:text-3xl text-teczen-ink leading-tight mb-1">
          {schedule.date}
          <span className="text-base sm:text-lg font-bold text-teczen-gray-500 ml-2">
            ({weekday(schedule.date)})
          </span>
        </div>
        <div className="font-bold text-lg text-teczen-blue mb-3">
          🕐 {schedule.time}
        </div>

        <div className="border-t border-teczen-gray-200 pt-3 space-y-1.5">
          <div className="flex items-start gap-1.5">
            <span className="text-xs font-bold text-teczen-gray-500 shrink-0 mt-0.5">장소</span>
            <span className="text-sm font-semibold text-teczen-ink leading-snug">
              {schedule.location}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-teczen-gray-500 shrink-0">순번</span>
            <span className="text-sm font-mono font-bold text-teczen-ink">
              {schedule.seq}번
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-teczen-gray-100 text-[11px] text-teczen-gray-500">
          🔒 본인 일정만 표시됩니다. 다른 직원의 일정은 볼 수 없습니다.
        </div>
      </div>
    </div>
  );
}
