"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  Mode,
  MODE_CONFIG,
  DIFFICULTY_CONFIG,
  AnswerRecord,
  Chapter,
} from "@/lib/types";
import {
  computeScore,
  getScoreByDifficulty,
  getScoreByChapter,
  getVerdict,
} from "@/lib/scoring";
import { formatTime } from "@/lib/utils";
import questionsDB from "@/data/questions-maths.json";

const db = questionsDB as {
  chapters: Record<string, Chapter>;
};

interface ResultsData {
  answers: AnswerRecord[];
  mode: Mode;
  chapter?: string;
  globalTime: number;
}

function ResultsContent() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<ResultsData | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("quizResults");
    if (stored) {
      setData(JSON.parse(stored));
    } else {
      router.push("/");
    }
  }, [router]);

  if (!data) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-muted text-lg">Chargement...</div>
      </div>
    );
  }

  const { answers, mode, chapter, globalTime } = data;
  const score = computeScore(answers);
  const diffScores = getScoreByDifficulty(answers);
  const chapterScores = getScoreByChapter(
    answers,
    Object.fromEntries(
      Object.entries(db.chapters).map(([id, ch]) => [
        id,
        { name: ch.name, fiche: ch.fiche, detail: ch.detail },
      ])
    )
  );
  const verdict = getVerdict(score.grade);
  const avgTime =
    answers.length > 0
      ? Math.round(answers.reduce((s, a) => s + a.time, 0) / answers.length)
      : 0;

  const shareResult = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const w = 600;
    const h = 820;
    cv.width = w;
    cv.height = h;

    // Background gradient
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#0a0a18");
    g.addColorStop(1, "#12122a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = "bold 26px system-ui";
    ctx.fillText("Mon niveau BAC 2026", w / 2, 55);

    // Subject
    ctx.fillStyle = "#6b6b88";
    ctx.font = "15px system-ui";
    ctx.fillText("Mathematiques", w / 2, 85);

    // Grade
    ctx.fillStyle = verdict.color;
    ctx.font = "bold 88px system-ui";
    ctx.fillText(`${score.grade}/20`, w / 2, 220);

    // Verdict title
    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px system-ui";
    ctx.fillText(verdict.title, w / 2, 270);

    // Stats line
    ctx.fillStyle = "#a0a0bc";
    ctx.font = "14px system-ui";
    ctx.fillText(
      `${score.correct}/${score.total} bonnes reponses · ${formatTime(globalTime)} · ${score.bonusCount} bonus`,
      w / 2,
      310
    );

    // Chapter bars
    let y = 370;
    for (const [id, ch] of Object.entries(chapterScores)) {
      if (ch.total === 0) continue;
      const pct = ch.percent;
      const col = pct >= 75 ? "#34d399" : pct >= 50 ? "#fbbf24" : "#f87171";

      ctx.textAlign = "left";
      ctx.fillStyle = "#ccc";
      ctx.font = "14px system-ui";
      ctx.fillText(ch.name, 50, y);

      ctx.textAlign = "right";
      ctx.fillStyle = col;
      ctx.font = "bold 14px system-ui";
      ctx.fillText(`${pct}%`, w - 50, y);

      // Bar background
      ctx.fillStyle = "#1e1e35";
      ctx.fillRect(50, y + 10, w - 100, 6);
      // Bar fill
      ctx.fillStyle = col;
      const barWidth = ((w - 100) * pct) / 100;
      ctx.beginPath();
      ctx.roundRect(50, y + 10, barWidth, 6, 3);
      ctx.fill();

      y += 52;
    }

    // Bottom branding
    ctx.textAlign = "center";
    ctx.fillStyle = "#635bff";
    ctx.font = "bold 18px system-ui";
    ctx.fillText("masterbac.com", w / 2, h - 50);

    ctx.fillStyle = "#6b6b88";
    ctx.font = "13px system-ui";
    ctx.fillText("Teste ton niveau → lien en bio", w / 2, h - 25);

    // Download PNG
    cv.toBlob((blob) => {
      if (!blob) return;
      // Try native share first
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], "mon-niveau-bac.png", {
          type: "image/png",
        });
        if (navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file] }).catch(() => {
            downloadBlob(blob);
          });
          return;
        }
      }
      downloadBlob(blob);
    }, "image/png");
  };

  const downloadBlob = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mon-niveau-bac.png";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-bg to-[#0a0a18] px-5 py-8 pb-16 max-w-[640px] mx-auto">
      <canvas ref={canvasRef} className="hidden" />

      {/* Grade */}
      <div className="text-center mb-9">
        <div className="animate-scale-in text-[52px] mb-2">{verdict.emoji}</div>
        <div
          className="animate-scale-in text-[clamp(56px,14vw,80px)] font-black leading-none tracking-tight"
          style={{ color: verdict.color }}
        >
          {score.grade}/20
        </div>
        <div className="animate-fade-up-1 text-xl font-extrabold mt-3">
          {verdict.title}
        </div>
        <div className="animate-fade-up-2 text-sm text-sub leading-relaxed max-w-[400px] mx-auto mt-2">
          {verdict.sub}
        </div>
      </div>

      {/* Stats row */}
      <div className="animate-fade-up-3 flex gap-1.5 mb-7 flex-wrap">
        {[
          { v: `${score.correct}/${score.total}`, l: "Bonnes rep." },
          { v: formatTime(globalTime), l: "Temps total" },
          { v: `${avgTime}s`, l: "Moy/question" },
          { v: `${score.bonusCount}`, l: "Bonus vitesse" },
        ].map((s, i) => (
          <div
            key={i}
            className="flex-[1_1_22%] text-center py-3 px-1.5 bg-card rounded-xl border border-border"
          >
            <div className="text-[17px] font-extrabold">{s.v}</div>
            <div className="text-[10px] text-muted mt-0.5">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Score by difficulty */}
      <div className="animate-fade-up-3 flex gap-1.5 mb-7">
        {(
          Object.entries(DIFFICULTY_CONFIG) as [
            string,
            (typeof DIFFICULTY_CONFIG)["basique"],
          ][]
        ).map(([key, d]) => {
          const ds = diffScores[key as keyof typeof diffScores];
          return (
            <div
              key={key}
              className="flex-1 text-center py-3 px-2 bg-card rounded-xl"
              style={{ borderColor: d.color + "22", borderWidth: "1px" }}
            >
              <div
                className="text-[11px] font-bold mb-1"
                style={{ color: d.color }}
              >
                {d.icon} {d.label}
              </div>
              <div className="text-[17px] font-extrabold">
                {ds.correct}/{ds.total}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chapter diagnostic */}
      <div className="animate-fade-up-4">
        <div className="text-[11px] font-bold text-muted uppercase tracking-widest mb-3.5">
          Diagnostic par chapitre
        </div>
        <div className="flex flex-col gap-2.5 mb-7">
          {Object.entries(chapterScores).map(([id, ch]) => {
            if (ch.total === 0) return null;
            const col =
              ch.percent >= 75
                ? "#34d399"
                : ch.percent >= 50
                  ? "#fbbf24"
                  : "#f87171";
            const status =
              ch.percent >= 75
                ? "Maitrise ✓"
                : ch.percent >= 50
                  ? "A consolider"
                  : "A retravailler";

            return (
              <div
                key={id}
                className="bg-card rounded-xl p-4 border border-border"
              >
                <div className="flex justify-between items-center mb-2.5">
                  <span className="text-sm font-bold">{ch.name}</span>
                  <span
                    className="text-[11px] font-bold px-2.5 py-0.5 rounded-md"
                    style={{ color: col, background: col + "18" }}
                  >
                    {status}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="flex-1 h-1.5 rounded-sm bg-border overflow-hidden">
                    <div
                      className="h-full rounded-sm transition-[width] duration-1000 ease-out"
                      style={{
                        width: `${ch.percent}%`,
                        background: col,
                      }}
                    />
                  </div>
                  <span
                    className="text-[13px] font-bold min-w-[36px] text-right"
                    style={{ color: col }}
                  >
                    {ch.percent}%
                  </span>
                </div>

                {/* Skill breakdown (for chapter mode) */}
                {mode === "chapitre" &&
                  Object.entries(ch.skills).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {Object.entries(ch.skills).map(([skill, s]) => {
                        const skillPct =
                          s.total > 0
                            ? Math.round((s.correct / s.total) * 100)
                            : 0;
                        const skillCol =
                          skillPct >= 75
                            ? "#34d399"
                            : skillPct >= 50
                              ? "#fbbf24"
                              : "#f87171";
                        return (
                          <span
                            key={skill}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                            style={{
                              color: skillCol,
                              background: skillCol + "15",
                            }}
                          >
                            {skill}: {s.correct}/{s.total}
                          </span>
                        );
                      })}
                    </div>
                  )}

                {/* Fiche suggestion */}
                <div className="flex items-start gap-2 text-[12px] text-sub leading-relaxed">
                  <span className="shrink-0 mt-0.5">
                    {ch.percent >= 75 ? "🎯" : "📘"}
                  </span>
                  <div>
                    <strong className="text-text">{ch.fiche}</strong> —{" "}
                    {ch.percent >= 75
                      ? "Blinde ce chapitre pour 0 impasse."
                      : ch.detail}
                    {ch.avgTime > 0 && (
                      <span className="text-muted"> · Moy : {ch.avgTime}s</span>
                    )}
                    <br />
                    <a
                      href="https://masterbac.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold no-underline"
                      style={{
                        color: ch.percent >= 75 ? "#34d399" : "#635bff",
                      }}
                    >
                      {ch.percent >= 75
                        ? "Passer au niveau superieur →"
                        : "Voir les exercices corriges →"}
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="animate-fade-up-5 flex flex-col gap-2.5 mb-4">
        <button
          onClick={shareResult}
          className="w-full p-4 rounded-xl border-none cursor-pointer text-[15px] font-bold bg-gradient-to-br from-[#1DA1F2] to-[#0d8bd9] text-white flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(29,161,242,.25)] transition-all duration-200 hover:translate-y-[-2px] hover:brightness-110"
        >
          📲 Partager mon resultat en story
        </button>

        <a
          href="https://masterbac.com"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full p-4 rounded-xl border-none cursor-pointer text-[15px] font-bold bg-gradient-to-br from-accent to-[#7c6cf0] text-white flex items-center justify-center gap-2 shadow-[0_4px_24px_var(--color-accent-glow)] transition-all duration-200 hover:translate-y-[-2px] hover:brightness-110 no-underline text-center"
        >
          {verdict.cta}
        </a>
      </div>

      {/* Retry */}
      <div className="animate-fade-up-5 text-center">
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 rounded-xl bg-transparent border border-border text-sub font-bold text-sm cursor-pointer transition-all hover:border-accent/40 hover:text-text"
        >
          ← Refaire le test
        </button>
      </div>

      {/* Footer */}
      <div className="text-center mt-7 text-[11px] text-dim">
        masterbac.com · Par un ingenieur du top 3
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg flex items-center justify-center">
          <div className="text-muted text-lg">Chargement...</div>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
