"use client";

import { useEffect, useState } from "react";

const KEY = "spa.launchPopupHiddenUntil";

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AppLaunchPopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hiddenUntil = localStorage.getItem(KEY);
    if (hiddenUntil && hiddenUntil >= todayISO()) return;
    const id = setTimeout(() => setShow(true), 400);
    return () => clearTimeout(id);
  }, []);

  const hideToday = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(KEY, todayISO());
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => setShow(false)}
    >
      <div
        className="relative bg-white rounded-3xl max-w-md w-full p-8 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setShow(false)}
          className="absolute top-3 right-4 text-teczen-gray-400 hover:text-teczen-ink text-3xl leading-none"
          aria-label="닫기"
        >
          ×
        </button>

        <div className="inline-block px-3 py-1 bg-teczen-red/10 text-teczen-red text-[10px] font-bold tracking-[0.2em] rounded-full mb-5">
          📢 COMING SOON
        </div>

        <div className="text-6xl mb-4">📱</div>

        <h2 className="text-2xl font-black text-teczen-ink mb-3 leading-tight">
          곧 모바일 앱으로
          <br />
          출시 예정입니다!
        </h2>

        <p className="text-sm text-teczen-gray-600 leading-relaxed mb-6">
          현재는 <b>웹 베타 버전</b>이지만,
          <br />
          곧 <b className="text-teczen-blue">SPEAKZEN 모바일 앱</b>으로 만나뵙겠습니다.
          <br />
          학습 데이터는 자동 연동될 예정이에요.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={hideToday}
            className="px-4 py-3 bg-teczen-gray-100 text-teczen-gray-700 font-bold rounded-xl hover:bg-teczen-gray-200 transition-colors text-sm"
          >
            오늘 하루 보지 않기
          </button>
          <button
            onClick={() => setShow(false)}
            className="px-4 py-3 bg-teczen-blue text-white font-bold rounded-xl hover:bg-blue-700 transition-colors text-sm"
          >
            닫기
          </button>
        </div>

        <p className="text-[11px] text-teczen-gray-400 mt-4">
          미래성장팀 이재용 매니저 · ☎ 055-280-1741
        </p>
      </div>
    </div>
  );
}
