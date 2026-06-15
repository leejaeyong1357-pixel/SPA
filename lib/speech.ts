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

export function useSTT() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string>("");
  const recognitionRef = useRef<any>(null);
  const restartingRef = useRef(false);
  // 완료된 세션들의 누적 텍스트 (자동 재시작 시 보존)
  const committedRef = useRef<string>("");
  // 현재 세션의 최종 텍스트 스냅샷 (e.results 전체 순회로 계산)
  const currentSessionRef = useRef<string>("");

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

    // 핵심 수정: e.resultIndex 누적 방식 대신 e.results 전체 스냅샷.
    // 일부 모바일 브라우저(특히 Android Chrome/Samsung)가 results 를 부분적으로
    // 재emit 하는 버그가 있어, "hello"가 여러 번 누적되는 현상 발생.
    // 매 이벤트마다 results 전체에서 final/interim 을 새로 집계 → 항상 정확한 스냅샷.
    r.onresult = (e: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) {
          finalText += res[0].transcript + " ";
        } else {
          interimText += res[0].transcript;
        }
      }
      currentSessionRef.current = finalText;
      setTranscript(committedRef.current + finalText);
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
      // 종료 시 현재 세션 텍스트를 누적 버퍼로 커밋 → 다음 세션 시작해도 보존됨
      committedRef.current += currentSessionRef.current;
      currentSessionRef.current = "";
      if (restartingRef.current) {
        try {
          r.start();
        } catch {}
      } else {
        setListening(false);
      }
    };

    recognitionRef.current = r;

    return () => {
      restartingRef.current = false;
      try {
        r.stop();
      } catch {}
    };
  }, []);

  const start = () => {
    setError("");
    setTranscript("");
    setInterimTranscript("");
    committedRef.current = "";
    currentSessionRef.current = "";
    restartingRef.current = true;
    try {
      recognitionRef.current?.start();
      setListening(true);
    } catch (e: any) {
      setError(e.message || "시작 실패");
    }
  };

  const stop = () => {
    restartingRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {}
    setListening(false);
  };

  const reset = () => {
    setTranscript("");
    setInterimTranscript("");
    committedRef.current = "";
    currentSessionRef.current = "";
  };

  return { listening, transcript, interimTranscript, error, start, stop, reset };
}
