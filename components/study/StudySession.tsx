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

  const startSTT = () => {
    startSTTRaw();
  };

  const stopSTT = () => {
    stopSTTRaw();
  };

  const [step, setStep] = useState<"intro" | "answer" | "feedback">("intro");
  const [editedAnswer, setEditedAnswer] = useState("");
  const [feedback, setFeedback] = useState<AiFeedback | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [showKorean, setShowKorean] = useState(false);
  const [translation, setTranslation] = useState<string>("");
  const [translating, setTranslating] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const autoSubmitRef = useRef(false);
  const editedAnswerRef = useRef("");

  useEffect(() => {
    editedAnswerRef.current = editedAnswer;
  }, [editedAnswer]);

  useEffect(() => {
    if (listening) {
      setEditedAnswer((transcript + " " + interimTranscript).trim());
    }
  }, [transcript, interimTranscript, listening]);

  useEffect(() => {
    if (!listening) return;
    setTimeLeft(60);
    autoSubmitRef.current = false;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          autoSubmitRef.current = true;
          stopSTTRaw();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening]);

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
    await stopSTT();
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
    if (
      !listening &&
      autoSubmitRef.current &&
      step === "answer" &&
      editedAnswerRef.current.trim()
    ) {
      autoSubmitRef.current = false;
      const id = setTimeout(() => submitAnswer(), 400);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening, step]);

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
                onClick={listening ? stopSTT : startSTT}
                variant={listening ? "danger" : "primary"}
                size="sm"
              >
                {listening ? "■ 정지" : "🎤 음성 답변 시작"}
              </Button>
              {listening && editedAnswer.trim() && (
                <Button onClick={submitAnswer} variant="primary" size="sm">
                  ✓ 정지 + 채점받기
                </Button>
              )}
            </div>
          </div>

          {sttError && (
            <div className="mb-3 text-xs text-teczen-red bg-teczen-red/5 p-2 rounded">
              {sttError}
            </div>
          )}

          {listening && (
            <div className="mb-3 rounded-xl border-2 border-teczen-red bg-teczen-red/5 p-4 min-h-[64px]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 bg-teczen-red rounded-full animate-pulse" />
                  <span className="text-xs font-bold text-teczen-red">실시간 인식 중...</span>
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
                    영어로 말해주세요. 1분 안에 답변을 마쳐주세요.
                  </span>
                )}
              </p>
            </div>
          )}

          <textarea
            value={editedAnswer}
            onChange={(e) => setEditedAnswer(e.target.value)}
            placeholder="🎤 버튼을 누르고 영어로 답변하거나, 직접 입력하세요."
            className="w-full min-h-[140px] border-2 border-teczen-gray-300 rounded-xl p-4 text-base leading-relaxed focus:outline-none focus:border-teczen-navy resize-y transition-colors"
          />
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
