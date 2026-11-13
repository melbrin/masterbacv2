"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mode, MODE_CONFIG, DIFFICULTY_CONFIG } from "@/lib/types";
import { getDaysUntilBAC } from "@/lib/utils";
import mathsDB from "@/data/questions-maths.json";
import physiqueDB from "@/data/questions-physique.json";

type Subject = "maths" | "physique";

const SUBJECT_CONFIG: Record<
  Subject,
  { label: string; icon: string; db: Record<string, unknown> }
> = {
  maths: {
    label: "Mathématiques",
    icon: "\uD83D\uDCD0",
    db: mathsDB as Record<string, unknown>,
  },
  physique: {
    label: "Physique-Chimie",
    icon: "\u269B\uFE0F",
    db: physiqueDB as Record<string, unknown>,
  },
};

function getChapters(subject: Subject) {
  const db = SUBJECT_CONFIG[subject].db;
  return (db as { chapters: Record<string, { id: string; name: string }> })
    .chapters;
}

function getTotalQuestions(subject: Subject) {
  const db = SUBJECT_CONFIG[subject].db;
  return (db as { meta: { totalQuestions: number } }).meta.totalQuestions;
}

export default function Home() {
  const router = useRouter();
  const [selectedSubject, setSelectedSubject] = useState<Subject>("maths");
  const [selectedMode, setSelectedMode] = useState<Mode | null>("express");
  const [selectedChapter, setSelectedChapter] = useState<string>("");
  const daysLeft = getDaysUntilBAC();

  const chapters = getChapters(selectedSubject);
  const totalQ = getTotalQuestions(selectedSubject);

  const handleStart = () => {
    if (!selectedMode) return;
    if (selectedMode === "chapitre" && !selectedChapter) return;

    const params = new URLSearchParams({
      mode: selectedMode,
      subject: selectedSubject,
    });
    if (selectedMode === "chapitre" && selectedChapter) {
      params.set("chapter", selectedChapter);
    }
    router.push(`/quiz?${params.toString()}`);
  };

  const modeIcons: Record<Mode, string> = {
    diagnostic: "\uD83D\uDD2C",
    chapitre: "\uD83D\uDCD6",
    express: "\u26A1",
    bac_blanc: "\uD83C\uDF93",
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_50%_0%,var(--color-hero-gradient)_0%,var(--color-bg)_65%)] flex flex-col items-center px-5 py-10 text-center">
      {/* ─── HERO: Hook + CTA above the fold ─── */}

      {/* BAC countdown badge */}
      <div className="animate-fade-up inline-flex items-center gap-2 bg-coral-soft border border-coral/20 rounded-full px-4 py-1.5 mb-6 mt-8">
        <span>{"⏰"}</span>
        <span className="text-[13px] font-bold text-coral">
          {"J\u2212"}{daysLeft} {"avant le BAC"}
        </span>
      </div>

      {/* Provocative title */}
      <h1 className="animate-fade-up-1 text-[clamp(32px,8.5vw,52px)] font-black leading-[1.08] mb-3 tracking-tight">
        {"Tu aurais combien"}
        <br />
        <span className="gradient-text">{"au BAC ?"}</span>
      </h1>

      {/* Punchy subtitle */}
      <p className="animate-fade-up-1 text-[15px] text-muted max-w-[340px] mb-8 leading-snug">
        {"Fais le test en "}
        <span className="text-text font-bold">{"5 min"}</span>
        {" · Questions au format du BAC · Note "}
        <span className="text-text font-bold">{"/20"}</span>
        {" instantanée"}
      </p>

      {/* ─── ACTION AREA ─── */}

      {/* Subject toggle (compact pill) */}
      <div className="animate-fade-up-2 w-full max-w-[400px] mb-4">
        <div className="flex bg-card rounded-xl border border-border p-1 gap-1">
          {(Object.entries(SUBJECT_CONFIG) as [Subject, (typeof SUBJECT_CONFIG)["maths"]][]).map(
            ([key, config]) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedSubject(key);
                  setSelectedChapter("");
                }}
                className={`flex-1 py-2.5 px-3 rounded-lg text-[13px] font-bold transition-all ${
                  selectedSubject === key
                    ? "bg-accent text-white shadow-[0_2px_12px_var(--color-accent-glow)]"
                    : "text-muted hover:text-text"
                }`}
              >
                {config.icon} {config.label}
              </button>
            )
          )}
        </div>
      </div>

      {/* Mode selection (compact) */}
      <div className="animate-fade-up-3 w-full max-w-[400px] mb-3">
        <div className="grid grid-cols-2 gap-2">
          {(
            Object.entries(MODE_CONFIG) as [
              Mode,
              (typeof MODE_CONFIG)["diagnostic"],
            ][]
          ).map(([key, config]) => (
            <button
              key={key}
              onClick={() => {
                setSelectedMode(key);
                if (key !== "chapitre") setSelectedChapter("");
              }}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                selectedMode === key
                  ? "border-accent bg-accent-soft shadow-[0_0_16px_var(--color-accent-glow)]"
                  : "border-border bg-card hover:border-accent/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{modeIcons[key]}</span>
                <div>
                  <div className="text-[13px] font-bold text-text">{config.label}</div>
                  <div className="text-[10px] text-muted">
                    {config.questions}{"q · "}{config.timeMinutes}{"min"}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chapter selection (if mode = chapitre) */}
      {selectedMode === "chapitre" && (
        <div className="animate-slide-in w-full max-w-[400px] mb-3">
          <div className="flex flex-col gap-1.5">
            {Object.entries(chapters).map(([id, ch]) => (
              <button
                key={id}
                onClick={() => setSelectedChapter(id)}
                className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                  selectedChapter === id
                    ? "border-accent bg-accent-soft"
                    : "border-border bg-card hover:border-accent/40"
                }`}
              >
                <span className="text-[13px] font-bold text-text">{ch.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Big CTA */}
      <div className="animate-fade-up-3 w-full max-w-[400px] mt-2 mb-2">
        <button
          onClick={handleStart}
          disabled={
            !selectedMode ||
            (selectedMode === "chapitre" && !selectedChapter)
          }
          className="w-full p-4 rounded-xl border-none font-bold text-[16px] transition-all duration-200 bg-gradient-to-br from-accent to-[#7c6cf0] text-white shadow-[0_4px_24px_var(--color-accent-glow)] hover:translate-y-[-2px] hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {"Voir ma note →"}
        </button>
      </div>

      {/* Reassurance line */}
      <div className="animate-fade-up-3 text-[11px] text-dim mb-12">
        {"Gratuit · Sans inscription · Sans pub"}
      </div>

      {/* ─── BELOW THE FOLD: Explanations for skeptics ─── */}

      {/* Separator */}
      <div className="w-12 h-[2px] bg-border rounded-full mb-10" />

      {/* How it works */}
      <div className="w-full max-w-[400px] mb-10">
        <div className="text-[11px] font-bold text-muted uppercase tracking-widest mb-5">
          {"Comment ça marche"}
        </div>
        <div className="flex gap-3">
          {[
            { n: "1", title: "Choisis", sub: "ta matière et ton mode" },
            { n: "2", title: "Réponds", sub: "aux questions, chapitre par chapitre" },
            { n: "3", title: "Lis", sub: "ta note /20 et tes points faibles" },
          ].map((step, i) => (
            <div key={i} className="flex-1 text-center">
              <div className="w-8 h-8 rounded-full bg-accent-soft text-accent text-[13px] font-extrabold flex items-center justify-center mx-auto mb-2">
                {step.n}
              </div>
              <div className="text-[12px] font-bold text-text">{step.title}</div>
              <div className="text-[10px] text-muted leading-snug">{step.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Value propositions (compact inline) */}
      <div className="w-full max-w-[400px] mb-10">
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: "\uD83D\uDCDD", text: "Questions au format des épreuves du BAC" },
            { icon: "\uD83C\uDFAF", text: "Note calibrée sur 3 niveaux de difficulté" },
            { icon: "\uD83D\uDCCA", text: "Diagnostic précis chapitre par chapitre" },
            { icon: "\u2728", text: "Défie tes amis avec un lien de défi" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-card border border-border text-left">
              <span className="text-sm shrink-0">{item.icon}</span>
              <span className="text-[11px] text-muted leading-snug">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Difficulty system (compact) */}
      <div className="flex gap-2 justify-center mb-10 flex-wrap">
        {(
          Object.entries(DIFFICULTY_CONFIG) as [
            string,
            (typeof DIFFICULTY_CONFIG)["basique"],
          ][]
        ).map(([key, d]) => (
          <span
            key={key}
            className="text-[11px] font-bold px-3 py-1 rounded-lg"
            style={{
              color: d.color,
              background: d.color + "18",
            }}
          >
            {d.icon} {d.label} = {d.points}{"pt"}{d.points > 1 ? "s" : ""}
          </span>
        ))}
      </div>

      {/* Accès à l'application */}
      <a href="/compte/connexion" className="text-[13px] font-bold text-accent underline mb-6">
        {"Me connecter à l\u2019application MasterBac"}
      </a>

      {/* Footer */}
      <div className="text-[11px] text-dim">
        {"Conçu par un professeur de maths et de physique-chimie"}
      </div>
    </div>
  );
}
