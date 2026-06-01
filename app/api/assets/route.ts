import { getOptionalRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

function getKV(): any {
  const ctx = getOptionalRequestContext();
  return (ctx?.env as any)?.SPA_KV ?? null;
}

interface AssetMeta {
  contentType: string;
  filename: string;
  size: number;
  updatedAt: number;
}

const ALLOWED_KEYS = new Set(["api-key-guide", "notice-image"]);

function decodeDataUrl(dataUrl: string): { contentType: string; bytes: Uint8Array } | null {
  const match = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const contentType = match[1];
  const b64 = match[2];
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { contentType, bytes };
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") || "";
  if (!ALLOWED_KEYS.has(key)) {
    return NextResponse.json({ ok: false, error: "유효하지 않은 자산 키" }, { status: 400 });
  }
  const kv = getKV();
  if (!kv) {
    return NextResponse.json({ ok: false, error: "스토리지 미설정" }, { status: 503 });
  }

  const { value, metadata } = await kv.getWithMetadata(`asset:${key}`, "arrayBuffer");
  if (!value) {
    return NextResponse.json({ ok: false, error: "자산이 아직 업로드되지 않았습니다" }, { status: 404 });
  }

  const meta = (metadata as AssetMeta) || { contentType: "application/octet-stream", filename: key, size: 0, updatedAt: 0 };
  const isDownload = req.nextUrl.searchParams.get("dl") === "1";
  return new NextResponse(value, {
    status: 200,
    headers: {
      "Content-Type": meta.contentType,
      "Cache-Control": "public, max-age=60",
      ...(isDownload
        ? { "Content-Disposition": `attachment; filename="${encodeURIComponent(meta.filename)}"` }
        : {}),
    },
  });
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청" }, { status: 400 });
  }

  const key = String(body?.key || "").trim();
  const dataUrl = String(body?.dataUrl || "");
  const filename = String(body?.filename || key);

  if (!ALLOWED_KEYS.has(key)) {
    return NextResponse.json({ ok: false, error: "유효하지 않은 자산 키" }, { status: 400 });
  }
  const decoded = decodeDataUrl(dataUrl);
  if (!decoded) {
    return NextResponse.json({ ok: false, error: "data URL 형식 오류" }, { status: 400 });
  }
  // KV 값 한도(25MB) 보호
  if (decoded.bytes.byteLength > 20 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "20MB 이하만 업로드 가능합니다" }, { status: 413 });
  }

  const kv = getKV();
  if (!kv) return NextResponse.json({ ok: false, error: "스토리지 미설정" }, { status: 503 });

  const meta: AssetMeta = {
    contentType: decoded.contentType,
    filename,
    size: decoded.bytes.byteLength,
    updatedAt: Date.now(),
  };
  await kv.put(`asset:${key}`, decoded.bytes, { metadata: meta });

  return NextResponse.json({ ok: true });
}
