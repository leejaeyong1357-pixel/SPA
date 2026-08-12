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

/* ─────────────────────────── 음성 인식 (STT) ─────────────────────────── */

/** 비교용 정규화 — 대소문자·구두점 무시 */
function normWord(w: string): string {
  return w.toLowerCase().replace(/[^a-z0-9']/g, "");
}

/**
 * 연속 반복 구간 축약.
 *
 * 모바일 음성 인식이 같은 발화를 여러 번 확정(final)으로 내보내는 경우가 있어
 * 최종 텍스트에서 한 번 더 정리한다.
 *  - 단어 1개: 3회 이상 연속될 때만 축약 ("really really" 같은 자연스러운 강조는 보존)
 *  - 2~4단어 구: 2회 이상 연속되면 축약 (자연 발화에서 거의 없는 패턴 = 인식 오류)
 */
function collapseOnce(words: string[]): string[] {
  // 짧은 단위(단어)부터 처리해야 "hi hi hi hi" 가 "hi" 로 완전히 줄어든다.
  // (긴 구를 먼저 보면 "hi hi" + "hi hi" 로 묶여 절반만 줄어듦)
  for (let n = 1; n <= 4; n++) {
    const out: string[] = [];
    let i = 0;
    let changed = false;
    while (i < words.length) {
      const need = n === 1 ? 3 : 2; // 축약 기준 반복 횟수
      if (i + n * need <= words.length) {
        const first = words.slice(i, i + n).map(normWord).join(" ");
        if (first.replace(/\s/g, "")) {
          let reps = 1;
          while (
            i + n * (reps + 1) <= words.length &&
            words
              .slice(i + n * reps, i + n * (reps + 1))
              .map(normWord)
              .join(" ") === first
          ) {
            reps++;
          }
          if (reps >= need) {
            out.push(...words.slice(i, i + n));
            i += n * reps;
            changed = true;
            continue;
          }
        }
      }
      out.push(words[i]);
      i += 1;
    }
    if (changed) return out;
  }
  return words;
}

function collapseRepeats(text: string): string {
  let words = text.split(/\s+/).filter(Boolean);
  for (let guard = 0; guard < 8; guard++) {
    const next = collapseOnce(words);
    if (next.length === words.length) break;
    words = next;
  }
  return words.join(" ");
}

function joinText(a: string, b: string): string {
  return [a.trim(), b.trim()].filter(Boolean).join(" ").trim();
}

/**
 * Web Speech API 음성 인식 훅.
 *
 * ⚠️ 모바일 중복 인식(엔진 레벨) 대응 — "hi" 한 번인데 3~4번 입력되는 문제:
 *  1) 인식 엔진은 항상 정확히 하나만 살아있게 보장한다.
 *     엔진이 둘 이상 동시에 마이크를 듣고 있으면 같은 소리를 각각 받아써서 그대로 중복된다.
 *     새 세션을 시작하기 전에 이전 인스턴스의 핸들러를 떼고 abort() 로 확실히 죽인다.
 *  2) 세대(generation) 토큰으로 죽은 세션의 지연 콜백을 무시한다.
 *     abort 이후에도 큐에 남아 늦게 도착하는 onresult/onend 가 텍스트를 다시 밀어 넣는 것을 차단.
 *  3) 세션마다 인스턴스를 새로 만든다. 같은 인스턴스로 start() 를 다시 호출하면 일부 모바일
 *     브라우저가 이전 e.results 를 유지해 재시작 때마다 같은 발화가 다시 누적된다.
 *  4) 한 세션 안에서도 prefix 가 겹치는 final 결과는 가장 긴 것만 남긴다.
 *  5) 최종 텍스트에 연속 반복 축약을 한 번 더 적용한다 (마지막 안전망).
 *
 * 침묵으로 인식이 끊기면 자동 재시작하되, 확정 텍스트는 committedRef 에 누적해 보존한다.
 */
export function useSTT() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string>("");

  const recognitionRef = useRef<any>(null);
  const wantListeningRef = useRef(false); // 사용자가 켜둔 상태인지
  const committedRef = useRef(""); // 이전 세션까지 확정된 텍스트
  const sessionRef = useRef(""); // 현재 세션의 확정 텍스트
  const restartTimerRef = useRef<any>(null);
  const genRef = useRef(0); // 현재 유효한 세션 세대

  /** 현재 엔진을 확실히 종료 — 핸들러 제거 후 abort (지연 콜백까지 차단) */
  const killCurrent = () => {
    const prev = recognitionRef.current;
    recognitionRef.current = null;
    if (!prev) return;
    try {
      prev.onresult = null;
      prev.onerror = null;
      prev.onend = null;
      prev.onstart = null;
    } catch {}
    try {
      if (typeof prev.abort === "function") prev.abort();
      else prev.stop();
    } catch {}
  };

  const buildRecognition = (myGen: number): any => {
    if (typeof window === "undefined") return null;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;

    const r = new SR();
    r.lang = "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onresult = (e: any) => {
      if (myGen !== genRef.current) return; // 죽은 세션의 지연 콜백 무시
      // 한 세션 안의 결과를 prefix-aware 로 정리해 스냅샷 생성
      const finalParts: string[] = [];
      let interimText = "";
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) {
          const t = String(res[0].transcript).trim();
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
      sessionRef.current = finalParts.join(" ");
      setTranscript(collapseRepeats(joinText(committedRef.current, sessionRef.current)));
      setInterimTranscript(interimText);
    };

    r.onerror = (e: any) => {
      if (myGen !== genRef.current) return; // 죽은 세션의 지연 콜백 무시
      // no-speech / aborted 는 정상 흐름(침묵, 재시작)이라 무시
      if (e.error === "no-speech" || e.error === "aborted") return;

      const messages: Record<string, string> = {
        "not-allowed":
          "마이크 권한이 차단되었습니다. 주소창 자물쇠(🔒) → 마이크 → '허용' 으로 변경 후 새로고침해주세요.",
        "service-not-allowed":
          "브라우저가 음성 인식 서비스를 차단했습니다. 설정 → 사이트 설정 → 마이크 확인이 필요합니다.",
        network:
          "음성 인식 서버에 연결할 수 없습니다. 사내망 방화벽이 음성 서비스를 차단하고 있을 수 있어요. 답변은 아래 입력창에 직접 작성하셔도 채점됩니다.",
        "audio-capture":
          "마이크 장치를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.",
      };
      setError(
        messages[e.error] ||
          `음성 인식 오류(${e.error}) — 답변은 아래 입력창에 직접 작성하셔도 채점됩니다.`,
      );
      wantListeningRef.current = false;
      setListening(false);
    };

    r.onend = () => {
      if (myGen !== genRef.current) return; // 죽은 세션의 지연 콜백 무시

      // 이 세션에서 확정된 텍스트를 누적 버퍼로 옮김
      committedRef.current = joinText(committedRef.current, sessionRef.current);
      sessionRef.current = "";
      setInterimTranscript("");

      if (wantListeningRef.current) {
        // 새 인스턴스로 재시작 — 이전 e.results 잔존으로 인한 중복 누적 방지
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => startSession(), 250);
      } else {
        setListening(false);
      }
    };

    return r;
  };

  const startSession = () => {
    // 이전 엔진을 반드시 먼저 종료 — 동시에 두 엔진이 듣는 상황(=중복 인식) 원천 차단
    killCurrent();
    const myGen = ++genRef.current;

    const r = buildRecognition(myGen);
    if (!r) {
      setError("이 브라우저는 음성 인식을 지원하지 않습니다 (Android Chrome 권장)");
      wantListeningRef.current = false;
      setListening(false);
      return;
    }
    recognitionRef.current = r;
    try {
      r.start();
    } catch {
      /* 이미 시작된 경우 무시 */
    }
  };

  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      genRef.current++; // 남은 콜백 전부 무효화
      clearTimeout(restartTimerRef.current);
      killCurrent();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = () => {
    // 중복 시작 방지 — 이미 듣고 있으면 무시
    if (wantListeningRef.current) return;
    setError("");
    setTranscript("");
    setInterimTranscript("");
    committedRef.current = "";
    sessionRef.current = "";
    wantListeningRef.current = true;
    setListening(true);
    startSession();
  };

  const stop = () => {
    wantListeningRef.current = false;
    genRef.current++; // 남은 콜백 전부 무효화 (정지 후 뒤늦게 들어오는 결과 차단)
    clearTimeout(restartTimerRef.current);
    killCurrent();
    setListening(false);
  };

  const reset = () => {
    setTranscript("");
    setInterimTranscript("");
    committedRef.current = "";
    sessionRef.current = "";
  };

  return { listening, transcript, interimTranscript, error, start, stop, reset };
}
