"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [hasEnglishVoice, setHasEnglishVoice] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => {
      const v = window.speechSynthesis.getVoices();
      setVoices(v);
      setHasEnglishVoice(v.some((voice) => voice.lang.toLowerCase().startsWith("en")));
    };
    update();
    window.speechSynthesis.onvoiceschanged = update;
  }, []);

  const pickEnglishVoice = (): SpeechSynthesisVoice | undefined => {
    const englishOnly = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
    if (englishOnly.length === 0) return undefined;

    const priorities = [
      (v: SpeechSynthesisVoice) =>
        v.lang === "en-US" && /google/i.test(v.name) && /us/i.test(v.name),
      (v: SpeechSynthesisVoice) => v.lang === "en-US" && /google/i.test(v.name),
      (v: SpeechSynthesisVoice) => v.lang === "en-US" && /natural/i.test(v.name),
      (v: SpeechSynthesisVoice) => v.lang === "en-US" && !/korean/i.test(v.name),
      (v: SpeechSynthesisVoice) => v.lang.startsWith("en-") && !/korean/i.test(v.name),
      (v: SpeechSynthesisVoice) => v.lang.startsWith("en"),
    ];

    for (const p of priorities) {
      const match = englishOnly.find(p);
      if (match) return match;
    }
    return englishOnly[0];
  };

  const speak = (text: string, opts: { rate?: number } = {}) => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();

    const voice = pickEnglishVoice();
    if (!voice) {
      alert(
        "이 기기에는 영어 음성이 설치되어 있지 않습니다.\n\nWindows: 설정 → 시간 및 언어 → 음성 → 음성 추가 → 'English (United States)' 다운로드\n\nChrome 브라우저 권장.",
      );
      return;
    }

    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice.lang;
    u.voice = voice;
    u.rate = opts.rate ?? 0.95;
    u.pitch = 1;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  };

  const stop = () => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  return { speak, stop, speaking, voices, hasEnglishVoice };
}

/**
 * Web Speech API 음성 인식 훅.
 *
 * ⚠️ 주의: 자동 재시작 안 함.
 *   - 일부 모바일 브라우저(Android Chrome 등)는 stop() 후 start() 해도 e.results 가 초기화되지
 *     않고 이전 세션 결과가 그대로 남는 버그가 있음. 자동 재시작 + 결과 누적 시 같은 단어가
 *     반복 누적되는 'hello hello hello...' 현상 발생.
 *   - 대신 매 세션을 독립적으로 처리하고, 상위 컴포넌트(StudySession)가 base 답변 위에
 *     새 세션 결과를 이어붙이는 방식으로 처리.
 *
 * transcript 는 매 onresult 마다 e.results 전체 스냅샷으로 재계산 → 중복 없음.
 */
export function useSTT() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string>("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError("이 브라우저는 음성 인식을 지원하지 않습니다 (Android Chrome 권장)");
      return;
    }
    const r = new SR();
    r.lang = "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onresult = (e: any) => {
      // ⚠️ Android Chrome / 일부 모바일 브라우저 버그 우회:
      // 단어가 늘어날 때마다 새 final 결과를 추가함 → e.results 안에
      //   [final "hello", final "hello this", final "hello this is", ...]
      // 형태로 동일 prefix 가 반복됨. 그대로 concat 하면
      //   "hello hello this hello this is ..." 처럼 누적됨.
      // → prefix 가 겹치는 result 는 더 긴 것만 남기고 중복 제거.
      const finalParts: string[] = [];
      let interimText = "";
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) {
          const t = res[0].transcript.trim();
          if (!t) continue;
          if (finalParts.length > 0) {
            const last = finalParts[finalParts.length - 1];
            const lastL = last.toLowerCase();
            const curL = t.toLowerCase();
            if (lastL === curL) continue; // 완전 중복 → 건너뜀
            if (curL.startsWith(lastL)) {
              finalParts[finalParts.length - 1] = t; // 새 결과가 이전 결과를 확장 → 교체
              continue;
            }
            if (lastL.startsWith(curL)) continue; // 새 결과가 이전 결과의 prefix → 건너뜀
          }
          finalParts.push(t);
        } else {
          interimText += res[0].transcript;
        }
      }
      const finalText = finalParts.join(" ");
      setTranscript(finalText);
      setInterimTranscript(interimText);
    };

    r.onerror = (e: any) => {
      if (e.error === "no-speech" || e.error === "aborted") {
        return;
      }
      setError(
        e.error === "not-allowed"
          ? "마이크 권한이 차단되었습니다. 주소창 자물쇠 → 마이크 허용"
          : `음성 인식 오류: ${e.error}`,
      );
      setListening(false);
    };

    r.onend = () => {
      // 자동 재시작 없음. listening=false 로 종료.
      setListening(false);
    };

    recognitionRef.current = r;

    return () => {
      try {
        r.stop();
      } catch {}
    };
  }, []);

  const start = () => {
    setError("");
    setTranscript("");
    setInterimTranscript("");
    try {
      recognitionRef.current?.start();
      setListening(true);
    } catch (e: any) {
      setError(e.message || "시작 실패");
    }
  };

  const stop = () => {
    try {
      recognitionRef.current?.stop();
    } catch {}
    setListening(false);
  };

  const reset = () => {
    setTranscript("");
    setInterimTranscript("");
  };

  return { listening, transcript, interimTranscript, error, start, stop, reset };
}
