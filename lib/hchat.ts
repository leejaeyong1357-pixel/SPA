import type { AiFeedback, QuestionType, Level } from "@/types";
import { scoreToLevel } from "./scoring";
import { endpointForModel } from "./constants";

interface FeedbackRequest {
  type: QuestionType;
  question: string;
  userAnswer: string;
  sampleAnswer?: string;
  targetLevel: Level;
  context?: string;
}

interface HchatConfig {
  apiKey: string;
  model?: string;
}

const FEEDBACK_PROMPT = (req: FeedbackRequest) => `You are a STRICT English speaking exam evaluator for the Korean SPA (Speaking Proficiency Assessment) used by Hyundai Motor Group.

# SPA OFFICIAL SCORING RUBRIC (총 96점)
The total score MUST be the sum of these 5 criteria. Each criterion has its OWN max:

1. 발음 (Pronunciation) — MAX 12점
   - Accent (intonation and stress)
   - Pace (flow and rhythm of speech)

2. 청취력과 답변능력 (Listening Comprehension & Response Technique) — MAX 36점
   - Listening passage summarization
   - Accuracy / relevance of response

3. 어휘사용능력 (Content and Use of Vocabulary) — MAX 12점
   - Accuracy of vocabulary in context
   - Incorporation of applicable advanced terms and phrases

4. 문장구성능력 (Grammar and Common Error) — MAX 24점
   - Correct usage of parts of speech
   - Verb tense accuracy / consistency
   - Syntax and diction
   - Sentence structure variety / complexity
   - Incorporation of transition signals / phrases

5. 언어구사능력 (Overall Fluency) — MAX 12점
   - Communicative comprehension
   - Logical flow and clarity of response
   - Demonstration of freedom of expression

# SCORING LEVELS (총점 0~96)
- Lv 1 (0-15) / Lv 2 (16-24) / Lv 3 (25-34) / Lv 4 (35-49)
- Lv 5 (50-64) / Lv 6 (65-74) / Lv 7 (75-84) / Lv 8 (85-96)

# STRICT GUIDELINES — Be HARSH and ACCURATE
DO NOT inflate scores. A few words ≠ passing. Empty/trivial answers MUST score under 25 total.
- < 10 words or 1 fragment: 발음 ≤ 3, 청취 ≤ 8, 어휘 ≤ 2, 문법 ≤ 4, 유창성 ≤ 2 (총 ≤ 19)
- 10-25 words / 1-2 short sentences: 발음 ≤ 6, 청취 ≤ 14, 어휘 ≤ 5, 문법 ≤ 10, 유창성 ≤ 5
- 25-60 words / 3-5 sentences with basic logic: 발음 ≤ 8, 청취 ≤ 22, 어휘 ≤ 8, 문법 ≤ 16, 유창성 ≤ 8
- 60-120 words / coherent 5-8 sentences with examples: 발음 ≤ 10, 청취 ≤ 30, 어휘 ≤ 10, 문법 ≤ 20, 유창성 ≤ 10
- 120+ words / advanced vocabulary + connectors + complex structures: can reach max in each

# AVOID THESE COMMON MISTAKES
- Length alone is NOT fluency. Repetitive long answer ≠ high 유창성.
- Few words MUST NOT get 40-50/96. That is incorrect scoring.
- Off-topic answer → 청취 ≤ 10 regardless of length (response relevance)

# INPUT
Question Type ${req.type} (${
  req.type === 1
    ? "Business Casual — daily Q&A"
    : req.type === 2
    ? "Opinion — argumentative response"
    : req.type === 3
    ? "Visual Description — chart/photo"
    : "Passage Summary — 60-sec summary"
})
Question: ${req.question}
${req.context ? `Context: ${req.context}\n` : ""}
User's Answer (${req.userAnswer.split(/\s+/).filter(Boolean).length} words): ${req.userAnswer}
Target Level: Lv ${req.targetLevel}

# OUTPUT FORMAT — return ONLY valid JSON
All Korean text must be in 한국어. modelAnswer must be in English.

{
  "criteria": {
    "pronunciation": <0~12>,
    "listening": <0~36>,
    "vocabulary": <0~12>,
    "grammar": <0~24>,
    "fluency": <0~12>
  },
  "scoreEstimate": <SUM of above, 0~96>,
  "estimatedLevel": <1~8>,
  "grammarIssues": ["문법 오류와 한국어 교정"],
  "vocabularySuggestions": ["더 나은 어휘 제안 (한국어 설명)"],
  "betterExpressions": ["자연스러운 표현 (한국어)"],
  "modelAnswer": "Target-level English sample answer",
  "strengths": ["잘한 점 (한국어)"],
  "improvements": ["개선점 (한국어)"]
}

scoreEstimate MUST equal pronunciation + listening + vocabulary + grammar + fluency. Be honest and strict.`;

/**
 * 브라우저에서 사내 HChat 게이트웨이로 직접 호출.
 * 외부 클라우드(Cloudflare)에서는 사내망 못 들어가므로 클라이언트(회사 노트북 브라우저)가 직접 호출.
 * 회사 노트북은 사내망에 있어서 internal-apigw-kr.hmg-corp.io 에 닿을 수 있음.
 * CORS 가 막혀있으면 fetch 가 TypeError 로 떨어지므로 그때는 친절한 메시지 반환.
 */
async function callProxy(
  config: HchatConfig,
  messages: { role: string; content: string }[],
  maxTokens = 1500,
): Promise<{ ok: boolean; content?: string; error?: string }> {
  const model = config.model || "claude-sonnet-4-6";
  const isAnthropic = model.startsWith("claude");
  const endpoint = endpointForModel(model);
  const url = isAnthropic
    ? endpoint.replace(/\/$/, "") + "/messages"
    : endpoint.replace(/\/$/, "") + "/chat/completions";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  let body: any;

  if (isAnthropic) {
    headers["x-api-key"] = config.apiKey;
    headers["anthropic-version"] = "2023-06-01";
    const systemMsg = messages.find((m) => m.role === "system");
    const otherMsgs = messages.filter((m) => m.role !== "system");
    body = {
      model,
      max_tokens: maxTokens,
      messages: otherMsgs,
      ...(systemMsg ? { system: systemMsg.content } : {}),
    };
  } else {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
    headers["api-key"] = config.apiKey;
    headers["x-api-key"] = config.apiKey;
    body = { model, messages, max_tokens: maxTokens, temperature: 0.3 };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const rawText = await res.text();
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { raw: rawText };
    }
    if (!res.ok) {
      const errMsg =
        data?.error?.message ||
        data?.message ||
        data?.error ||
        data?.raw ||
        `HTTP ${res.status} ${res.statusText}`;
      return {
        ok: false,
        error: typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg),
      };
    }
    const content = isAnthropic
      ? data.content?.[0]?.text || data.content?.[0]?.value || ""
      : data.choices?.[0]?.message?.content || "";
    return { ok: true, content };
  } catch (e: any) {
    // 브라우저가 사내망에 못 들어가거나 CORS 차단 시 여기로 떨어짐
    const msg = e?.message || "fetch failed";
    const isCorsLike = /failed to fetch|networkerror|cors/i.test(msg);
    return {
      ok: false,
      error: isCorsLike
        ? "사내 HChat에 접속할 수 없습니다. 회사 노트북·사내망에서 접속했는지 확인해주세요. (CORS 차단 가능성)"
        : msg,
    };
  }
}

export async function getFeedback(
  req: FeedbackRequest,
  config: HchatConfig,
): Promise<AiFeedback> {
  if (!config.apiKey) {
    return strictMockFeedback(req);
  }

  const result = await callProxy(
    config,
    [
      {
        role: "system",
        content:
          "You are a strict SPA exam evaluator. Output only valid JSON. Be harsh in scoring - one sentence answers score under 25 points.",
      },
      { role: "user", content: FEEDBACK_PROMPT(req) },
    ],
    1500,
  );

  if (!result.ok || !result.content) {
    console.error("HChat call failed:", result.error);
    const mock = strictMockFeedback(req);
    mock.improvements.unshift(`⚠ AI 채점 실패 — ${result.error || "응답 없음"}`);
    return mock;
  }

  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("응답에 JSON 없음");
    const parsed = JSON.parse(jsonMatch[0]);
    const c = parsed.criteria || {};
    // criteria가 비율(0~100)로 와도 SPA 만점으로 환산
    const fix = (val: any, max: number) => {
      const n = Number(val) || 0;
      return n > max ? Math.round((n / 100) * max) : Math.round(n);
    };
    const criteria = {
      pronunciation: fix(c.pronunciation, 12),
      listening: fix(c.listening, 36),
      vocabulary: fix(c.vocabulary, 12),
      grammar: fix(c.grammar, 24),
      fluency: fix(c.fluency, 12),
    };
    const sum =
      criteria.pronunciation + criteria.listening + criteria.vocabulary +
      criteria.grammar + criteria.fluency;
    const finalScore = parsed.scoreEstimate
      ? Math.min(96, Math.max(0, Number(parsed.scoreEstimate)))
      : sum;

    return {
      grammarIssues: parsed.grammarIssues || [],
      vocabularySuggestions: parsed.vocabularySuggestions || [],
      betterExpressions: parsed.betterExpressions || [],
      modelAnswer: parsed.modelAnswer || "",
      estimatedLevel: scoreToLevel(finalScore),
      scoreEstimate: finalScore,
      strengths: parsed.strengths || [],
      improvements: parsed.improvements || [],
      criteria,
    };
  } catch (e) {
    console.error("Parse fail:", e);
    return strictMockFeedback(req);
  }
}

function strictMockFeedback(req: FeedbackRequest): AiFeedback {
  const words = req.userAnswer.trim().split(/\s+/).filter(Boolean);
  const wc = words.length;
  const sentences = req.userAnswer.split(/[.!?]+/).filter((s) => s.trim()).length;
  const uniqueWords = new Set(words.map((w) => w.toLowerCase())).size;
  const lexicalDiversity = wc > 0 ? uniqueWords / wc : 0;
  const hasConnectors = /(however|but|because|since|so|therefore|for example|first|second|finally|in my view|i think|moreover|furthermore|consequently)/i.test(req.userAnswer);
  const advancedVocab = (req.userAnswer.match(/\b(demonstrate|consider|regarding|consequently|furthermore|implement|significant|optimize|leverage|facilitate|establish|comprehensive|effective|substantial)\b/gi) || []).length;

  // SPA 공식 채점표 적용 (만점이 모두 다름)
  // 1. 발음 (12) — 텍스트로는 추정만 가능. 어휘·구조 복잡도로 간접 평가
  let pronunciation: number;
  if (wc < 10) pronunciation = Math.max(0, Math.floor(wc * 0.3));
  else if (wc < 25) pronunciation = 3 + Math.floor(Math.random() * 3);
  else if (wc < 60) pronunciation = 5 + Math.floor(Math.random() * 3);
  else if (wc < 120) pronunciation = 7 + Math.floor(Math.random() * 3);
  else pronunciation = 9 + Math.floor(Math.random() * 4);

  // 2. 청취·답변능력 (36) — 질문과 관련성, 답변량
  let listening: number;
  if (wc < 10) listening = Math.max(0, Math.floor(wc * 0.6));
  else if (wc < 25) listening = 8 + Math.floor(Math.random() * 6);
  else if (wc < 60) listening = 15 + Math.floor(Math.random() * 7);
  else if (wc < 120) listening = 22 + Math.floor(Math.random() * 8);
  else listening = 28 + Math.floor(Math.random() * 9);
  if (sentences < 2) listening = Math.min(listening, 8);

  // 3. 어휘 (12) — 어휘 다양성 + 고급 어휘 사용
  let vocabulary: number;
  if (wc < 10) vocabulary = Math.max(0, Math.floor(wc * 0.2));
  else if (wc < 25) vocabulary = 3 + Math.floor(lexicalDiversity * 3);
  else if (wc < 60) vocabulary = 5 + Math.min(3, advancedVocab) + Math.floor(lexicalDiversity * 2);
  else vocabulary = 7 + Math.min(4, advancedVocab) + Math.floor(lexicalDiversity * 2);
  vocabulary = Math.min(12, vocabulary);

  // 4. 문법 (24) — 문장 수, 연결사, 길이
  let grammar: number;
  if (wc < 10) grammar = Math.max(0, Math.floor(wc * 0.4));
  else if (wc < 25) grammar = 6 + Math.floor(Math.random() * 4);
  else if (wc < 60) grammar = 12 + Math.floor(Math.random() * 4) + (sentences >= 3 ? 2 : 0);
  else if (wc < 120) grammar = 16 + Math.floor(Math.random() * 4) + (hasConnectors ? 2 : 0);
  else grammar = 19 + Math.floor(Math.random() * 4) + (hasConnectors ? 1 : 0);
  grammar = Math.min(24, grammar);

  // 5. 유창성 (12) — 논리 흐름, 연결어
  let fluency: number;
  if (wc < 10) fluency = Math.max(0, Math.floor(wc * 0.2));
  else if (wc < 25) fluency = 3 + (hasConnectors ? 1 : 0);
  else if (wc < 60) fluency = 5 + (hasConnectors ? 2 : 0) + (sentences >= 4 ? 1 : 0);
  else if (wc < 120) fluency = 7 + (hasConnectors ? 2 : 0) + (sentences >= 5 ? 1 : 0);
  else fluency = 9 + (hasConnectors ? 2 : 0) + (sentences >= 6 ? 1 : 0);
  fluency = Math.min(12, fluency);

  const score = pronunciation + listening + vocabulary + grammar + fluency;

  const errors: string[] = [];
  if (wc < 30) errors.push(`답변이 너무 짧음 (${wc}단어) — 최소 5문장, 60~80단어 이상 권장`);
  if (sentences < 3) errors.push(`문장 수 부족 (${sentences}문장) — 최소 3~5문장`);
  if (!hasConnectors) errors.push("논리 연결어 부재 — However / Because / For example 등 추가");
  if (advancedVocab === 0 && wc > 30) errors.push("고급 어휘 부재 — demonstrate, consequently, regarding 등 도입");

  const criteria = { pronunciation, listening, vocabulary, grammar, fluency };

  return {
    grammarIssues: ["(Mock - HChat API 미연결) 문법 자동 검사를 위해 API 설정 필요"],
    vocabularySuggestions: [
      `(Mock) 단어 수: ${wc}개 — ${wc < 50 ? "비즈니스 어휘 추가 필요" : "다양한 어휘 권장"}`,
    ],
    betterExpressions: [
      "(Mock) 도입: 'From my experience,...' / 'In my view,...'",
      "(Mock) 근거: 'For instance,...' / 'For example,...'",
    ],
    modelAnswer: req.sampleAnswer
      ? `(목표 등급 Lv ${req.targetLevel} 기준)\n\n${req.sampleAnswer}`
      : "(HChat API 연결 시 목표 등급 맞춤 모범답안 생성)",
    estimatedLevel: scoreToLevel(score),
    scoreEstimate: score,
    strengths: [
      wc >= 50 ? `발화량 충분 (${wc}단어)` : `시도함 (${wc}단어)`,
    ],
    improvements: errors.length > 0 ? errors : [
      "더 구체적인 예시와 근거 추가",
      "고급 비즈니스 어휘 도입",
    ],
    criteria,
  };
}

export async function testConnection(
  config: HchatConfig,
): Promise<{ ok: boolean; message: string; details?: string }> {
  if (!config.apiKey) {
    return { ok: false, message: "API 키를 입력해주세요" };
  }
  const result = await callProxy(
    config,
    [{ role: "user", content: "Reply with just OK" }],
    30,
  );
  if (!result.ok) {
    return {
      ok: false,
      message: result.error || "연결 실패",
      details: result.error,
    };
  }
  return {
    ok: true,
    message: `연결 성공 — 응답: "${(result.content || "").slice(0, 50)}"`,
  };
}

export async function translateWord(
  word: string,
  config: HchatConfig,
): Promise<string> {
  if (typeof window !== "undefined") {
    const cache = JSON.parse(localStorage.getItem("spa.wordCache") || "{}");
    if (cache[word.toLowerCase()]) return cache[word.toLowerCase()];
  }

  if (!config.apiKey) {
    return "(API 키 설정 필요)";
  }

  const result = await callProxy(
    config,
    [
      {
        role: "system",
        content:
          "You are a Korean-English dictionary. Output only the most common Korean meaning of the given English word in 5 characters or fewer. No explanation, no punctuation.",
      },
      { role: "user", content: word },
    ],
    30,
  );

  if (!result.ok || !result.content) return "—";

  const meaning = result.content.trim().replace(/^["']|["']$/g, "");
  if (typeof window !== "undefined") {
    const cache = JSON.parse(localStorage.getItem("spa.wordCache") || "{}");
    cache[word.toLowerCase()] = meaning;
    localStorage.setItem("spa.wordCache", JSON.stringify(cache));
  }
  return meaning;
}

export async function translateText(
  text: string,
  config: HchatConfig,
): Promise<string> {
  if (!config.apiKey) {
    return "(API 키 설정 필요 — 마이페이지에서 등록)";
  }

  const result = await callProxy(
    config,
    [
      {
        role: "system",
        content:
          "You are a professional Korean translator. Translate the given English text to natural Korean. Output only the Korean translation, no explanations or quotation marks.",
      },
      { role: "user", content: text },
    ],
    500,
  );

  if (!result.ok || !result.content) {
    return `(번역 실패: ${result.error || "응답 없음"})`;
  }
  return result.content.trim().replace(/^["']|["']$/g, "");
}

export function isHChatConfigured(apiKey: string): boolean {
  return !!apiKey;
}

export async function transcribeAudio(
  blob: Blob,
  apiKey: string,
  model = "whisper-1",
): Promise<{ ok: boolean; text?: string; error?: string }> {
  if (!apiKey) return { ok: false, error: "API 키가 없습니다" };
  try {
    const form = new FormData();
    form.append("audio", blob, "speech.webm");
    form.append("model", model);
    const res = await fetch("/api/stt", {
      method: "POST",
      headers: { "x-api-key": apiKey },
      body: form,
    });
    const data = await res.json();
    if (!data.ok) return { ok: false, error: data.error || "변환 실패" };
    return { ok: true, text: data.text };
  } catch (e: any) {
    return { ok: false, error: e.message || "fetch 실패" };
  }
}
