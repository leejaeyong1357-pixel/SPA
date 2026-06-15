import { NextResponse, NextRequest } from "next/server";

const SKIP = [
  "/_next",
  "/favicon.ico",
  "/teczen-logo.webp",
  "/api-key-guide.pdf",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (SKIP.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 모바일·태블릿 차단 해제 — 외부 접속·모바일 환경에서도 학습 가능

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
