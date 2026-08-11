import type {
  AiFeedback,
  QuestionType,
  Level,
  CriteriaKey,
  AreaAnalysis,
  ContentSlice,
} from "@/types";
import { scoreToLevel } from "./scoring";

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

# OUTPUT FORMAT — return ONLY valid JSON (no markdown fences, no commentary)
All Korean text must be in 한국어 (존댓말, ~요체). modelAnswer must be in English.

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
  "summaryComment": "2문장 이내 총평 (한국어)",
  "overallComment": "3~4문장 상세 총평. 무엇을 잘했고 무엇을 더하면 점수가 오르는지 (한국어)",
  "areas": {
    "pronunciation": {
      "summary": "이 영역 분석 2문장 (한국어)",
      "strengths": ["강점 1", "강점 2"],
      "improvements": ["개선 포인트 1", "개선 포인트 2"]
    },
    "listening": { "summary": "...", "strengths": ["..."], "improvements": ["..."] },
    "vocabulary": { "summary": "...", "strengths": ["..."], "improvements": ["..."] },
    "grammar": { "summary": "...", "strengths": ["..."], "improvements": ["..."] },
    "fluency": { "summary": "...", "strengths": ["..."], "improvements": ["..."] }
  },
  "detailTips": [
    {
      "area": "pronunciation" | "listening" | "vocabulary" | "grammar" | "fluency",
      "label": "짧은 제목 (예: 강세, 연음, 복문 활용)",
      "text": "구체적 조언 (한국어). 사용자가 실제로 쓴 단어/표현을 인용할 것",
      "example": "영어 예시 문장 또는 교정 예시"
    }
  ],
  "vocabularyGroups": [
    { "title": "업무/역할 표현", "items": ["manage", "oversee", "coordinate"] },
    { "title": "성과/기여 표현", "items": ["contribute to", "drive", "enhance"] }
  ],
  "learningActions": [
    { "label": "고급 어휘 10개씩 매일 학습하기", "target": 50, "unit": "개" },
    { "label": "연음 & 강세 집중 연습 (주 3회)", "target": 12, "unit": "회" }
  ],
  "contentBreakdown": [
    { "label": "업무/역할", "percent": 32 },
    { "label": "경험/기간", "percent": 24 },
    { "label": "기타", "percent": 9 }
  ],
  "topicRelevance": <0~100, 질문에 대한 답변의 주제 적합도>,
  "confidence": <0~100, 표현의 확신·자연스러움 지수>,
  "grammarIssues": ["문법 오류와 한국어 교정"],
  "vocabularySuggestions": ["더 나은 어휘 제안 (한국어 설명)"],
  "betterExpressions": ["자연스러운 표현 (한국어)"],
  "modelAnswer": "Target-level English sample answer",
  "strengths": ["잘한 점 (한국어)"],
  "improvements": ["개선점 (한국어)"]
}

RULES:
- scoreEstimate MUST equal pronunciation + listening + vocabulary + grammar + fluency.
- areas 는 5개 영역 모두 포함할 것.
- detailTips 는 5~8개. 사용자가 실제 쓴 표현을 인용해 구체적으로.
- vocabularyGroups 는 3~5개 그룹, 그룹당 3~5개 표현.
- learningActions 는 3~4개.
- contentBreakdown 의 percent 합은 100.
- Be honest and strict. 점수를 부풀리지 말 것.`;

/**
 * 서버 프록시(/api/hchat) 호출. 그 안에서 Cloudflare Tunnel 을 통해 사내 HChat 으로 라우팅됨.
 */
async function callProxy(
  config: HchatConfig,
  messages: { role: string; content: string }[],
  maxTokens = 1500,
): Promise<{ ok: boolean; content?: string; error?: string }> {
  try {
    const res = await fetch("/api/hchat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: config.apiKey,
        model: config.model,
        messages,
        maxTokens,
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      return { ok: false, error: data.error || `HTTP ${data.status || "?"}` };
    }
    return { ok: true, content: data.content };
  } catch (e: any) {
    return { ok: false, error: e.message || "fetch failed" };
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
    3200,
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

    return withReportFallbacks(
      {
        grammarIssues: parsed.grammarIssues || [],
        vocabularySuggestions: parsed.vocabularySuggestions || [],
        betterExpressions: parsed.betterExpressions || [],
        modelAnswer: parsed.modelAnswer || "",
        estimatedLevel: scoreToLevel(finalScore),
        scoreEstimate: finalScore,
        strengths: parsed.strengths || [],
        improvements: parsed.improvements || [],
        summaryComment: parsed.summaryComment,
        overallComment: parsed.overallComment,
        areas: parsed.areas,
        detailTips: Array.isArray(parsed.detailTips) ? parsed.detailTips : undefined,
        vocabularyGroups: Array.isArray(parsed.vocabularyGroups)
          ? parsed.vocabularyGroups
          : undefined,
        learningActions: Array.isArray(parsed.learningActions)
          ? parsed.learningActions
          : undefined,
        contentBreakdown: Array.isArray(parsed.contentBreakdown)
          ? parsed.contentBreakdown
          : undefined,
        topicRelevance:
          typeof parsed.topicRelevance === "number" ? parsed.topicRelevance : undefined,
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : undefined,
        criteria,
      },
      req,
    );
  } catch (e) {
    console.error("Parse fail:", e);
    return strictMockFeedback(req);
  }
}

const AREA_MAX: Record<CriteriaKey, number> = {
  pronunciation: 12,
  listening: 36,
  vocabulary: 12,
  grammar: 24,
  fluency: 12,
};

const AREA_LABEL: Record<CriteriaKey, string> = {
  pronunciation: "발음",
  listening: "청취·답변",
  vocabulary: "어휘",
  grammar: "문법",
  fluency: "유창성",
};

/** 영역별 점수 비율에 따른 기본 분석 문구 (AI 응답에 areas 가 없을 때 사용) */
const AREA_TEMPLATES: Record<
  CriteriaKey,
  { high: AreaAnalysis; mid: AreaAnalysis; low: AreaAnalysis }
> = {
  pronunciation: {
    high: {
      summary: "전반적으로 정확한 발음이에요. 강세와 억양이 자연스럽습니다.",
      strengths: ["문장 내 강세", "명료한 발음"],
      improvements: ["단어 강세 정교화", "연음(linking) 다듬기"],
    },
    mid: {
      summary: "대체로 알아듣기 쉬운 발음이에요. 몇몇 단어의 강세와 연음이 자연스럽지 않아요.",
      strengths: ["기본 발음 명료도", "적절한 말하기 속도"],
      improvements: ["단어 강세 교정", "연음(linking) 개선"],
    },
    low: {
      summary: "발음 정확도를 높이면 점수가 크게 오릅니다. 단어 단위 강세부터 연습해보세요.",
      strengths: ["말하기 시도"],
      improvements: ["단어 강세 기초 연습", "또박또박 발음하기"],
    },
  },
  listening: {
    high: {
      summary: "질문의 핵심을 정확히 파악하고 충분한 근거로 답변했어요.",
      strengths: ["질문 이해도", "핵심 내용 포함"],
      improvements: ["추가 사례 보완", "결론 문장 강화"],
    },
    mid: {
      summary: "질문의 핵심은 잘 파악하고 관련 내용을 적절히 답변했어요. 답변 길이와 발화량이 조금 부족해요.",
      strengths: ["질문 이해도", "핵심 내용 포함"],
      improvements: ["추가 설명/사례 보완", "답변 길이 확장"],
    },
    low: {
      summary: "질문에 대한 답변이 짧거나 핵심에서 벗어났어요. 질문을 다시 확인하고 답변을 구조화해보세요.",
      strengths: ["답변 시도"],
      improvements: ["질문 핵심 파악", "최소 5문장 이상 답변"],
    },
  },
  vocabulary: {
    high: {
      summary: "상황에 맞는 고급 어휘를 폭넓게 사용했어요.",
      strengths: ["고급 어휘 활용", "정확한 어휘 선택"],
      improvements: ["관용적 표현 확대", "동의어 다양화"],
    },
    mid: {
      summary: "기본 어휘는 적절하지만, 비즈니스 상황에 맞는 고급 어휘와 어구 활용이 제한적이에요.",
      strengths: ["기본 어휘 사용", "적절한 주제 어휘"],
      improvements: ["고급 어휘 사용 확대", "관용적 표현 활용"],
    },
    low: {
      summary: "사용한 어휘의 종류가 적어요. 주제별 핵심 표현을 늘리면 점수가 오릅니다.",
      strengths: ["기초 어휘 사용"],
      improvements: ["주제별 표현 암기", "반복 단어 줄이기"],
    },
  },
  grammar: {
    high: {
      summary: "문법적으로 매우 안정적이며 복잡한 문장 구조도 정확하게 구사했어요.",
      strengths: ["시제 일관성", "복문 구조 활용"],
      improvements: ["관계사 다양화", "수동태 활용"],
    },
    mid: {
      summary: "문법적으로 안정적이에요. 복잡한 문장 구조를 시도하면 더 좋은 점수를 받을 수 있어요.",
      strengths: ["시제 일관성", "기본 문장 구조"],
      improvements: ["복문/분사구문 활용", "전치사/관계사 다양화"],
    },
    low: {
      summary: "기본 문형에서 오류가 보여요. 시제와 주어·동사 일치부터 다져보세요.",
      strengths: ["짧은 문장 구성"],
      improvements: ["시제 일치 교정", "주어·동사 수 일치"],
    },
  },
  fluency: {
    high: {
      summary: "말하기 속도와 흐름이 매우 자연스럽고 논리 전개가 매끄러워요.",
      strengths: ["자연스러운 속도", "끊김 없는 흐름"],
      improvements: ["강조 표현 활용", "담화 표지 다양화"],
    },
    mid: {
      summary: "말하기 속도와 흐름이 자연스럽고 중간에 멈추거나 반복이 적어요. 더 다양한 연결 표현을 써보세요.",
      strengths: ["자연스러운 속도", "끊김 없는 흐름"],
      improvements: ["다양한 연결어 사용", "강조/완충 표현 활용"],
    },
    low: {
      summary: "문장 사이 끊김이나 반복이 잦아요. 연결어를 활용해 흐름을 이어보세요.",
      strengths: ["답변 지속 시도"],
      improvements: ["연결어(because, so, also) 사용", "문장 간 호흡 조절"],
    },
  },
};

/** 답변 텍스트를 키워드로 분류해 발화 내용 구성 비율 산출 */
function analyzeContent(answer: string): ContentSlice[] {
  const buckets: { label: string; re: RegExp }[] = [
    { label: "업무/역할", re: /\b(work|job|role|responsib\w*|manage\w*|team|position|task|dut\w*|department|project)\b/gi },
    { label: "경험/기간", re: /\b(year|years|month|months|since|experience\w*|been|ago|worked|joined|started)\b/gi },
    { label: "동기/이유", re: /\b(because|reason|why|chose|choose|decided|want\w*|motivat\w*|interest\w*|enjoy\w*|like)\b/gi },
    { label: "기여/성과", re: /\b(improv\w*|contribut\w*|help\w*|achiev\w*|result\w*|success\w*|growth|develop\w*|support\w*|impact)\b/gi },
  ];
  const total = answer.trim().split(/\s+/).filter(Boolean).length;
  if (total === 0) return [];

  const counts = buckets.map((b) => ({
    label: b.label,
    n: (answer.match(b.re) || []).length,
  }));
  const matched = counts.reduce((s, c) => s + c.n, 0);
  if (matched === 0) {
    return [{ label: "기타", percent: 100 }];
  }
  // 매칭 단어 비중을 기준으로 백분율 배분 (기타 = 나머지)
  const otherWeight = Math.max(0, total - matched);
  const denom = matched + otherWeight;
  const slices: ContentSlice[] = counts
    .filter((c) => c.n > 0)
    .map((c) => ({ label: c.label, percent: Math.round((c.n / denom) * 100) }));
  const used = slices.reduce((s, c) => s + c.percent, 0);
  if (used < 100) slices.push({ label: "기타", percent: 100 - used });
  return slices;
}

/**
 * AI 응답에 리포트용 필드가 없을 때 로컬에서 채워 넣는다.
 * (모델이 필드를 누락해도 결과 화면이 항상 완전하게 렌더링되도록)
 */
function withReportFallbacks(fb: AiFeedback, req: FeedbackRequest): AiFeedback {
  const c = fb.criteria;
  const out: AiFeedback = { ...fb };

  const pctOf = (k: CriteriaKey) =>
    c ? Math.round(((c[k] ?? 0) / AREA_MAX[k]) * 100) : 0;

  if (!out.areas || Object.keys(out.areas).length === 0) {
    const areas: Partial<Record<CriteriaKey, AreaAnalysis>> = {};
    (Object.keys(AREA_MAX) as CriteriaKey[]).forEach((k) => {
      const p = pctOf(k);
      const t = AREA_TEMPLATES[k];
      areas[k] = p >= 80 ? t.high : p >= 55 ? t.mid : t.low;
    });
    out.areas = areas;
  }

  if (!out.detailTips || out.detailTips.length === 0) {
    const weakest = (Object.keys(AREA_MAX) as CriteriaKey[])
      .map((k) => ({ k, p: pctOf(k) }))
      .sort((a, b) => a.p - b.p)
      .slice(0, 3);
    out.detailTips = weakest.flatMap(({ k }) =>
      (out.areas?.[k]?.improvements || []).map((imp) => ({
        area: k,
        label: AREA_LABEL[k],
        text: imp,
      })),
    );
  }

  if (!out.vocabularyGroups || out.vocabularyGroups.length === 0) {
    const groups = [
      { title: "업무/역할 표현", items: ["manage", "oversee", "coordinate", "develop", "implement"] },
      { title: "성과/기여 표현", items: ["contribute to", "drive", "enhance", "improve", "add value"] },
      { title: "팀워크 표현", items: ["collaborate with", "work closely with", "support", "facilitate"] },
      { title: "연결/강조 표현", items: ["especially", "furthermore", "in addition", "as a result"] },
    ];
    out.vocabularyGroups = groups;
  }

  if (!out.learningActions || out.learningActions.length === 0) {
    out.learningActions = [
      { label: "고급 어휘 10개씩 매일 학습하기", target: 50, unit: "개" },
      { label: "연음 & 강세 집중 연습 (주 3회)", target: 12, unit: "회" },
      { label: "모의 답변 길이 1분 이상 연습하기", target: 8, unit: "회" },
      { label: "복문/분사구문 활용 연습하기", target: 10, unit: "회" },
    ];
  }

  if (!out.contentBreakdown || out.contentBreakdown.length === 0) {
    out.contentBreakdown = analyzeContent(req.userAnswer);
  }

  if (typeof out.topicRelevance !== "number") {
    out.topicRelevance = pctOf("listening");
  }
  if (typeof out.confidence !== "number") {
    out.confidence = Math.round((pctOf("fluency") + pctOf("grammar")) / 2);
  }
  if (!out.summaryComment) {
    out.summaryComment =
      out.improvements[0] ||
      "전반적으로 안정적인 답변이에요. 세부 근거와 사례를 추가하면 점수가 더 오릅니다.";
  }
  if (!out.overallComment) {
    out.overallComment =
      (out.strengths.length ? out.strengths.join(" ") + " " : "") +
      (out.improvements.length
        ? out.improvements.slice(0, 2).join(" ")
        : "구체적인 예시를 덧붙이면 설득력이 높아집니다.");
  }

  return out;
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

  return withReportFallbacks({
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
  }, req);
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
