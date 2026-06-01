"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="min-h-screen bg-white text-teczen-ink overflow-x-hidden">
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all ${
          scrolled ? "bg-white/95 backdrop-blur shadow-sm" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/teczen-logo.webp" alt="TECZEN" width={88} height={20} className="h-5 w-auto" />
            <span className="text-teczen-gray-300">|</span>
            <span className="font-brand text-lg text-teczen-navy tracking-tight">SPEAKZEN</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/signup"
              className="px-4 py-2 bg-teczen-blue text-white text-sm font-bold rounded-full hover:bg-blue-700 transition-colors"
            >
              등록하기
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 border border-teczen-gray-300 text-teczen-ink text-sm font-bold rounded-full hover:border-teczen-navy hover:text-teczen-navy transition-colors"
            >
              로그인 →
            </Link>
          </div>
        </div>
      </header>

      <section className="relative pt-32 pb-20 px-6 bg-gradient-to-br from-white via-teczen-gray-50 to-blue-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center animate-fadeup">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-teczen-red/10 text-teczen-red text-xs font-bold rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-teczen-red rounded-full animate-pulse" />
              현대자동차그룹 · 테크젠 첫 어학 솔루션
            </div>
            <h1 className="hero-headline text-5xl md:text-7xl text-teczen-ink mb-6">
              SPA, AI가 끌어올린다.
              <br />
              <span className="text-teczen-navy">SPEAKZEN</span>.
            </h1>
            <p className="text-lg md:text-xl text-teczen-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              실시간 비대면 화상 SPA 시험.
              <br />
              AI 채점, 음성 인식, 맞춤 모범답안으로
              <br />
              <span className="font-bold text-teczen-ink">한 등급 위로</span>.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link
                href="/signup"
                className="px-8 py-4 bg-teczen-navy text-white font-bold rounded-full hover:bg-teczen-navy-dark transition-all hover:shadow-xl"
              >
                등록하고 시작하기 →
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 border-2 border-teczen-navy text-teczen-navy font-bold rounded-full hover:bg-teczen-navy hover:text-white transition-colors"
              >
                로그인
              </Link>
              <a
                href="#features"
                className="px-8 py-4 border-2 border-teczen-gray-300 text-teczen-gray-700 font-bold rounded-full hover:border-teczen-navy hover:text-teczen-navy transition-colors"
              >
                알아보기
              </a>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-6 max-w-3xl mx-auto">
              {[
                ["400+", "유형별 문제"],
                ["50회", "모의고사"],
                ["AI", "실시간 채점"],
              ].map(([n, l]) => (
                <div key={l} className="text-center">
                  <div className="font-brand text-3xl md:text-4xl text-teczen-navy">{n}</div>
                  <div className="text-xs text-teczen-gray-500 mt-1">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-sm font-bold text-teczen-red mb-3">FEATURES</div>
            <h2 className="hero-headline text-4xl md:text-5xl text-teczen-ink">
              SPEAKZEN의 기능
            </h2>
            <p className="text-teczen-gray-600 mt-3">
              학습부터 채점까지, 한 화면에서 끝내세요.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                t: "AI 엄격 채점",
                d: "발화량·문법·어휘·논리 5개 축으로 96점 만점 채점. 한 문장이면 정직하게 Lv2.",
                emoji: "🎯",
              },
              {
                t: "음성 인식 답변",
                d: "Web Speech API로 실시간 영어 음성 → 텍스트 변환. 입력 답변도 OK.",
                emoji: "🎤",
              },
              {
                t: "단어 호버 번역",
                d: "영어 단어 위에 마우스 → 우측에 한글 의미. 학습 흐름 유지.",
                emoji: "📖",
              },
              {
                t: "맞춤 모범답안",
                d: "본인 목표 등급(Lv 1~8)에 맞춘 모범답안 생성. 너무 어렵지도, 쉽지도 않게.",
                emoji: "⭐",
              },
              {
                t: "실전 모의고사",
                d: "13분 4유형 연속. 점수대별 50회 세트. 종합 점수와 등급 즉시 산정.",
                emoji: "⏱️",
              },
              {
                t: "학습 통계",
                d: "유형별 강약점, 점수 추이, 모의고사 히스토리. 시험까지 D-day 카운트.",
                emoji: "📊",
              },
            ].map((f) => (
              <div
                key={f.t}
                className="p-6 rounded-2xl border border-teczen-gray-200 hover:border-teczen-navy hover:shadow-lg transition-all"
              >
                <div className="text-3xl mb-3">{f.emoji}</div>
                <h3 className="font-bold text-lg text-teczen-ink mb-2">{f.t}</h3>
                <p className="text-sm text-teczen-gray-600 leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-teczen-navy text-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-sm font-bold text-red-400 mb-3 tracking-wider">BRAND STORY</div>
          <h2 className="hero-headline text-4xl md:text-5xl mb-8">
            한국 사람들은 왜 영어를
            <br />
            몇 십년씩 배워도 말하기를 어려워할까?
          </h2>
          <p className="text-blue-100 text-base md:text-lg leading-relaxed">
            SPA는 실시간 비대면 화상 시험.
            <br />
            정해진 시간 안에 말로 표현해야 합니다.
            <br />
            <br />
            <span className="text-white font-bold">SPEAKZEN</span>은 그 순간을 위해 만들어졌습니다.
            <br />
            AI가 발음 외 모든 것을 24시간 평가합니다.
          </p>
        </div>
      </section>

      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="hero-headline text-4xl md:text-5xl text-teczen-ink mb-6">
            준비되셨나요?
          </h2>
          <p className="text-teczen-gray-600 mb-8 text-lg">
            처음이라면 <b>등록하기</b>, 이미 등록했다면 <b>로그인</b>.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/signup"
              className="inline-block px-10 py-4 bg-teczen-red text-white font-bold rounded-full hover:bg-teczen-red-dark transition-all hover:shadow-xl text-lg"
            >
              등록하기 →
            </Link>
            <Link
              href="/login"
              className="inline-block px-10 py-4 border-2 border-teczen-ink text-teczen-ink font-bold rounded-full hover:bg-teczen-ink hover:text-white transition-colors text-lg"
            >
              로그인
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-8 px-6 bg-teczen-gray-50 border-t border-teczen-gray-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-teczen-gray-500">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Image src="/teczen-logo.webp" alt="TECZEN" width={70} height={16} className="h-4 w-auto opacity-70" />
              <span>© TECZEN · Hyundai Motor Group</span>
            </div>
            <div className="text-[10px] text-teczen-gray-400 ml-1">
              made by 미래성장팀 이재용 매니저
            </div>
          </div>
          <div>SPEAKZEN v0.3 · powered by HChat</div>
        </div>
      </footer>
    </main>
  );
}
