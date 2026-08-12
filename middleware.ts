import { NextResponse, NextRequest } from "next/server";

const SKIP = [
  "/_next",
  "/favicon.ico",
  "/teczen-logo.webp",
  "/api-key-guide.pdf",
];

/**
 * 점검(서비스 중단) 안내 페이지.
 * 감사·승인 절차 중 서비스를 일시 중단할 때 노출된다.
 */
const MAINTENANCE_PAGE = `<!doctype html><html lang="ko"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="robots" content="noindex,nofollow"/><title>서비스 점검 중</title><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Malgun Gothic',sans-serif;background:#f8f9fa;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;color:#212529}.box{max-width:420px;text-align:center}.icon{font-size:44px;margin-bottom:18px}h1{font-size:20px;font-weight:800;margin:0 0 12px}p{font-size:14px;color:#495057;line-height:1.7;margin:0}.contact{margin-top:24px;padding-top:20px;border-top:1px solid #dee2e6;font-size:13px;color:#6c757d}</style></head><body><div class="box"><div class="icon">🛠️</div><h1>서비스 점검 중입니다</h1><p>현재 내부 검토 및 보안 점검을 위해<br/>서비스를 일시 중단하고 있습니다.<br/><br/>재개 일정은 별도로 안내드리겠습니다.</p><div class="contact">문의 · 미래성장팀 이재용 매니저<br/>☎ 055-280-1741</div></div></body></html>`;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── 점검 모드 ────────────────────────────────────────────────
  // 환경변수 MAINTENANCE=1 이면 API 를 포함한 모든 접근을 차단한다.
  // Cloudflare Pages 환경변수만 바꾸면 재배포 없이 즉시 켜고 끌 수 있음.
  // 정적 리소스보다 먼저 검사해 어떤 경로로도 우회되지 않도록 한다.
  if (process.env.MAINTENANCE === "1") {
    return new NextResponse(MAINTENANCE_PAGE, {
      status: 503, // Service Unavailable — 일시 중단을 나타내는 표준 응답
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Retry-After": "86400",
      },
    });
  }

  if (SKIP.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // API 경로는 Basic Auth 대상에서 제외 (앱 내부 호출용)
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const expectedUser = process.env.GATE_USER;
  const expectedPass = process.env.GATE_PASS;

  if (!expectedUser || !expectedPass) {
    return NextResponse.next();
  }

  const auth = req.headers.get("authorization");
  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      try {
        const decoded = atob(encoded);
        const sep = decoded.indexOf(":");
        const user = decoded.slice(0, sep);
        const pass = decoded.slice(sep + 1);
        if (user === expectedUser && pass === expectedPass) {
          return NextResponse.next();
        }
      } catch {}
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="SPEAKZEN"' },
  });
}

export const config = {
  // 점검 모드에서 API 까지 차단하기 위해 /api 도 매처에 포함한다.
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
