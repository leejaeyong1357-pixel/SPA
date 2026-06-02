import { getOptionalRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

function getKV(): any {
  const ctx = getOptionalRequestContext();
  return (ctx?.env as any)?.SPA_KV ?? null;
}

async function sha256Hex(s: string): Promise<string> {
  const enc = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// 관리자가 학습자 비밀번호 변경 — 새 비번 → 해시 후 저장
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청" }, { status: 400 });
  }
  const id = String(body?.employeeId || "").trim();
  const newPassword = String(body?.newPassword || "");
  if (!id) return NextResponse.json({ ok: false, error: "사번 없음" }, { status: 400 });
  if (newPassword.length < 6) {
    return NextResponse.json({ ok: false, error: "비밀번호는 6자 이상" }, { status: 400 });
  }

  const kv = getKV();
  if (!kv) return NextResponse.json({ ok: false, error: "스토리지 미설정" }, { status: 503 });

  const raw = await kv.get(`user:${id}`);
  const prev = raw ? JSON.parse(raw) : {};
  const newHash = await sha256Hex(newPassword);

  const payload = {
    ...prev,
    pwHash: newHash,
    updatedAt: Date.now(),
  };
  // metadata 는 기존 보존
  const list = await kv.list({ prefix: `user:${id}` });
  const oldMeta = (list.keys || [])[0]?.metadata;
  await kv.put(`user:${id}`, JSON.stringify(payload), {
    metadata: oldMeta || { employeeId: id, updatedAt: payload.updatedAt },
  });

  return NextResponse.json({ ok: true });
}

// 관리자가 학습자 비번 초기화 — 해시 삭제 → 다음 로그인 때 다시 등록 필요
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("employeeId") || "";
  if (!id) return NextResponse.json({ ok: false, error: "사번 없음" }, { status: 400 });

  const kv = getKV();
  if (!kv) return NextResponse.json({ ok: false, error: "스토리지 미설정" }, { status: 503 });

  const raw = await kv.get(`user:${id}`);
  if (!raw) return NextResponse.json({ ok: true, kv: true });

  const prev = JSON.parse(raw);
  const payload = { ...prev, pwHash: null, updatedAt: Date.now() };
  const list = await kv.list({ prefix: `user:${id}` });
  const oldMeta = (list.keys || [])[0]?.metadata;
  await kv.put(`user:${id}`, JSON.stringify(payload), {
    metadata: oldMeta || { employeeId: id, updatedAt: payload.updatedAt },
  });

  return NextResponse.json({ ok: true });
}
