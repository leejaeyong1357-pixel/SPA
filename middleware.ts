import { NextResponse, NextRequest } from "next/server";

const SKIP = [
  "/_next",
  "/favicon.ico",
  "/teczen-logo.webp",
  "/api-key-guide.pdf",
];

const MOBILE_PAGE = `<!doctype html><html lang="ko"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>SPEAKZEN</title><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#fff,#eff6ff,#f3f4f6);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;color:#1f2937}.box{max-width:380px;text-align:center}.brand{font-weight:900;font-size:28px;color:#0a2540;letter-spacing:-.5px}.sub{font-size:12px;color:#6b7280;margin-bottom:32px}.icon{font-size:48px;margin-bottom:16px}h1{font-size:20px;font-weight:800;margin:0 0 12px}p{font-size:14px;color:#4b5563;line-height:1.6;margin:0}</style></head><body><div class="box"><div class="brand">SPEAKZEN</div><div class="sub">by TECZEN</div><div class="icon">💻</div><h1>회사 노트북에서 접속해주세요</h1><p>SPEAKZEN은 학습 환경 안정성을 위해<br/>PC(노트북)에서만 이용할 수 있습니다.<br/><br/>휴대폰·태블릿이 아닌<br/>회사 노트북에서 다시 접속해주세요.</p></div></body></html>`;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (SKIP.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 휴대폰·태블릿 전면 차단 — 회사 노트북에서만 이용 가능
  const ua = req.headers.get("user-agent") || "";
  const chPlatform = req.headers.get("sec-ch-ua-platform") || "";
  const chMobile = req.headers.get("sec-ch-ua-mobile") || "";
  const isMobileUA = /iPhone|iPad|iPod|Android|Windows Phone|BlackBerry|Opera Mini|IEMobile|Mobile|Tablet|KFAPWI|Silk|Kindle|Nexus 7|webOS|PlayBook/i.test(ua);
  const isMobileCH = chMobile === "?1" || /iOS|Android/i.test(chPlatform);
  if ((isMobileUA || isMobileCH) && !pathname.startsWith("/api")) {
    return new NextResponse(MOBILE_PAGE, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
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
  matcher: "/((?!api|_next/static|_next/image|favicon.ico).*)",
};
