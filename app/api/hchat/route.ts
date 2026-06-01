import { NextResponse } from "next/server";
import { getOptionalRequestContext } from "@cloudflare/next-on-pages";
import { endpointForModel, HCHAT_BASE_URL } from "@/lib/constants";

export const runtime = "edge";

/**
 * 사내 HChat 게이트웨이(internal-apigw-kr.hmg-corp.io) 는 외부 클라우드에서 못 들어감.
 * 24/7 회사 PC 에서 돌리는 Cloudflare Tunnel(예: xxx.trycloudflare.com) URL 을
 * 환경변수 HCHAT_TUNNEL_URL 에 넣으면 자동으로 그 URL 로 프록시.
 *   - HCHAT_TUNNEL_URL 미설정 → 기존처럼 내부 URL 사용(로컬 개발용)
 *   - HCHAT_TUNNEL_URL 설정 → 그 URL 로 라우팅(외부 클라우드 배포용)
 */
function resolveBase(originalEndpoint: string): string {
  const ctx = getOptionalRequestContext();
  const tunnel = (ctx?.env as any)?.HCHAT_TUNNEL_URL as string | undefined;
  if (!tunnel) return originalEndpoint;
  // 원본 path 를 그대로 유지: /hchat-in/api/v3/claude 등
  const base = originalEndpoint.replace(/^https?:\/\/[^/]+/, "");
  return tunnel.replace(/\/$/, "") + base;
}

interface ProxyRequest {
  apiKey: string;
  model?: string;
  messages: { role: string; content: string }[];
  maxTokens?: number;
  temperature?: number;
}

export async function POST(req: Request) {
  let body: ProxyRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" });
  }

  const { apiKey, model, messages, maxTokens = 1500, temperature = 0.3 } = body;

  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "apiKey가 필요합니다" });
  }

  const selectedModel = model || "claude-sonnet-4-6";
  const endpoint = resolveBase(endpointForModel(selectedModel));
  const provider: "anthropic" | "openai" = selectedModel.startsWith("claude") ? "anthropic" : "openai";

  const url =
    provider === "anthropic"
      ? endpoint.replace(/\/$/, "") + "/messages"
      : endpoint.replace(/\/$/, "") + "/chat/completions";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  let requestBody: any;

  if (provider === "anthropic") {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";

    const systemMsg = messages.find((m) => m.role === "system");
    const otherMsgs = messages.filter((m) => m.role !== "system");
    requestBody = {
      model: model || "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: otherMsgs,
      ...(systemMsg ? { system: systemMsg.content } : {}),
    };
  } else {
    headers["Authorization"] = `Bearer ${apiKey}`;
    headers["api-key"] = apiKey;
    headers["x-api-key"] = apiKey;
    requestBody = {
      model: model || "claude-sonnet-4-6",
      messages,
      max_tokens: maxTokens,
      temperature,
    };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    const rawText = await response.text();
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { raw: rawText };
    }

    if (!response.ok) {
      const errMsg =
        data?.error?.message ||
        data?.message ||
        data?.error ||
        data?.raw ||
        `HTTP ${response.status} ${response.statusText}`;
      return NextResponse.json({
        ok: false,
        status: response.status,
        provider,
        error: typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg),
      });
    }

    const content =
      provider === "anthropic"
        ? data.content?.[0]?.text || data.content?.[0]?.value || ""
        : data.choices?.[0]?.message?.content || "";

    return NextResponse.json({
      ok: true,
      content,
      provider,
      model: data.model,
      usage: data.usage,
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: `Network error: ${e.message || "unknown"}`,
    });
  }
}
