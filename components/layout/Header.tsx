"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { storage } from "@/lib/storage";
import { LEVEL_RANGES } from "@/lib/scoring";
import type { UserSession, Level } from "@/types";

export default function Header() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [targetLevel, setTargetLevel] = useState<Level>(6);
  const [showLevelMenu, setShowLevelMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    setSession(storage.getSession());
    setTargetLevel(storage.getSettings().targetLevel);
  }, []);

  const updateLevel = (lv: Level) => {
    const s = storage.getSettings();
    storage.saveSettings({ ...s, targetLevel: lv });
    setTargetLevel(lv);
    setShowLevelMenu(false);
    router.refresh();
    window.location.reload();
  };

  const logout = () => {
    if (confirm("로그아웃 하시겠습니까?")) {
      storage.clearSession();
      router.push("/landing");
    }
  };

  const isAdmin = !!session?.isAdmin;

  return (
    <header className="bg-white border-b border-teczen-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
        <Link href={isAdmin ? "/admin" : "/dashboard"} className="flex items-center gap-2 shrink-0 min-w-0">
          <Image src="/teczen-logo.webp" alt="TECZEN" width={92} height={22} priority className="h-5 sm:h-[22px] w-auto" />
          <span className="text-teczen-gray-300 text-sm hidden sm:inline">|</span>
          <span className="font-brand text-sm sm:text-base text-teczen-navy tracking-tight translate-y-[1px]">
            SPEAKZEN
          </span>
        </Link>

        <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
          {!isAdmin && (
            <div className="hidden md:flex items-center gap-1">
              <NavItem href="/dashboard">대시보드</NavItem>
              <NavItem href="/mock">모의고사</NavItem>
              <NavItem href="/vocab">단어장</NavItem>
              <NavItem href="/stats">통계</NavItem>
            </div>
          )}
          {isAdmin && <NavItem href="/admin">관리자</NavItem>}

          {!isAdmin && (
            <div className="relative ml-1 sm:ml-2">
              <button
                onClick={() => {
                  setShowLevelMenu(!showLevelMenu);
                  setShowUserMenu(false);
                }}
                className="px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold text-teczen-navy bg-teczen-navy/10 hover:bg-teczen-navy/20 transition-colors flex items-center gap-1 sm:gap-1.5 whitespace-nowrap"
              >
                🎯 Lv {targetLevel}
                <span className="text-xs">▼</span>
              </button>
              {showLevelMenu && (
                <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-xl border border-teczen-gray-200 p-2 min-w-[220px] z-50">
                  <div className="text-xs font-bold text-teczen-gray-500 px-3 py-1.5">
                    목표 등급 변경 (즉시 반영)
                  </div>
                  {(Object.entries(LEVEL_RANGES) as [string, [number, number]][]).map(([lv, [min, max]]) => {
                    const level = Number(lv) as Level;
                    return (
                      <button
                        key={lv}
                        onClick={() => updateLevel(level)}
                        className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-sm hover:bg-teczen-gray-50 transition-colors ${
                          targetLevel === level ? "bg-teczen-navy/10 text-teczen-navy font-bold" : "text-teczen-gray-700"
                        }`}
                      >
                        <span>Lv {lv}</span>
                        <span className="text-xs text-teczen-gray-500">{min}~{max}점</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {session && (
            <div className="relative ml-1 sm:ml-2">
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowLevelMenu(false);
                }}
                className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-3 py-1.5 rounded-lg hover:bg-teczen-gray-50"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-teczen-navy text-white text-xs sm:text-sm font-black flex items-center justify-center shrink-0">
                  T
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs text-teczen-gray-500 leading-none">
                    {session.team} · {session.position}
                  </div>
                  <div className="text-sm font-bold text-teczen-ink leading-tight">{session.name}</div>
                </div>
              </button>
              {showUserMenu && (
                <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-xl border border-teczen-gray-200 p-2 min-w-[180px] z-50">
                  {!isAdmin && (
                    <Link
                      href="/mypage"
                      onClick={() => setShowUserMenu(false)}
                      className="block px-3 py-2 text-sm hover:bg-teczen-gray-50 rounded-lg"
                    >
                      마이페이지
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="block w-full text-left px-3 py-2 text-sm text-teczen-red hover:bg-teczen-red/5 rounded-lg"
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function NavItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-lg text-sm text-teczen-gray-700 hover:text-teczen-navy hover:bg-teczen-gray-100 transition-colors"
    >
      {children}
    </Link>
  );
}
