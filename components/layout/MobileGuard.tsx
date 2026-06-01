"use client";

import { useEffect, useState } from "react";

/**
 * 서버측 UA 차단을 통과해도(예: UA 위조), 클라이언트에서 화면 크기·터치 지원·플랫폼으로 한 번 더 검증.
 * 일반 노트북: width >= 1024 + 마우스 포인터. 휴대폰·태블릿은 여기서 차단됨.
 */
export default function MobileGuard() {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent || "";
    const isMobileUA = /iPhone|iPad|iPod|Android|Windows Phone|BlackBerry|Opera Mini|IEMobile|Mobile|Tablet|KFAPWI|Silk|Kindle|webOS|PlayBook/i.test(ua);
    const isTouchPrimary =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches;
    const isNarrow = window.innerWidth < 1024;
    if (isMobileUA || (isTouchPrimary && isNarrow)) {
      setBlocked(true);
    }
  }, []);

  if (!blocked) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background:
          "linear-gradient(135deg, #ffffff, #eff6ff, #f3f4f6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        color: "#1f2937",
        fontFamily:
          "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
      }}
    >
      <div style={{ maxWidth: 380, textAlign: "center" }}>
        <div style={{ fontWeight: 900, fontSize: 28, color: "#0a2540", letterSpacing: -0.5 }}>
          SPEAKZEN
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 32 }}>by TECZEN</div>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💻</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 12px" }}>
          회사 노트북에서 접속해주세요
        </h1>
        <p style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.6, margin: 0 }}>
          SPEAKZEN은 학습 환경 안정성을 위해
          <br />
          PC(노트북)에서만 이용할 수 있습니다.
          <br />
          <br />
          휴대폰·태블릿이 아닌
          <br />
          회사 노트북에서 다시 접속해주세요.
        </p>
      </div>
    </div>
  );
}
