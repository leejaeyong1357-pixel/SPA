"use client";

/** 비밀번호 해시 (SHA-256 hex). 평문은 어디에도 저장 안 함. */
export async function hashPassword(plain: string): Promise<string> {
  const enc = new TextEncoder().encode(plain);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function pwKey(employeeId: string): string {
  return `spa.pw.${employeeId}`;
}

export function getStoredPwHash(employeeId: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(pwKey(employeeId));
}

export function setStoredPwHash(employeeId: string, hash: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(pwKey(employeeId), hash);
}
