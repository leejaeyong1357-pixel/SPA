"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useTTS, useSTT } from "@/lib/speech";
import { storage } from "@/lib/storage";
import { pushUserToServer } from "@/lib/userSync";
import { getFeedback } from "@/lib/hchat";
import { scoreToLevel, levelLabel } from "@/lib/scoring";
import type { AiFeedback, QuestionType } from "@/types";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Timer from "@/components/ui/Timer";
import ChartRenderer from "@/components/charts/ChartRenderer";
import MockSummary from "@/components/mock/MockSummary";
import mockExams from "@/data/mock_exams.json";
import type1 from "@/data/type1_business_casual.json";
import type2 from "@/data/type2_opinion.json";
import type3 from "@/data/type3_visual.json";
import type4 from "@/data/type4_summary.json";

const TYPE_DURATIONS: Record<number, number> = { 1: 180, 2: 180, 3: 180, 4: 200 };

export default function MockExamPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || "";
  const router = useRouter();
  const [currentType, setCurrentType] = useState<QuestionType>(1);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<number, AiFeedback>>({});
  const [phase, setPhase] = useState<"intro" | "answering" | "scoring" | "done">("intro");
  const [startedAt, setStartedAt] = useState(0);
  const { speak, stop: stopTTS, speaking } = useTTS();
  const { listening, transcript, interimTranscript, start: startSTT, stop: stopSTT, reset: resetSTT } = useSTT();
  const [editedAnswer, setEditedAnswer] = useState("");

  const exam = mockExams.exams.find((e: any) => e.id === id);

  useEffect(() => {
    if (!storage.isSetupComplete()) router.push("/setup");
  }, [router]);

  useEffect(() => {
    setEditedAnswer((transcript + " " + interimTranscript).trim());
  }, [transcript, interimTranscript]);

  if (!exam) {
    return (
      <>
        <Header />
        <main className="max-w-4xl mx-auto p-6">
          <Card>모의고사를 찾을 수 없습니다.</Card>
        </main>
      </>
    );
  }

  const items = exam.questions;
  const currentQuestion = (() => {
    const id1 = items[`type${currentType}_id`];
    // 정확한 ID 매칭 시도 → 없으면 ID 끝자리 숫자로 안전한 인덱스 폴백
    const hash = (s: string) =>
      Math.abs([...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0));
    if (currentType === 1) {
      const arr = type1.questions;
      return arr.find((q) => q.id === id1) ?? arr[hash(id1) % arr.length];
    }
    if (currentType === 2) {
      const arr = type2.questions;
      return arr.find((q) => q.id === id1) ?? arr[hash(id1) % arr.length];
    }
    if (currentType === 3) {
      const arr = type3.items;
      return arr.find((q) => q.id === id1) ?? arr[hash(id1) % arr.length];
    }
    const arr = type4.passages;
    return arr.find((q) => q.id === id1) ?? arr[hash(id1) % arr.length];
  })();

  const start = () => {
    setPhase("answering");
    setStartedAt(Date.now());
    setCurrentType(1);
  };

  const nextType = async () => {
    stopSTT();
    stopTTS();
    if (!editedAnswer.trim()) {
      if (!confirm("답변이 비어있습니다. 다음으로 넘어갈까요?")) return;
    }

    setAnswers((prev) => ({ ...prev, [currentType]: editedAnswer }));

    const settings = storage.getSettings();
    if (currentQuestion) {
      const ans: any = currentQuestion;
      const text = currentType === 4 ? ans.passage : ans.question;
      const sample = currentType === 4 ? ans.sample_summary : ans.sample_answer;

      getFeedback(
        {
          type: currentType,
          question: text,
          userAnswer: editedAnswer,
          sampleAnswer: sample,
          targetLevel: settings.targetLevel,
        },
        { apiKey: settings.hchatApiKey, model: settings.hchatModel },
      ).then((fb) => {
        setFeedbacks((prev) => ({ ...prev, [currentType]: fb }));
      });
    }

    resetSTT();
    setEditedAnswer("");

    if (currentType < 4) {
      setCurrentType((currentType + 1) as QuestionType);
    } else {
      setPhase("scoring");
    }
  };

  const finalize = () => {
    const totalScore = Math.round(
      Object.values(feedbacks).reduce((s, f) => s + f.scoreEstimate, 0) /
        Math.max(1, Object.keys(feedbacks).length),
    );
    const estimatedLevel = scoreToLevel(totalScore);

    storage.addMockResult({
      examId: exam.id,
      startedAt,
      finishedAt: Date.now(),
      type1: { questionId: items.type1_id, answer: answers[1] || "", feedback: feedbacks[1] },
      type2: { questionId: items.type2_id, answer: answers[2] || "", feedback: feedbacks[2] },
      type3: { questionId: items.type3_id, answer: answers[3] || "", feedback: feedbacks[3] },
      type4: { questionId: items.type4_id, answer: answers[4] || "", feedback: feedbacks[4] },
      totalScore,
      estimatedLevel,
    });
    pushUserToServer();
    setPhase("done");
  };

  if (phase === "intro") {
    return (
      <>
        <Header />
        <main className="max-w-3xl mx-auto p-6">
          <Card>
            <h1 className="text-2xl font-bold text-teczen-gray-900 mb-2">{exam.title}</h1>
            <p className="text-teczen-gray-600 mb-6">{exam.topics.join(" · ")}</p>

            <h2 className="font-bold text-teczen-gray-900 mb-2">시험 안내</h2>
            <ul className="space-y-1.5 text-sm text-teczen-gray-700 mb-6">
              <li>• 총 13분 (유형별 약 3분)</li>
              <li>• 유형1: 일상 질문 → 유형2: 의견 → 유형3: 그래프/사진 → 유형4: 지문 요약</li>
              <li>• 각 문제는 음성으로 답변 (마이크 권한 필요), 텍스트 직접 입력도 가능</li>
              <li>• 답변 완료 후 다음 문제로 이동 (이전으로 돌아갈 수 없음)</li>
              <li>• 시험 종료 후 종합 점수 및 등급 확인</li>
            </ul>

            <div className="flex gap-2">
              <Button onClick={start}>시험 시작 →</Button>
              <Link href="/mock">
                <Button variant="ghost">취소</Button>
              </Link>
            </div>
          </Card>
        </main>
      </>
    );
  }

  if (phase === "done") {
    const totalScore = Math.round(
      Object.values(feedbacks).reduce((s, f) => s + f.scoreEstimate, 0) /
        Math.max(1, Object.keys(feedbacks).length),
    );
    const summaryAnswers: Record<QuestionType, { questionId: string; answer: string; feedback?: AiFeedback }> = {
      1: { questionId: items.type1_id, answer: answers[1] || "", feedback: feedbacks[1] },
      2: { questionId: items.type2_id, answer: answers[2] || "", feedback: feedbacks[2] },
      3: { questionId: items.type3_id, answer: answers[3] || "", feedback: feedbacks[3] },
      4: { questionId: items.type4_id, answer: answers[4] || "", feedback: feedbacks[4] },
    };
    return (
      <>
        <Header />
        <MockSummary
          totalScore={totalScore}
          answers={summaryAnswers}
          durationMs={startedAt ? Date.now() - startedAt : undefined}
        />
      </>
    );
  }

  if (phase === "scoring") {
    const ready = Object.keys(feedbacks).length === 4;
    return (
      <>
        <Header />
        <main className="max-w-3xl mx-auto p-6">
          <Card className="text-center py-12">
            {ready ? (
              <>
                <div className="text-4xl mb-3">📊</div>
                <h1 className="text-2xl font-bold text-teczen-gray-900 mb-3">채점 완료</h1>
                <Button onClick={finalize}>결과 확인 →</Button>
              </>
            ) : (
              <>
                <div className="inline-block w-12 h-12 border-4 border-teczen-navy border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-teczen-gray-700">AI가 답변을 채점하고 있어요...</p>
                <p className="text-xs text-teczen-gray-500 mt-2">
                  완료: {Object.keys(feedbacks).length} / 4
                </p>
              </>
            )}
          </Card>
        </main>
      </>
    );
  }

  if (!currentQuestion) return null;
  const cq: any = currentQuestion;

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs text-teczen-gray-500">{exam.title}</div>
            <h1 className="text-xl font-bold text-teczen-gray-900">
              유형 {currentType} ({currentType}/4)
            </h1>
          </div>
          <Timer
            seconds={TYPE_DURATIONS[currentType]}
            onExpire={nextType}
            autoStart
            label="남은 시간"
            key={currentType}
          />
        </div>

        <div className="w-full bg-teczen-gray-100 h-1 rounded mb-4 overflow-hidden">
          <div
            className="bg-teczen-navy h-1 transition-all"
            style={{ width: `${((currentType - 1) / 4) * 100}%` }}
          />
        </div>

        {currentType === 3 && cq.subtype !== "photo" && (
          <Card className="mb-4">
            <ChartRenderer item={cq} />
          </Card>
        )}
        {currentType === 3 && cq.subtype === "photo" && (
          <Card className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-teczen-red">PHOTO</span>
              <span className="text-[11px] font-bold text-teczen-blue">
                👥 사람과 그들의 행동을 중심으로 묘사하세요
              </span>
            </div>
            {cq.image_url && (
              <img src={cq.image_url} alt="" className="w-full max-h-80 object-cover rounded-xl" />
            )}
            {cq.image_description && (
              <div className="mt-3 p-3 bg-teczen-blue/5 border border-teczen-blue/20 rounded-xl">
                <div className="text-[10px] font-black tracking-wider text-teczen-blue mb-1">
                  📝 SCENE DESCRIPTION
                </div>
                <p className="text-sm text-teczen-ink leading-relaxed">{cq.image_description}</p>
              </div>
            )}
          </Card>
        )}

        <Card className="mb-4">
          <div className="mb-3 p-3 bg-teczen-blue/10 border-l-4 border-teczen-blue rounded-r-xl flex items-start gap-2">
            <span className="text-xl leading-none">📌</span>
            <div>
              <div className="text-xs font-bold text-teczen-blue mb-0.5">미션</div>
              <div className="text-sm font-semibold text-teczen-ink leading-snug">
                {currentType === 1 &&
                  "질문을 듣고 1분 안에 영어로 답변하세요. 본인 경험·생각을 자유롭게."}
                {currentType === 2 &&
                  "주제에 대한 본인 의견을 근거와 함께 1분 안에 영어로 답변하세요."}
                {currentType === 3 &&
                  "위 그래프/사진을 1분 안에 영어로 묘사하세요. 사진일 경우 사람과 그들의 행동을 중심으로!"}
                {currentType === 4 &&
                  "지문을 듣고 핵심 내용을 1분 안에 본인 말로 영어 요약하세요. (질문 없음 — 요약만)"}
              </div>
            </div>
          </div>
          <div className="text-xs font-semibold text-teczen-red mb-1">
            {currentType === 4 ? "PASSAGE" : "QUESTION"}
          </div>
          <p className="text-lg font-semibold text-teczen-gray-900 leading-relaxed mb-3">
            {currentType === 4 ? cq.passage : cq.question}
          </p>
          <Button
            onClick={() =>
              speaking
                ? stopTTS()
                : speak(currentType === 4 ? cq.passage : cq.question, {
                    rate: currentType === 4 ? 0.9 : 0.95,
                  })
            }
            variant={speaking ? "danger" : "primary"}
            size="sm"
          >
            {speaking ? "■ 정지" : "▶ 듣기"}
          </Button>
        </Card>

        <Card className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-teczen-red">YOUR ANSWER</div>
            <Button
              onClick={listening ? stopSTT : startSTT}
              variant={listening ? "danger" : "primary"}
              size="sm"
            >
              {listening ? "● 녹음 정지" : "🎤 음성 답변"}
            </Button>
          </div>
          <textarea
            value={editedAnswer}
            onChange={(e) => setEditedAnswer(e.target.value)}
            placeholder="영어로 답변하세요."
            className="w-full min-h-[140px] border border-teczen-gray-300 rounded-xl p-4 text-sm focus:outline-none focus:border-teczen-navy"
          />
        </Card>

        <div className="flex justify-end">
          <Button onClick={nextType}>
            {currentType === 4 ? "시험 종료 →" : "다음 유형 →"}
          </Button>
        </div>
      </main>
    </>
  );
}
