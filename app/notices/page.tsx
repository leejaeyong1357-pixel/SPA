"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { storage } from "@/lib/storage";
import { pushUserToServer } from "@/lib/userSync";
import Button from "@/components/ui/Button";

const NOTICES = [
  {
    badge: "🔒 개인정보 보호 약속",
    title: "여러분의 개인정보를 절대 우선합니다",
    body: (
      <>
        <p>
          SPEAKZEN(SPA Training 시스템)은 학습자의 개인정보를{" "}
          <b className="text-teczen-blue">절대 우선</b>하여 설계되었습니다.
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-3 text-teczen-gray-700">
          <li>
            <b>관리자도 여러분의 개인 학습 데이터·점수·답변·문법 분석을 볼 수 없습니다.</b>
            <br />
            <span className="text-xs text-teczen-gray-600">
              모든 답변·기록은 본인 PC와 본인 사번으로만 접근 가능하며, 관리자 화면에는 노출되지 않도록 소멸성으로 개발되었습니다.
            </span>
          </li>
          <li>
            관리자가 볼 수 있는 것은 <b>부서별 전체 사용량</b> 뿐입니다.
            <br />
            <span className="text-xs text-teczen-gray-600">
              (추후 사내 어학 솔루션 정식 도입 수요 확인용)
            </span>
          </li>
          <li>
            HChat 연동을 통해 답변이 외부 클라우드로 새 나가지 않습니다 — 모두 현대차그룹 사내 게이트웨이로만 흐릅니다.
          </li>
        </ul>
        <div className="mt-4 p-3 bg-teczen-blue/10 border border-teczen-blue/30 rounded-xl text-sm">
          <b className="text-teczen-blue">걱정 없이 마음껏 사용</b>하셔도 됩니다.
        </div>
      </>
    ),
  },
  {
    badge: "💬 베타 서비스 안내",
    title: "처음 만드는 사내 어학 서비스입니다",
    body: (
      <>
        <p>
          SPEAKZEN은 사내 최초의 AI 기반 SPA 학습 서비스로,
          <br />
          개발 초기 단계에서 <b>일부 렉·버그가 발생할 수 있습니다.</b>
        </p>
        <p className="mt-3 text-teczen-gray-700">
          문의·건의·버그 제보는 언제든 편하게 연락 바랍니다.
          학습 중 불편한 점이나 개선 아이디어가 있다면 큰 도움이 됩니다.
        </p>
        <div className="mt-4 p-4 bg-teczen-blue/5 border-2 border-teczen-blue rounded-xl">
          <div className="text-xs font-bold text-teczen-blue mb-1">CONTACT</div>
          <div className="text-base font-bold text-teczen-ink">미래성장팀 이재용 매니저</div>
          <a
            href="tel:055-280-1741"
            className="text-base font-mono font-bold text-teczen-blue mt-1 inline-block"
          >
            ☎ 055-280-1741
          </a>
        </div>
      </>
    ),
  },
];

export default function NoticesPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [agreed, setAgreed] = useState<boolean[]>([false, false]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const session = storage.getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    const settings = storage.getSettings();
    // 시험일/등급/API 설정이 끝나기 전엔 공지를 못 보게 — 처음부터 뜨면 안 되니까
    if (!settings.setupCompleted) {
      if (!settings.onboardingSeen && !settings.onboardingSkipForever) {
        router.replace("/onboarding");
      } else {
        router.replace("/setup");
      }
      return;
    }
    if (settings.noticesAccepted) {
      router.replace("/dashboard");
      return;
    }
    setMounted(true);
  }, [router]);

  if (!mounted) return null;

  const allAgreed = agreed.every(Boolean);

  const proceed = async () => {
    setSaving(true);
    const s = storage.getSettings();
    storage.saveSettings({ ...s, noticesAccepted: true });
    await pushUserToServer();
    router.replace("/dashboard");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-teczen-gray-50 px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Image
            src="/teczen-logo.webp"
            alt="TECZEN"
            width={120}
            height={28}
            priority
            className="h-7 w-auto mx-auto mb-3"
          />
          <h1 className="font-brand text-3xl text-teczen-navy mb-1">SPEAKZEN</h1>
          <p className="text-sm text-teczen-gray-600">시작하기 전에 꼭 읽어주세요</p>
        </div>

        <div className="space-y-5">
          {NOTICES.map((n, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl border border-teczen-gray-200 shadow-sm p-6"
            >
              <div className="inline-block px-3 py-1 bg-teczen-blue/10 text-teczen-blue text-xs font-bold rounded-full mb-3">
                공지 {i + 1} · {n.badge}
              </div>
              <h2 className="text-xl font-black text-teczen-ink mb-3 leading-snug">
                {n.title}
              </h2>
              <div className="text-sm text-teczen-ink leading-relaxed">{n.body}</div>

              <label className="mt-5 pt-4 border-t border-teczen-gray-100 flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreed[i]}
                  onChange={(e) => {
                    const next = [...agreed];
                    next[i] = e.target.checked;
                    setAgreed(next);
                  }}
                  className="w-5 h-5 accent-teczen-blue cursor-pointer"
                />
                <span className="text-sm font-semibold text-teczen-ink">
                  위 내용을 확인했습니다.
                </span>
              </label>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <Button
            onClick={proceed}
            fullWidth
            size="lg"
            disabled={!allAgreed || saving}
          >
            {saving
              ? "이동 중..."
              : allAgreed
              ? "확인 완료 — 학습 시작 →"
              : "공지 2개를 모두 확인해주세요"}
          </Button>
        </div>

        <p className="text-center text-xs text-teczen-gray-500 mt-5">
          본 공지는 최초 1회만 표시됩니다.
        </p>
      </div>
    </main>
  );
}
