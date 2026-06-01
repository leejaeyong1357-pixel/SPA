"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { storage } from "@/lib/storage";
import { pushUserToServer } from "@/lib/userSync";
import { LEVEL_RANGES, levelDescription } from "@/lib/scoring";
import { testConnection } from "@/lib/hchat";
import type { Level } from "@/types";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function SetupPage() {
  const router = useRouter();
  const [examDate, setExamDate] = useState("");
  const [targetLevel, setTargetLevel] = useState<Level>(6);
  const [hchatApiKey, setHchatApiKey] = useState("");
  const hchatModel = "claude-sonnet-4-6";
  const [step, setStep] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    const s = storage.getSettings();
    if (s.examDate) setExamDate(s.examDate);
    if (s.targetLevel) setTargetLevel(s.targetLevel);
    if (s.hchatApiKey) setHchatApiKey(s.hchatApiKey);
    setLoaded(true);
  }, []);

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testConnection({
      apiKey: hchatApiKey,
      model: hchatModel,
    });
    setTestResult(result);
    setTesting(false);
  };

  const save = () => {
    const existing = storage.getSettings();
    storage.saveSettings({
      ...existing,
      examDate,
      targetLevel,
      hchatEndpoint: "",
      hchatApiKey,
      hchatModel,
      setupCompleted: true,
    });
    // 서버(KV)에도 백업 — 캐시 비워져도 다음 로그인 때 자동 복원
    pushUserToServer();
    router.push("/loading-setup");
  };

  if (!loaded) return null;

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-teczen-gray-50">
      <div className="max-w-xl w-full">
        <div className="text-center mb-6">
          <Image
            src="/teczen-logo.webp"
            alt="TECZEN"
            width={160}
            height={38}
            priority
            className="h-9 w-auto mx-auto mb-2"
          />
          <h1 className="text-2xl font-bold text-teczen-gray-900">SPA Trainer 초기 설정</h1>
          <p className="text-sm text-teczen-gray-600 mt-1">단계 {step} / 3</p>
        </div>

        <Card>
          {step === 1 && (
            <div>
              <h2 className="text-lg font-bold mb-1 text-teczen-gray-900">시험 일정</h2>
              <p className="text-sm text-teczen-gray-600 mb-4">
                SPA 시험 예정일을 알려주세요. 남은 일수에 맞춰 학습량을 추천합니다.
              </p>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full border border-teczen-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-teczen-navy"
              />
              <div className="flex justify-end mt-6">
                <Button onClick={() => setStep(2)} disabled={!examDate}>
                  다음 →
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-lg font-bold mb-1 text-teczen-gray-900">목표 등급</h2>
              <p className="text-sm text-teczen-gray-600 mb-4">
                도달하고 싶은 SPA 등급을 선택하세요. 난이도와 모범답안 수준이 맞춰집니다.
              </p>
              <div className="space-y-2">
                {(Object.entries(LEVEL_RANGES) as [string, [number, number]][]).map(
                  ([lv, [min, max]]) => {
                    const level = Number(lv) as Level;
                    return (
                      <button
                        key={lv}
                        onClick={() => setTargetLevel(level)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
                          targetLevel === level
                            ? "border-teczen-navy bg-teczen-navy/5"
                            : "border-teczen-gray-200 hover:border-teczen-gray-400"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-teczen-gray-900">
                              Lv {lv} <span className="text-sm text-teczen-gray-600">({min}~{max}점)</span>
                            </div>
                            <div className="text-xs text-teczen-gray-600 mt-0.5">
                              {levelDescription(level)}
                            </div>
                          </div>
                          {targetLevel === level && <span className="text-teczen-red">●</span>}
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
              <div className="flex justify-between mt-6">
                <Button onClick={() => setStep(1)} variant="ghost">
                  ← 이전
                </Button>
                <Button onClick={() => setStep(3)}>다음 →</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-lg font-bold mb-1 text-teczen-gray-900">HChat API 연결</h2>
              <p className="text-sm text-teczen-gray-600 mb-3">
                사내 HChat Platform에서 발급받은 <b>개인 API Key</b>만 입력하세요.
                <br />
                서버 주소는 사내 HChat 표준으로 미리 설정되어 있습니다.
              </p>
              <div className="bg-teczen-blue/5 border border-teczen-blue/30 rounded-xl p-3 mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📘</span>
                  <span className="text-sm text-teczen-gray-700">
                    <b>API 키 발급 방법</b>이 처음이라 어렵나요?
                  </span>
                </div>
                <a
                  href="/api-key-guide.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-teczen-blue text-white text-xs font-bold rounded-lg hover:bg-blue-700 whitespace-nowrap"
                >
                  📖 PDF 가이드 보기
                </a>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-teczen-gray-700 mb-1">
                    개인 API Key
                  </label>
                  <input
                    type="password"
                    value={hchatApiKey}
                    onChange={(e) => {
                      setHchatApiKey(e.target.value);
                      setTestResult(null);
                    }}
                    placeholder="afd5cdc7f6..."
                    className="w-full border border-teczen-gray-300 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-teczen-navy"
                  />
                  <p className="text-xs text-teczen-gray-500 mt-1">
                    HChat Platform → 개인 API 키 조회에서 발급
                  </p>
                </div>

                <Button
                  onClick={runTest}
                  variant="outline"
                  size="sm"
                  disabled={testing || !hchatApiKey}
                  fullWidth
                >
                  {testing ? "테스트 중..." : "🔌 연결 테스트"}
                </Button>

                {testResult && (
                  <div
                    className={`p-3 rounded-xl text-sm ${
                      testResult.ok
                        ? "bg-green-50 text-green-800 border border-green-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    <div className="font-semibold mb-1">
                      {testResult.ok ? "✓ 연결 성공" : "✗ 연결 실패"}
                    </div>
                    <div>{testResult.message}</div>
                  </div>
                )}

                <p className="text-xs text-teczen-gray-500">
                  ※ API 키는 브라우저 로컬스토리지에만 저장되며 외부로 전송되지 않습니다.
                </p>
              </div>
              <div className="flex justify-between mt-6">
                <Button onClick={() => setStep(2)} variant="ghost">
                  ← 이전
                </Button>
                <Button onClick={save}>설정 완료 →</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
