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
 * 모바일 브라우저 결과 누적 버그 우회 + 자동 재시작 지원.
 * - prefix 가 겹치는 final 결과는 더 긴 것만 남기는 dedup (모바일 핵심 버그 우회)
 * - 세션 간 누적: lastSeenRef 에 longest snapshot 유지.
 *   다음 세션 snapshot 이 prefix 면 그대로, 다르면 append (browser 가 e.results 를
 *   초기화하는 경우와 유지하는 경우 모두 대응).
 * - onend 시 사용자가 stop 한 게 아니면 자동 재시작 → 침묵 후에도 실시간 인식 계속.
 */
export function useSTT() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string>("");
  const recognitionRef = useRef<any>(null);
  const restartingRef = useRef(false);
  // 지금까지 본 가장 긴 confirmed 텍스트 (세션 간 누적용)
  const lastSeenRef = useRef("");

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
      // 1) 현재 snapshot 을 prefix-aware dedup 으로 정리
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
            if (lastL === curL) continue;
            if (curL.startsWith(lastL)) {
              finalParts[finalParts.length - 1] = t;
              continue;
            }
            if (lastL.startsWith(curL)) continue;
          }
          finalParts.push(t);
        } else {
          interimText += res[0].transcript;
        }
      }
      const snapshot = finalParts.join(" ");

      // 2) 세션 누적: snapshot vs lastSeen 비교
      let newTotal: string;
      if (!snapshot) {
        newTotal = lastSeenRef.current;
      } else if (!lastSeenRef.current) {
        newTotal = snapshot;
      } else {
        const seenL = lastSeenRef.current.toLowerCase();
        const snapL = snapshot.toLowerCase();
        if (snapL.startsWith(seenL)) {
          // snapshot 이 이전 누적의 확장 → 사용 (browser 가 e.results 유지)
          newTotal = snapshot;
        } else if (seenL.startsWith(snapL)) {
          // snapshot 이 더 짧은 prefix → 누적 유지
          newTotal = lastSeenRef.current;
        } else {
          // 다른 내용 → 새 utterance 로 보고 append (browser 가 reset 한 경우)
          newTotal = lastSeenRef.current + " " + snapshot;
        }
      }
      lastSeenRef.current = newTotal;
      setTranscript(newTotal);
      setInterimTranscript(interimText);
    };

    r.onerror = (e: any) => {
      // no-speech / aborted 는 정상 흐름(침묵, 재시작)이라 무시
      if (e.error === "no-speech" || e.error === "aborted") {
        return;
      }
      // 브라우저 음성 인식은 오디오를 외부 음성 서버로 보내 처리함.
      // 사내망에서 해당 도메인이 차단되면 network 오류가 발생 → 안내 필요.
      const messages: Record<string, string> = {
        "not-allowed":
          "마이크 권한이 차단되었습니다. 주소창 자물쇠(🔒) → 마이크 → '허용' 으로 변경 후 새로고침해주세요.",
        "service-not-allowed":
          "브라우저가 음성 인식 서비스를 차단했습니다. Chrome 설정 → 개인정보 및 보안 → 사이트 설정 → 마이크 확인이 필요합니다.",
        network:
          "음성 인식 서버에 연결할 수 없습니다. 사내망 방화벽이 음성 서비스를 차단하고 있을 수 있어요. 답변은 아래 입력창에 직접 작성하셔도 채점됩니다.",
        "audio-capture":
          "마이크 장치를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.",
      };
      setError(
        messages[e.error] ||
          `음성 인식 오류(${e.error}) — 답변은 아래 입력창에 직접 작성하셔도 채점됩니다.`,
      );
      restartingRef.current = false;
      setListening(false);
    };

    r.onend = () => {
      // 사용자가 stop() 한 게 아니면 자동 재시작 → 침묵 후에도 실시간 인식 유지
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
    lastSeenRef.current = "";
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
    lastSeenRef.current = "";
  };

  return { listening, transcript, interimTranscript, error, start, stop, reset };
}
