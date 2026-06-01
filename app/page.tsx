"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    const session = storage.getSession();
    if (!session) {
      router.replace("/landing");
      return;
    }
    if (session.isAdmin) {
      router.replace("/admin");
      return;
    }
    const s = storage.getSettings();
    if (!s.setupCompleted) {
      if (!s.onboardingSeen && !s.onboardingSkipForever) {
        router.replace("/onboarding");
      } else {
        router.replace("/setup");
      }
    } else if (!s.noticesAccepted) {
      router.replace("/notices");
    } else {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="font-brand text-4xl text-teczen-navy mb-2">SPEAKZEN</div>
        <div className="text-sm text-teczen-gray-500">by TECZEN</div>
      </div>
    </main>
  );
}
