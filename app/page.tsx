"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mode, MODE_CONFIG, DIFFICULTY_CONFIG } from "@/lib/types";
import { getDaysUntilBAC } from "@/lib/utils";
import questionsDB from "@/data/questions-maths.json";

const chapters = (questionsDB as Record<string, unknown>).chapters as Record<
  string,
  { id: string; name: string }
>;

export default function Home() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string>("");
  const daysLeft = getDaysUntilBAC();

  const handleStart = () => {
    if (!selectedMode) return;
    if (selectedMode === "chapitre" && !selectedChapter) return;

    const params = new URLSearchParams({
      mode: selectedMode,
      subject: "maths",
    });
    if (selectedMode === "chapitre" && selectedChapter) {
      params.set("chapter", selectedChapter);
    }
    router.push(`/quiz?${params.toString()}`);
  };

  const modeIcons: Record<Mode, string> = {
    diagnostic: "🔬",
    chapitre: "📖",
    express: "⚡",
    bac_blanc: "🎓",
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_50%_0%,#16163a_0%,var(--color-bg)_65%)] flex flex-col items-center justify-center px-5 py-10 text-center">
      {/* BAC countdown badge */}
      <div className="animate-fade-up inline-flex items-center gap-2 bg-coral-soft border border-coral/20 rounded-full px-4 py-1.5 mb-8">
        <span>⏰</span>
        <span className="text-[13px] font-bold text-coral">
          J−{daysLeft} avant le BAC
        </span>
      </div>

      {/* Title */}
      <h1 className="animate-fade-up-1 text-[clamp(34px,9vw,56px)] font-black leading-[1.08] mb-4 tracking-tight">
        Quel est ton
        <br />
        <span className="gradient-text">niveau BAC ?</span>
      </h1>

      {/* Subtitle */}
      <p className="animate-fade-up-2 text-base text-sub max-w-[440px] leading-relaxed mb-2">
        155 questions calibrees par difficulte · Diagnostic par chapitre
        <br />
        Plus tu reponds vite aux questions difficiles, plus ton score monte
      </p>

      {/* Difficulty badges */}
      <div className="animate-fade-up-2 flex gap-2 justify-center mb-8 flex-wrap">
        {(Object.entries(DIFFICULTY_CONFIG) as [string, typeof DIFFICULTY_CONFIG.basique][]).map(
          ([key, d]) => (
            <span
              key={key}
              className="text-[11px] font-bold px-3 py-1 rounded-lg"
              style={{
                color: d.color,
                background: d.color + "18",
              }}
            >
              {d.icon} {d.label} = {d.points}pt{d.points > 1 ? "s" : ""}
            </span>
          )
        )}
      </div>

      {/* Mode selection */}
      <div className="animate-fade-up-3 w-full max-w-[400px] mb-4">
        <div className="text-xs font-bold text-muted uppercase tracking-widest mb-3">
          Choisis ton mode
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {(Object.entries(MODE_CONFIG) as [Mode, typeof MODE_CONFIG.diagnostic][]).map(
            ([key, config]) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedMode(key);
                  if (key !== "chapitre") setSelectedChapter("");
                }}
                className={`p-4 rounded-xl border-2 text-left transition-all hover-lift ${
                  selectedMode === key
                    ? "border-accent bg-accent-soft shadow-[0_0_20px_var(--color-accent-glow)]"
                    : "border-border bg-card hover:border-accent/40"
                }`}
              >
                <div className="text-xl mb-1">{modeIcons[key]}</div>
                <div className="text-sm font-bold text-text">
                  {config.label}
                </div>
                <div className="text-[11px] text-muted mt-1">
                  {config.questions}q · {config.timeMinutes}min
                </div>
              </button>
            )
          )}
        </div>
      </div>

      {/* Chapter selection (if mode = chapitre) */}
      {selectedMode === "chapitre" && (
        <div className="animate-slide-in w-full max-w-[400px] mb-4">
          <div className="text-xs font-bold text-muted uppercase tracking-widest mb-3">
            Choisis ton chapitre
          </div>
          <div className="flex flex-col gap-2">
            {Object.entries(chapters).map(([id, ch]) => (
              <button
                key={id}
                onClick={() => setSelectedChapter(id)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  selectedChapter === id
                    ? "border-accent bg-accent-soft"
                    : "border-border bg-card hover:border-accent/40"
                }`}
              >
                <span className="text-sm font-bold text-text">{ch.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Start button */}
      <div className="animate-fade-up-4 w-full max-w-[400px] mt-4">
        <button
          onClick={handleStart}
          disabled={
            !selectedMode ||
            (selectedMode === "chapitre" && !selectedChapter)
          }
          className="w-full p-4 rounded-xl border-none font-bold text-[16px] transition-all duration-200 bg-gradient-to-br from-accent to-[#7c6cf0] text-white shadow-[0_4px_24px_var(--color-accent-glow)] hover:translate-y-[-2px] hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          Commencer le test →
        </button>
      </div>

      {/* Stats */}
      <div className="animate-fade-up-5 mt-12 flex gap-9">
        {[
          { n: "2 000+", l: "eleves" },
          { n: "155", l: "questions" },
          { n: "Gratuit", l: "0 inscription" },
        ].map((s, i) => (
          <div key={i}>
            <div className="text-[17px] font-extrabold">{s.n}</div>
            <div className="text-[11px] text-dim mt-0.5">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="animate-fade-up-5 mt-7 text-[12px] text-dim">
        Concu par un ingenieur diplome du top 3 · 8 ans d&apos;experience
      </div>
    </div>
  );
}
