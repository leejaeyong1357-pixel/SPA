import { getOptionalRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

function getKV(): any {
  const ctx = getOptionalRequestContext();
  return (ctx?.env as any)?.SPA_KV ?? null;
}

export async function GET() {
  const kv = getKV();
  if (!kv) return NextResponse.json({ ok: true, kv: false, learners: [] });

  // user: 로 시작하는 모든 키의 metadata 만 모아옴 (값 본문은 무거우므로 메타만)
  const list = await kv.list({ prefix: "user:", limit: 1000 });
  const learners = (list.keys || [])
    .map((k: any) => k.metadata)
    .filter((m: any) => m && m.employeeId);

  return NextResponse.json({ ok: true, kv: true, learners });
}
