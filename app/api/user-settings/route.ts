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
    profile: body.profile ?? null,
    stats: body.stats ?? null,
    updatedAt: Date.now(),
  };

  const kv = getKV();
  if (!kv) return NextResponse.json({ ok: true, kv: false });

  // 관리자 목록용 메타데이터(profile + stats)도 같이 저장해서 list() 한 번으로 조회 가능
  const meta = {
    employeeId: id,
    name: payload.profile?.name || "",
    team: payload.profile?.team || "",
    position: payload.profile?.position || "",
    targetLevel: payload.settings?.targetLevel || 0,
    totalProblems: payload.stats?.totalProblems || 0,
    mockExamCount: payload.stats?.mockExamCount || 0,
    avgScore: payload.stats?.avgScore || 0,
    recentScore: payload.stats?.recentScore || 0,
    lastActiveAt: payload.stats?.lastActiveAt || 0,
    updatedAt: payload.updatedAt,
  };
  await kv.put(key(id), JSON.stringify(payload), { metadata: meta });
  return NextResponse.json({ ok: true, kv: true });
}

// 학습 기록 초기화 — 본인 데이터(user:) + 불꽃(flame:) 둘 다 삭제.
// 비밀번호 해시는 별도로 보존하기 위해 stats 만 비운 빈 user 레코드를 다시 써둠.
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("employeeId") || "";
  if (!id) return NextResponse.json({ ok: false, error: "사번 없음" }, { status: 400 });

  const kv = getKV();
  if (!kv) return NextResponse.json({ ok: true, kv: false });

  // 기존 pwHash 보존을 위해 한 번 읽고
  const raw = await kv.get(key(id));
  const prev = raw ? JSON.parse(raw) : {};

  const emptyPayload = {
    settings: prev.settings ?? null,
    pwHash: prev.pwHash ?? null,
    profile: prev.profile ?? null,
    stats: { totalProblems: 0, mockExamCount: 0, avgScore: 0, recentScore: 0, lastActiveAt: 0 },
    updatedAt: Date.now(),
  };
  const meta = {
    employeeId: id,
    name: prev.profile?.name || "",
    team: prev.profile?.team || "",
    position: prev.profile?.position || "",
    targetLevel: prev.settings?.targetLevel || 0,
    totalProblems: 0,
    mockExamCount: 0,
    avgScore: 0,
    recentScore: 0,
    lastActiveAt: 0,
    updatedAt: emptyPayload.updatedAt,
  };
  await kv.put(key(id), JSON.stringify(emptyPayload), { metadata: meta });
  await kv.delete(`flame:${id}`);

  return NextResponse.json({ ok: true, kv: true });
}
