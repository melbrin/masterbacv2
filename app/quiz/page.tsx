"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mode,
  MODE_CONFIG,
  DIFFICULTY_CONFIG,
  AnswerRecord,
  Chapter,
} from "@/lib/types";
import { selectQuestions, QuestionWithChapter } from "@/lib/questionSelector";
import { formatTime } from "@/lib/utils";
import QuestionEngine from "@/components/QuestionEngine";
import questionsDB from "@/data/questions-maths.json";

const db = questionsDB as {
  chapters: Record<string, Chapter>;
};

function QuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = (searchParams.get("mode") as Mode) || "diagnostic";
  const chapter = searchParams.get("chapter") || undefined;
  const modeConfig = MODE_CONFIG[mode];

  const [questions, setQuestions] = useState<QuestionWithChapter[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [answered, setAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [qTimer, setQTimer] = useState(0);
  const [globalTimer, setGlobalTimer] = useState(0);
  const [animating, setAnimating] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const qTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const globalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize questions
  useEffect(() => {
    const selected = selectQuestions(mode, db.chapters, chapter);
    setQuestions(selected);
  }, [mode, chapter]);

  // Question timer
  useEffect(() => {
    if (answered || questions.length === 0) {
      if (qTimerRef.current) clearInterval(qTimerRef.current);
      return;
    }
    qTimerRef.current = setInterval(() => setQTimer((t) => t + 1), 1000);
    return () => {
      if (qTimerRef.current) clearInterval(qTimerRef.current);
    };
  }, [answered, currentIndex, questions.length]);

  // Global timer
  useEffect(() => {
    if (questions.length === 0) return;
    globalTimerRef.current = setInterval(
      () => setGlobalTimer((t) => t + 1),
      1000
    );
    return () => {
      if (globalTimerRef.current) clearInterval(globalTimerRef.current);
    };
  }, [questions.length]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (globalTimer >= modeConfig.timeMinutes * 60 && !answered) {
      handleTimeUp();
    }
  }, [globalTimer, modeConfig.timeMinutes, answered]);

  const handleTimeUp = () => {
    // Store answers and go to results
    const resultsData = {
      answers,
      mode,
      chapter,
      globalTime: globalTimer,
    };
    sessionStorage.setItem("quizResults", JSON.stringify(resultsData));
    router.push("/results");
  };

  const handleAnswer = useCallback(
    (correct: boolean) => {
      if (answered) return;
      const q = questions[currentIndex];
      const diffConfig = DIFFICULTY_CONFIG[q.d];
      const bonusEarned = correct && qTimer <= diffConfig.timeBonusSec;
      const pointsEarned = correct
        ? diffConfig.points +
          (bonusEarned ? diffConfig.points * diffConfig.bonusMultiplier : 0)
        : 0;

      const record: AnswerRecord = {
        questionId: q.id,
        correct,
        time: qTimer,
        chapterId: q.chapterId,
        difficulty: q.d,
        skill: q.skill,
        bonusEarned,
        pointsEarned,
      };

      setAnswers((prev) => [...prev, record]);
      setAnswered(true);
      setLastCorrect(correct);

      // In BAC Blanc mode, auto-advance after a short delay
      if (modeConfig.noFeedback) {
        setTimeout(() => {
          goNext([...answers, record]);
        }, 400);
      }
    },
    [answered, currentIndex, questions, qTimer, answers, modeConfig.noFeedback]
  );

  const goNext = (currentAnswers?: AnswerRecord[]) => {
    const ans = currentAnswers || answers;
    if (currentIndex < questions.length - 1) {
      setAnimating(false);
      setTimeout(() => {
        setCurrentIndex((i) => i + 1);
        setAnswered(false);
        setLastCorrect(false);
        setQTimer(0);
        setSelectedIndex(null);
        setAnimating(true);
      }, 120);
    } else {
      // Quiz finished
      if (globalTimerRef.current) clearInterval(globalTimerRef.current);
      const resultsData = {
        answers: ans,
        mode,
        chapter,
        globalTime: globalTimer,
      };
      sessionStorage.setItem("quizResults", JSON.stringify(resultsData));
      router.push("/results");
    }
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-muted text-lg">Chargement...</div>
      </div>
    );
  }

  const q = questions[currentIndex];
  const diffConfig = DIFFICULTY_CONFIG[q.d];
  const timeLeft = modeConfig.timeMinutes * 60 - globalTimer;
  const isSpeedBonus = qTimer <= diffConfig.timeBonusSec;
  const timerColor =
    isSpeedBonus
      ? "text-mint"
      : qTimer <= diffConfig.timeBonusSec * 2
        ? "text-amber"
        : "text-coral";
  const dotColor =
    isSpeedBonus
      ? "bg-mint shadow-[0_0_8px_var(--color-mint)]"
      : qTimer <= diffConfig.timeBonusSec * 2
        ? "bg-amber shadow-[0_0_8px_var(--color-amber)]"
        : "bg-coral shadow-[0_0_8px_var(--color-coral)]";

  const chapterName =
    db.chapters[q.chapterId]?.name || q.chapterId;
  const chapterData = db.chapters[q.chapterId];

  return (
    <div className="min-h-screen bg-bg px-5 py-4 max-w-[640px] mx-auto">
      {/* Top bar */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-[13px] text-muted">
          📐 Maths · {currentIndex + 1}/{questions.length}
        </span>
        <span
          className={`text-[12px] font-mono font-semibold ${
            timeLeft < 300 ? "text-coral" : "text-muted"
          }`}
        >
          {timeLeft <= 0
            ? "⏰ Temps ecoule"
            : `${formatTime(timeLeft)} restantes`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex gap-[3px] mb-4">
        {Array.from({ length: questions.length }).map((_, i) => {
          let bg = "bg-dim/30";
          if (i < currentIndex) {
            bg = answers[i]?.correct ? "bg-mint" : "bg-coral";
          } else if (i === currentIndex) {
            bg = `bg-[${diffConfig.color}]`;
          }
          return (
            <div
              key={i}
              className={`flex-1 h-[5px] rounded-[3px] transition-all duration-300 ${bg}`}
              style={
                i === currentIndex
                  ? { background: diffConfig.color }
                  : undefined
              }
            />
          );
        })}
      </div>

      {/* Difficulty badge + timer */}
      <div className="flex items-center justify-between mb-5 p-3 bg-surface rounded-xl border border-border">
        <div className="flex items-center gap-2.5">
          <span
            className="text-[11px] font-extrabold px-3 py-1 rounded-lg uppercase tracking-wider"
            style={{
              color: diffConfig.color,
              background: diffConfig.color + "18",
            }}
          >
            {diffConfig.icon} {diffConfig.label} · {diffConfig.points}pt
            {diffConfig.points > 1 ? "s" : ""}
          </span>
          {!answered && isSpeedBonus && (
            <span className="text-[11px] font-bold text-mint">
              ⚡ Bonus vitesse actif
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-[9px] h-[9px] rounded-full ${dotColor} ${
              !answered && !isSpeedBonus && qTimer > diffConfig.timeBonusSec * 1.5
                ? "animate-pulse-dot"
                : ""
            }`}
          />
          <span className={`text-xl font-extrabold font-mono ${timerColor}`}>
            {qTimer}s
          </span>
        </div>
      </div>

      {/* Speed indicator bar */}
      {!answered && (
        <div className="mb-5">
          <div className="h-1 rounded-sm bg-border overflow-hidden">
            <div
              className="h-full rounded-sm transition-[width] duration-1000 linear"
              style={{
                background: isSpeedBonus
                  ? `linear-gradient(90deg, var(--color-mint), var(--color-mint)88)`
                  : "var(--color-amber)",
                width: `${Math.max(0, Math.min(100, (1 - qTimer / (diffConfig.timeBonusSec * 2)) * 100))}%`,
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-dim">
              ⚡ Bonus si &lt; {diffConfig.timeBonusSec}s
            </span>
            <span className="text-[10px] text-dim">
              {diffConfig.timeBonusSec * 2}s
            </span>
          </div>
        </div>
      )}

      {/* Speed result after answering */}
      {answered && !modeConfig.noFeedback && (
        <div
          className={`mb-4 px-3.5 py-2 rounded-xl flex items-center gap-2 ${
            lastCorrect && qTimer <= diffConfig.timeBonusSec
              ? "bg-mint-soft border border-mint/20"
              : "bg-transparent border border-transparent"
          }`}
        >
          {lastCorrect && qTimer <= diffConfig.timeBonusSec && (
            <span className="text-[12px] font-bold text-mint">
              ⚡ Bonus vitesse ! +
              {Math.round(diffConfig.points * diffConfig.bonusMultiplier * 10) /
                10}{" "}
              pt{diffConfig.points * diffConfig.bonusMultiplier >= 1 ? "s" : ""}
            </span>
          )}
          {lastCorrect && qTimer > diffConfig.timeBonusSec && (
            <span className="text-[12px] text-sub">
              ✓ Correct · {diffConfig.points} pt
              {diffConfig.points > 1 ? "s" : ""} · Reponds en moins de{" "}
              {diffConfig.timeBonusSec}s pour le bonus !
            </span>
          )}
          {!lastCorrect && (
            <span className="text-[12px] text-coral">
              ✗ Incorrect · 0 pt
            </span>
          )}
        </div>
      )}

      {/* Question */}
      <div className={animating ? "animate-slide-in" : "opacity-0"}>
        {/* Chapter label */}
        <div className="text-[11px] font-bold text-accent uppercase tracking-widest mb-1">
          {chapterName}
        </div>

        {/* Question text */}
        <div className="text-lg font-bold leading-relaxed mb-6 min-h-[54px] whitespace-pre-wrap">
          {q.q}
        </div>

        {/* Question component */}
        <QuestionEngine
          question={q}
          onAnswer={handleAnswer}
          answered={answered}
        />

        {/* Fiche suggestion (not in BAC Blanc mode) */}
        {answered && !modeConfig.noFeedback && chapterData && (
          <div
            className={`mt-4 p-3.5 rounded-xl border ${
              lastCorrect
                ? "bg-mint-soft border-mint/20"
                : "bg-accent-soft border-accent/20"
            }`}
          >
            <div className="flex gap-2.5 items-start">
              <span className="text-lg mt-0.5">
                {lastCorrect ? "🎯" : "📘"}
              </span>
              <div>
                <div
                  className={`text-[13px] font-bold mb-0.5 ${
                    lastCorrect ? "text-mint" : "text-text"
                  }`}
                >
                  {lastCorrect
                    ? "Bravo ! Envie d'aller plus loin sur ce chapitre ?"
                    : "Ce chapitre est a retravailler en priorite"}
                </div>
                <div className="text-[12px] text-sub leading-relaxed mb-1.5">
                  <strong className="text-text">{chapterData.fiche}</strong>{" "}
                  — {chapterData.detail}
                </div>
                <a
                  href={chapterData.ficheUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-[12px] font-bold no-underline border-b ${
                    lastCorrect
                      ? "text-mint border-mint/30"
                      : "text-accent border-accent/30"
                  }`}
                >
                  {lastCorrect
                    ? "Exercices avances →"
                    : "Voir les exercices corriges →"}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Next button */}
        {answered && !modeConfig.noFeedback && (
          <div className="mt-5">
            <button
              onClick={() => goNext()}
              className="w-full p-4 rounded-xl border-none font-bold text-[15px] transition-all duration-200 bg-gradient-to-br from-accent to-[#7c6cf0] text-white shadow-[0_4px_24px_var(--color-accent-glow)] hover:translate-y-[-2px] hover:brightness-110"
            >
              {currentIndex < questions.length - 1
                ? "Question suivante →"
                : "Voir mes resultats →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg flex items-center justify-center">
          <div className="text-muted text-lg">Chargement...</div>
        </div>
      }
    >
      <QuizContent />
    </Suspense>
  );
}
