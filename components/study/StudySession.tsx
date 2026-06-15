"use client";

import { useEffect, useRef, useState } from "react";
import { useTTS, useSTT } from "@/lib/speech";
import { storage } from "@/lib/storage";
import { pushFlame } from "@/lib/flameSync";
import { pushUserToServer } from "@/lib/userSync";
import { getFeedback, translateText } from "@/lib/hchat";
import type { AiFeedback, QuestionType } from "@/types";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FeedbackPanel from "./FeedbackPanel";
import { HoverText, WordHoverProvider } from "./WordHover";

interface Props {
  type: QuestionType;
  questionId: string;
  question: string;
  followUps?: string[];
  sampleAnswer: string;
  passageText?: string;
  visualContent?: React.ReactNode;
  passageRepeats?: number;
}

export default function StudySession({
  type,
  questionId,
  question,
  followUps = [],
  sampleAnswer,
  passageText,
  visualContent,
  passageRepeats = 2,
}: Props) {
  const { speak, stop: stopTTS, speaking } = useTTS();
  const {
    listening,
    transcript,
    interimTranscript,
    error: sttError,
    start: startSTTRaw,
    stop: stopSTTRaw,
    reset: resetSTT,
  } = useSTT();

  const [step, setStep] = useState<"intro" | "answer" | "feedback">("intro");
  const [editedAnswer, setEditedAnswer] = useState("");
  const [feedback, setFeedback] = useState<AiFeedback | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [showKorean, setShowKorean] = useState(false);
  const [translation, setTranslation] = useState<string>("");
  const [translating, setTranslating] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  // 답변 세션 상태 (STT listening 과는 별개) — 60초 타이머는 이 상태에 묶임
  // STT 는 자동 재시작으로 침묵 후에도 실시간 인식 계속됨
  const [answering, setAnswering] = useState(false);
  const autoSubmitRef = useRef(false);
  const editedAnswerRef = useRef("");
  const baseAnswerRef = useRef("");

  const startAnswering = () => {
    baseAnswerRef.current = editedAnswer.trim();
    setAnswering(true);
    startSTTRaw();
  };

  const stopAnsweringOnly = () => {
    setAnswering(false);
    stopSTTRaw();
  };

  useEffect(() => {
    editedAnswerRef.current = editedAnswer;
  }, [editedAnswer]);

  useEffect(() => {
    if (listening) {
      const live = (transcript + " " + interimTranscript).trim();
      const base = baseAnswerRef.current;
      const combined = base ? (live ? base + " " + live : base) : live;
      setEditedAnswer(combined);
    }
  }, [transcript, interimTranscript, listening]);

  // 60초 타이머는 answering 에만 묶임 → STT 가 침묵으로 잠시 꺼져도 타이머는 계속
  useEffect(() => {
    if (!answering) return;
    setTimeLeft(60);
    autoSubmitRef.current = false;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          autoSubmitRef.current = true;
          stopSTTRaw();
          setAnswering(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answering]);

  const playQuestion = () => {
    const text = type === 4 && passageText ? passageText : question;
    speak(text, { rate: type === 4 ? 0.9 : 0.95 });
    setPlayCount((c) => c + 1);
  };

  const toggleKorean = async () => {
    if (showKorean) {
      setShowKorean(false);
      return;
    }
    if (translation) {
      setShowKorean(true);
      return;
    }
    setTranslating(true);
    const settings = storage.getSettings();
    const text = type === 4 && passageText ? passageText : question;
    const ko = await translateText(text, { apiKey: settings.hchatApiKey, model: settings.hchatModel });
    setTranslation(ko);
    setShowKorean(true);
    setTranslating(false);
  };

  const submitAnswer = async () => {
    if (!editedAnswer.trim()) return;
    stopSTTRaw();
    setAnswering(false);
    setLoadingFeedback(true);
    setStep("feedback");

    const settings = storage.getSettings();
    const session = storage.getSession();
    const result = await getFeedback(
      {
        type,
        question: type === 4 && passageText ? passageText : question,
        userAnswer: editedAnswer,
        sampleAnswer,
        targetLevel: settings.targetLevel,
      },
      { apiKey: settings.hchatApiKey, model: settings.hchatModel },
    );
    setFeedback(result);
    setLoadingFeedback(false);

    const recordId = `${questionId}_${Date.now()}`;
    storage.addRecord({
      id: recordId,
      questionId,
      type,
      userAnswer: editedAnswer,
      feedback: result,
      score: result.scoreEstimate,
      bookmarked: false,
      createdAt: Date.now(),
    });
    // 학습으로 올라간 불꽃을 공용 랭킹에 반영 + 관리자 통계용 KV 동기화
    pushFlame();
    pushUserToServer();
  };

  useEffect(() => {
    // 60초 만료 시에만 autoSubmitRef.current=true 가 되어 자동 제출됨.
    // STT 가 침묵으로 잠시 꺼지는 건 무시 (auto-restart 로 다시 켜지므로)
    if (
      !answering &&
      autoSubmitRef.current &&
      step === "answer" &&
      editedAnswerRef.current.trim()
    ) {
      autoSubmitRef.current = false;
      const id = setTimeout(() => submitAnswer(), 400);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answering, step]);

  const restart = () => {
    setStep("answer");
    setEditedAnswer("");
    setFeedback(null);
    setPlayCount(0);
    resetSTT();
    stopTTS();
  };

  return (
    <WordHoverProvider>
    <div className="space-y-4">
      {visualContent && <Card>{visualContent}</Card>}

      <Card>
        <div className="mb-3">
          <div className="mb-3 p-3 bg-teczen-blue/10 border-l-4 border-teczen-blue rounded-r-xl flex items-start gap-2">
            <span className="text-xl leading-none">📌</span>
            <div>
              <div className="text-xs font-bold text-teczen-blue mb-0.5">미션</div>
              <div className="text-sm font-semibold text-teczen-ink leading-snug">
                {type === 1 &&
                  "질문을 듣고 1분 안에 영어로 답변하세요. 본인 경험·생각을 자유롭게."}
                {type === 2 &&
                  "주제에 대한 본인 의견을 근거와 함께 1분 안에 영어로 답변하세요."}
                {type === 3 &&
                  "위 그래프/사진을 1분 안에 영어로 묘사하세요. 사진일 경우 사람과 그들의 행동을 중심으로!"}
                {type === 4 &&
                  "지문을 듣고 핵심 내용을 1분 안에 본인 말로 영어 요약하세요. (질문 없음 — 요약만)"}
              </div>
            </div>
          </div>
          <div className="text-xs font-semibold text-teczen-red mb-2">
            {type === 4 ? "PASSAGE (단어 위에 마우스 → 뜻)" : "QUESTION (단어 위에 마우스 → 뜻)"}
          </div>
          <HoverText text={type === 4 && passageText ? passageText : question} />

          {showKorean && (
            <div className="mt-3 p-3 bg-blue-50 border-l-4 border-teczen-blue rounded-r-lg">
              <div className="text-xs font-bold text-teczen-blue mb-1">한글 번역</div>
              <p className="text-sm text-teczen-gray-800 leading-relaxed">{translation}</p>
            </div>
          )}

          {followUps.length > 0 && step !== "intro" && (
            <div className="mt-3 pt-3 border-t border-teczen-gray-100">
              <div className="text-xs font-semibold text-teczen-gray-500 mb-1">FOLLOW-UP</div>
              <div className="text-sm text-teczen-gray-700 space-y-1">
                {followUps.map((q, i) => (
                  <div key={i}>
                    <HoverText text={`• ${q}`} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Button
            onClick={speaking ? stopTTS : playQuestion}
            variant={speaking ? "danger" : "primary"}
            size="sm"
            disabled={type === 4 && playCount >= passageRepeats && !speaking}
          >
            {speaking ? "■ 정지" : type === 4 ? `▶ 듣기 (${playCount}/${passageRepeats})` : "▶ 문제 듣기"}
          </Button>

          <Button onClick={toggleKorean} variant="outline" size="sm" disabled={translating}>
            {translating ? "번역 중..." : showKorean ? "🇰🇷 한글 숨기기" : "🇰🇷 문제 한글로 보기"}
          </Button>

          {step === "intro" && (
            <Button onClick={() => setStep("answer")} variant="primary" size="sm">
              답변 시작 →
            </Button>
          )}
        </div>
      </Card>

      {step !== "intro" && (
        <Card>
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <div className="text-xs font-semibold text-teczen-red">YOUR ANSWER (실시간 인식)</div>
            <div className="flex gap-2">
              <Button
                onClick={answering ? stopAnsweringOnly : startAnswering}
                variant={answering ? "danger" : "primary"}
                size="sm"
              >
                {answering ? "■ 음성 중지" : "🎤 음성 답변 시작"}
              </Button>
              {answering && editedAnswer.trim() && (
                <Button onClick={submitAnswer} variant="primary" size="sm">
                  ✓ 채점받기
                </Button>
              )}
            </div>
          </div>

          {sttError && (
            <div className="mb-3 text-xs text-teczen-red bg-teczen-red/5 p-2 rounded">
              {sttError}
            </div>
          )}

          {answering && (
            <div className="mb-3 rounded-xl border-2 border-teczen-red bg-teczen-red/5 p-4 min-h-[64px]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2.5 h-2.5 bg-teczen-red rounded-full ${listening ? "animate-pulse" : "opacity-50"}`} />
                  <span className="text-xs font-bold text-teczen-red">
                    {listening ? "실시간 인식 중..." : "음성 대기 중 — 계속 말하세요"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-teczen-gray-500">남은 시간</span>
                  <span
                    className={`text-base font-black tabular-nums ${
                      timeLeft <= 10 ? "text-teczen-red animate-pulse" : "text-teczen-ink"
                    }`}
                  >
                    {timeLeft}s
                  </span>
                </div>
              </div>
              <div className="w-full bg-teczen-red/10 rounded-full h-1 mb-3 overflow-hidden">
                <div
                  className="bg-teczen-red h-1 transition-all ease-linear"
                  style={{ width: `${(timeLeft / 60) * 100}%` }}
                />
              </div>
              <p className="text-lg leading-relaxed">
                <span className="text-teczen-ink font-semibold">{transcript}</span>
                <span className="text-teczen-gray-400">{interimTranscript}</span>
                {!transcript && !interimTranscript && (
                  <span className="text-teczen-gray-400 text-base">
                    영어로 말해주세요. 60초 안에 ✓ 채점받기 를 눌러주세요.
                  </span>
                )}
              </p>
            </div>
          )}

          <textarea
            value={editedAnswer}
            onChange={(e) => setEditedAnswer(e.target.value)}
            placeholder="🎤 버튼을 누르고 영어로 답변하거나, 직접 입력하세요. 인식이 잘못된 단어는 여기서 직접 수정할 수 있어요."
            className="w-full min-h-[140px] border-2 border-teczen-gray-300 rounded-xl p-4 text-base leading-relaxed focus:outline-none focus:border-teczen-navy resize-y transition-colors"
          />
          <p className="text-[11px] text-teczen-gray-500 mt-1">
            💡 인식이 잘 안되는 단어는 위 텍스트 영역에서 직접 수정할 수 있어요.
          </p>
          {editedAnswer && (
            <div className="text-xs text-teczen-gray-500 mt-1">
              {editedAnswer.trim().split(/\s+/).filter(Boolean).length} 단어 ·{" "}
              {editedAnswer.split(/[.!?]+/).filter((s) => s.trim()).length} 문장
            </div>
          )}

          {step === "answer" && (
            <div className="flex gap-2 mt-3">
              <Button onClick={submitAnswer} disabled={!editedAnswer.trim()}>
                AI 채점 받기 →
              </Button>
              <Button onClick={() => { resetSTT(); setEditedAnswer(""); }} variant="ghost" size="sm">
                전체 지우기
              </Button>
            </div>
          )}
        </Card>
      )}

      {step === "feedback" && (
        <FeedbackPanel
          loading={loadingFeedback}
          feedback={feedback}
          userAnswer={editedAnswer}
          sampleAnswer={sampleAnswer}
          onRestart={restart}
        />
      )}
    </div>
    </WordHoverProvider>
  );
}
