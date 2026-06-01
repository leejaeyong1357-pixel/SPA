import { getOptionalRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

function getKV(): any {
  const ctx = getOptionalRequestContext();
  return (ctx?.env as any)?.SPA_KV ?? null;
}

function key(employeeId: string) {
  return `user:${employeeId}`;
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("employeeId") || "";
  if (!id) return NextResponse.json({ ok: false, error: "사번 없음" }, { status: 400 });

  const kv = getKV();
  if (!kv) return NextResponse.json({ ok: true, kv: false, data: null });

  const raw = await kv.get(key(id));
  return NextResponse.json({
    ok: true,
    kv: true,
    data: raw ? JSON.parse(raw) : null,
  });
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청" }, { status: 400 });
  }
  const id = String(body?.employeeId || "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "사번 없음" }, { status: 400 });

  const payload = {
    settings: body.settings ?? null,
    pwHash: body.pwHash ?? null,
    updatedAt: Date.now(),
  };

  const kv = getKV();
  if (!kv) return NextResponse.json({ ok: true, kv: false });

  await kv.put(key(id), JSON.stringify(payload));
  return NextResponse.json({ ok: true, kv: true });
}
