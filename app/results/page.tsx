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
import { formatTime, getDaysUntilBAC } from "@/lib/utils";
import { encodeChallenge, generateSeed } from "@/lib/challenge";
import mathsDB from "@/data/questions-maths.json";
import physiqueDB from "@/data/questions-physique.json";

const databases: Record<string, { chapters: Record<string, Chapter> }> = {
  maths: mathsDB as { chapters: Record<string, Chapter> },
  physique: physiqueDB as { chapters: Record<string, Chapter> },
};

const subjectLabels: Record<string, string> = {
  maths: "Math\u00E9matiques",
  physique: "Physique-Chimie",
};

interface ChallengeResult {
  seed: number;
  challengerName: string;
  challengerScore: number;
  challengerGrade: number;
}

interface ResultsData {
  answers: AnswerRecord[];
  mode: Mode;
  chapter?: string;
  subject?: string;
  globalTime: number;
  challenge?: ChallengeResult;
}

function verdictColor(percent: number): string {
  if (percent >= 90) return "#fbbf24";
  if (percent >= 75) return "#34d399";
  if (percent >= 50) return "#635bff";
  return "#f87171";
}

function ResultsContent() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<ResultsData | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [userName, setUserName] = useState("");
  const [challengeLink, setChallengeLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

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
  const subject = data.subject || "maths";
  const db = databases[subject] || databases.maths;
  const subjectLabel = subjectLabels[subject] || "Math\u00E9matiques";

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
  const verdict = getVerdict(score.readinessPercent);
  const daysLeft = getDaysUntilBAC();
  const avgTime =
    answers.length > 0
      ? Math.round(answers.reduce((s, a) => s + a.time, 0) / answers.length)
      : 0;

  const handleGenerateChallenge = () => {
    if (!userName.trim()) return;
    const seed = data.challenge?.seed || generateSeed();
    const encoded = encodeChallenge({
      seed,
      name: userName.trim(),
      score: score.readinessPercent,
      grade: score.grade,
      mode: data.mode,
      subject,
      chapter: data.chapter,
    });
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    setChallengeLink(`${baseUrl}/quiz?challenge=${encoded}`);
    setShowNameModal(false);
  };

  const handleShareChallenge = () => {
    const text = `J\u2019ai eu ${score.readinessPercent}% au simulateur BAC ! Tu fais mieux ? `;
    if (navigator.share) {
      navigator.share({ text, url: challengeLink }).catch(() => {});
    } else {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(text + challengeLink)}`,
        "_blank"
      );
    }
  };

  const shareResult = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const scale = 3;
    const w = 600;
    const h = 820;
    cv.width = w * scale;
    cv.height = h * scale;
    cv.style.width = w + "px";
    cv.style.height = h + "px";
    ctx.scale(scale, scale);

    // Background gradient
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#0a0a18");
    g.addColorStop(1, "#12122a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px system-ui";
    ctx.fillText(`\u00C0 J-${daysLeft} du BAC 2026`, w / 2, 50);

    // Subject
    ctx.fillStyle = "#6b6b88";
    ctx.font = "15px system-ui";
    ctx.fillText(subjectLabel, w / 2, 80);

    // Readiness percent
    ctx.fillStyle = verdict.color;
    ctx.font = "bold 88px system-ui";
    ctx.fillText(`${score.readinessPercent}%`, w / 2, 210);

    // "Pr\u00EAt \u00E0" label
    ctx.fillStyle = "#a0a0bc";
    ctx.font = "16px system-ui";
    ctx.fillText("Pr\u00EAt \u00E0", w / 2, 130);

    // Verdict title
    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px system-ui";
    ctx.fillText(verdict.title, w / 2, 260);

    // Grade pill
    ctx.fillStyle = "#a0a0bc";
    ctx.font = "15px system-ui";
    ctx.fillText(`Estimation : ${score.grade}/20`, w / 2, 295);

    // Stats line
    ctx.fillStyle = "#a0a0bc";
    ctx.font = "14px system-ui";
    ctx.fillText(
      `${score.correct}/${score.total} bonnes r\u00E9ponses \u00B7 ${formatTime(globalTime)} \u00B7 ${score.bonusCount} bonus`,
      w / 2,
      335
    );

    // Chapter bars
    let y = 390;
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
    ctx.fillText("Teste ton niveau \u2192 lien en bio", w / 2, h - 25);

    // Download PNG
    cv.toBlob((blob) => {
      if (!blob) return;
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
    <div className="min-h-screen bg-gradient-to-b from-bg to-surface px-5 py-8 pb-16 max-w-[640px] mx-auto">
      <canvas ref={canvasRef} className="hidden" />

      {/* Subject badge */}
      <div className="text-center mb-2">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-accent bg-accent-soft px-3 py-1 rounded-full">
          {subject === "physique" ? "\u269B\uFE0F" : "\uD83D\uDCD0"} {subjectLabel}
        </span>
      </div>

      {/* Hero: Readiness percentage */}
      <div className="text-center mb-9">
        <div className="animate-scale-in text-[52px] mb-2">{verdict.emoji}</div>
        <div className="animate-fade-up-1 text-sm text-sub mb-1">
          {"\u00C0 J-"}{daysLeft}{" du BAC"}
        </div>
        <div className="animate-fade-up-1 text-[13px] text-muted mb-2">
          {"Tu es pr\u00EAt \u00E0"}
        </div>
        <div
          className="animate-scale-in text-[clamp(56px,14vw,80px)] font-black leading-none tracking-tight"
          style={{ color: verdict.color }}
        >
          {score.readinessPercent}%
        </div>
        <div className="animate-fade-up-1 text-xl font-extrabold mt-3">
          {verdict.title}
        </div>
        <div className="animate-fade-up-2 text-sm text-sub leading-relaxed max-w-[400px] mx-auto mt-2">
          {verdict.sub}
        </div>
        {/* Grade — prominent */}
        <div className="animate-fade-up-2 mt-4">
          <div className="text-[13px] text-sub mb-1">{"Estimation"}</div>
          <div className="text-[clamp(36px,9vw,48px)] font-black leading-none tracking-tight" style={{ color: verdict.color }}>
            {score.grade}<span className="text-[clamp(20px,5vw,28px)] text-sub font-bold">/20</span>
          </div>
        </div>
      </div>

      {/* Challenge comparison */}
      {data.challenge && (
        <div className="animate-fade-up-2 mb-7 p-4 bg-card rounded-xl border border-accent/20">
          <div className="text-[11px] font-bold text-accent uppercase tracking-widest mb-3 text-center">
            {"\u2694\uFE0F R\u00E9sultat du d\u00E9fi"}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-surface rounded-xl">
              <div className="text-[12px] text-muted mb-1">{data.challenge.challengerName}</div>
              <div
                className="text-2xl font-black"
                style={{ color: verdictColor(data.challenge.challengerScore) }}
              >
                {data.challenge.challengerScore}%
              </div>
              <div className="text-[11px] text-muted">{data.challenge.challengerGrade}/20</div>
            </div>
            <div className="text-center p-3 bg-surface rounded-xl border border-accent/30">
              <div className="text-[12px] text-accent mb-1 font-bold">Toi</div>
              <div
                className="text-2xl font-black"
                style={{ color: verdict.color }}
              >
                {score.readinessPercent}%
              </div>
              <div className="text-[11px] text-muted">{score.grade}/20</div>
            </div>
          </div>
          <div className="text-center mt-3 text-[13px] font-bold">
            {score.readinessPercent > data.challenge.challengerScore
              ? `Tu as battu ${data.challenge.challengerName} !`
              : score.readinessPercent === data.challenge.challengerScore
                ? "\u00C9galit\u00E9 parfaite !"
                : `${data.challenge.challengerName} te devance... pour l\u2019instant !`}
          </div>
        </div>
      )}

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
                ? "Ma\u00EEtris\u00E9 \u2713"
                : ch.percent >= 50
                  ? "\u00C0 consolider"
                  : "\u00C0 retravailler";

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

                {/* Wrong refs - exercises to review */}
                {ch.wrongRefs.length > 0 && (
                  <div className="mb-2 p-2.5 bg-coral/5 rounded-lg border border-coral/10">
                    <div className="text-[11px] font-bold text-coral mb-1.5">
                      {"\uD83D\uDCD6 Exercices \u00E0 retravailler :"}
                    </div>
                    <ul className="list-none m-0 p-0 flex flex-col gap-1">
                      {ch.wrongRefs.map((ref, i) => (
                        <li key={i} className="text-[11px] text-sub flex items-start gap-1.5">
                          <span className="text-coral mt-0.5 shrink-0">{"\u2022"}</span>
                          <span>{ref}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Fiche suggestion */}
                <div className="flex items-start gap-2 text-[12px] text-sub leading-relaxed">
                  <span className="shrink-0 mt-0.5">
                    {ch.percent >= 75 ? "\uD83C\uDFAF" : "\uD83D\uDCD8"}
                  </span>
                  <div>
                    <strong className="text-text">{ch.fiche}</strong> —{" "}
                    {ch.percent >= 75
                      ? "Blinde ce chapitre pour 0 impasse."
                      : ch.detail}
                    {ch.avgTime > 0 && (
                      <span className="text-muted">{" \u00B7 Moy : "}{ch.avgTime}s</span>
                    )}
                    <br />
                    <a
                      href="https://www.masterbac.com/products/les-masterfiches-exercices-de-lelite-2026-packs"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold no-underline"
                      style={{
                        color: ch.percent >= 75 ? "#34d399" : "#635bff",
                      }}
                    >
                      {ch.percent >= 75
                        ? "Passer au niveau sup\u00E9rieur \u2192"
                        : "Voir les exercices corrig\u00E9s \u2192"}
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Challenge link generated */}
      {challengeLink && (
        <div className="animate-slide-in mb-4 p-4 bg-card rounded-xl border border-accent/20">
          <div className="text-[13px] font-bold mb-2">{"\u2694\uFE0F Lien de d\u00E9fi pr\u00EAt !"}</div>
          <div className="p-3 bg-surface rounded-lg text-[11px] text-muted break-all mb-3 font-mono leading-relaxed">
            {challengeLink}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(challengeLink);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              }}
              className="flex-1 p-3 rounded-xl bg-accent text-white font-bold text-[13px] border-none cursor-pointer transition-all hover:brightness-110"
            >
              {linkCopied ? "\u2713 Copi\u00E9 !" : "Copier le lien"}
            </button>
            <button
              onClick={handleShareChallenge}
              className="flex-1 p-3 rounded-xl bg-[#25D366] text-white font-bold text-[13px] border-none cursor-pointer transition-all hover:brightness-110"
            >
              Partager
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="animate-fade-up-5 flex flex-col gap-2.5 mb-4">
        <button
          onClick={shareResult}
          className="w-full p-4 rounded-xl border-none cursor-pointer text-[15px] font-bold bg-gradient-to-br from-[#1DA1F2] to-[#0d8bd9] text-white flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(29,161,242,.25)] transition-all duration-200 hover:translate-y-[-2px] hover:brightness-110"
        >
          {"\uD83D\uDCF2 Partager mon r\u00E9sultat en story"}
        </button>

        {!challengeLink && (
          <button
            onClick={() => setShowNameModal(true)}
            className="w-full p-4 rounded-xl border-2 border-accent/30 cursor-pointer text-[15px] font-bold bg-accent-soft text-accent flex items-center justify-center gap-2 transition-all duration-200 hover:translate-y-[-2px] hover:border-accent/60"
          >
            {"\u2694\uFE0F D\u00E9fie un ami"}
          </button>
        )}

        <a
          href="https://www.masterbac.com/products/les-masterfiches-exercices-de-lelite-2026-packs"
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
          {"\u2190 Refaire le test"}
        </button>
      </div>

      {/* Footer */}
      <div className="text-center mt-7 text-[11px] text-dim">
        {"masterbac.com \u00B7 Par un ing\u00E9nieur du top 3"}
      </div>

      {/* Name modal for challenge */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-5">
          <div className="bg-card rounded-2xl p-6 w-full max-w-[360px] border border-border">
            <div className="text-lg font-bold mb-1">{"\u2694\uFE0F D\u00E9fie un ami"}</div>
            <div className="text-[13px] text-sub mb-4">
              {"Entre ton prénom pour générer un lien de défi"}
            </div>
            <input
              type="text"
              placeholder="Ton prénom"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && userName.trim()) handleGenerateChallenge();
              }}
              maxLength={20}
              className="w-full p-3 rounded-xl bg-surface border border-border text-text text-[15px] mb-3 outline-none focus:border-accent transition-colors"
              autoFocus
            />
            <button
              onClick={handleGenerateChallenge}
              disabled={!userName.trim()}
              className="w-full p-3.5 rounded-xl border-none font-bold text-[15px] bg-gradient-to-br from-accent to-[#7c6cf0] text-white cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {"G\u00E9n\u00E9rer le lien"}
            </button>
            <button
              onClick={() => setShowNameModal(false)}
              className="w-full p-2 mt-2 text-[13px] text-muted bg-transparent border-none cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
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
