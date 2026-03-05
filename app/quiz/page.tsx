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
import { decodeChallenge, ChallengeData } from "@/lib/challenge";
import QuestionEngine from "@/components/QuestionEngine";
import mathsDB from "@/data/questions-maths.json";
import physiqueDB from "@/data/questions-physique.json";

const databases: Record<string, { chapters: Record<string, Chapter> }> = {
  maths: mathsDB as { chapters: Record<string, Chapter> },
  physique: physiqueDB as { chapters: Record<string, Chapter> },
};

const subjectLabels: Record<string, { label: string; icon: string }> = {
  maths: { label: "Maths", icon: "\uD83D\uDCD0" },
  physique: { label: "Physique-Chimie", icon: "\u269B\uFE0F" },
};

const SESSION_KEY = "quizActiveSession";

function QuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const challengeParam = searchParams.get("challenge");
  const challengeData: ChallengeData | null = challengeParam
    ? decodeChallenge(challengeParam)
    : null;

  const mode = challengeData
    ? (challengeData.mode as Mode)
    : (searchParams.get("mode") as Mode) || "diagnostic";
  const chapter = challengeData?.chapter || searchParams.get("chapter") || undefined;
  const subject = challengeData?.subject || searchParams.get("subject") || "maths";
  const modeConfig = MODE_CONFIG[mode];
  const db = databases[subject] || databases.maths;
  const subjectInfo = subjectLabels[subject] || subjectLabels.maths;

  const [questions, setQuestions] = useState<QuestionWithChapter[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [answered, setAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [qTimer, setQTimer] = useState(0);
  const [globalTimer, setGlobalTimer] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [quizStarted, setQuizStarted] = useState(!challengeData);
  const [transitioning, setTransitioning] = useState(false);

  const qTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const globalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize questions (or restore session)
  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const session = JSON.parse(stored);
        if (session.mode === mode && session.subject === subject && session.chapter === (chapter || null)) {
          const selected = selectQuestions(mode, db.chapters, chapter, session.seed || challengeData?.seed);
          setQuestions(selected);
          setCurrentIndex(session.currentIndex || 0);
          setAnswers(session.answers || []);
          setGlobalTimer(session.globalTimer || 0);
          setQuizStarted(session.quizStarted ?? true);
          return;
        }
      } catch { /* ignore */ }
    }
    const selected = selectQuestions(mode, db.chapters, chapter, challengeData?.seed);
    setQuestions(selected);
  }, [mode, chapter, db.chapters, challengeData?.seed, subject]);

  // Save session on every state change
  useEffect(() => {
    if (questions.length === 0) return;
    const session = {
      mode, subject,
      chapter: chapter || null,
      seed: challengeData?.seed,
      currentIndex, answers, globalTimer, quizStarted,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }, [currentIndex, answers, globalTimer, quizStarted, questions.length, mode, subject, chapter, challengeData?.seed]);

  // Question timer
  useEffect(() => {
    if (!quizStarted || answered || questions.length === 0) {
      if (qTimerRef.current) clearInterval(qTimerRef.current);
      return;
    }
    qTimerRef.current = setInterval(() => setQTimer((t) => t + 1), 1000);
    return () => { if (qTimerRef.current) clearInterval(qTimerRef.current); };
  }, [quizStarted, answered, currentIndex, questions.length]);

  // Global timer
  useEffect(() => {
    if (!quizStarted || questions.length === 0) return;
    globalTimerRef.current = setInterval(() => setGlobalTimer((t) => t + 1), 1000);
    return () => { if (globalTimerRef.current) clearInterval(globalTimerRef.current); };
  }, [quizStarted, questions.length]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (globalTimer >= modeConfig.timeMinutes * 60 && !answered) handleTimeUp();
  }, [globalTimer, modeConfig.timeMinutes, answered]);

  const finishQuiz = (ans: AnswerRecord[]) => {
    if (globalTimerRef.current) clearInterval(globalTimerRef.current);
    sessionStorage.removeItem(SESSION_KEY);
    const resultsData = {
      answers: ans, mode, chapter, subject, globalTime: globalTimer,
      ...(challengeData ? {
        challenge: {
          seed: challengeData.seed,
          challengerName: challengeData.name,
          challengerScore: challengeData.score,
          challengerGrade: challengeData.grade,
        },
      } : {}),
    };
    sessionStorage.setItem("quizResults", JSON.stringify(resultsData));
    router.push("/results");
  };

  const handleTimeUp = () => finishQuiz(answers);

  const handleAnswer = useCallback(
    (correct: boolean) => {
      if (answered) return;
      const q = questions[currentIndex];
      const diffConfig = DIFFICULTY_CONFIG[q.d];
      const bonusEarned = correct && qTimer <= diffConfig.timeBonusSec;
      const pointsEarned = correct
        ? diffConfig.points + (bonusEarned ? diffConfig.points * diffConfig.bonusMultiplier : 0)
        : 0;

      const record: AnswerRecord = {
        questionId: q.id, correct, time: qTimer, chapterId: q.chapterId,
        difficulty: q.d, skill: q.skill, bonusEarned, pointsEarned, ref: q.ref,
      };

      setAnswers((prev) => [...prev, record]);
      setAnswered(true);
      setLastCorrect(correct);

      if (modeConfig.noFeedback) {
        setTimeout(() => goNext([...answers, record]), 400);
      }
    },
    [answered, currentIndex, questions, qTimer, answers, modeConfig.noFeedback]
  );

  const goNext = (currentAnswers?: AnswerRecord[]) => {
    const ans = currentAnswers || answers;
    if (currentIndex < questions.length - 1) {
      setTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((i) => i + 1);
        setAnswered(false);
        setLastCorrect(false);
        setQTimer(0);
        setSelectedIndex(null);
        setTransitioning(false);
      }, 150);
    } else {
      finishQuiz(ans);
    }
  };

  // Challenge interstitial
  if (!quizStarted && challengeData) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_50%_0%,var(--color-hero-gradient)_0%,var(--color-bg)_65%)] flex flex-col items-center justify-center px-5 py-10 text-center">
        <div className="animate-scale-in text-[52px] mb-4">{"\u2694\uFE0F"}</div>
        <div className="animate-fade-up-1 text-sm text-sub mb-2">{"Défi"}</div>
        <h1 className="animate-fade-up-1 text-[clamp(28px,7vw,42px)] font-black leading-tight mb-3">
          {challengeData.name}{" te d\u00E9fie !"}
        </h1>
        <div className="animate-fade-up-2 text-lg mb-1">
          <span className="font-extrabold" style={{
            color: challengeData.score >= 90 ? "#fbbf24"
              : challengeData.score >= 75 ? "#34d399"
              : challengeData.score >= 50 ? "#635bff"
              : "#f87171"
          }}>
            {challengeData.score}%
          </span>
          <span className="text-sub">{" de pr\u00E9paration"}</span>
        </div>
        <div className="animate-fade-up-2 text-[13px] text-muted mb-2">
          {"Estimation : "}{challengeData.grade}/20
        </div>
        <div className="animate-fade-up-2 text-[12px] text-dim mb-8">
          {modeConfig.label}{" \u00B7 "}{modeConfig.questions}{" questions \u00B7 "}{modeConfig.timeMinutes}{" min"}
        </div>
        <button
          onClick={() => setQuizStarted(true)}
          className="animate-fade-up-3 px-8 py-4 rounded-xl border-none font-bold text-[16px] bg-gradient-to-br from-accent to-[#7c6cf0] text-white shadow-[0_4px_24px_var(--color-accent-glow)] hover:translate-y-[-2px] hover:brightness-110 transition-all cursor-pointer"
        >
          {"Relever le d\u00E9fi \u2192"}
        </button>
      </div>
    );
  }

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
  const timerColor = isSpeedBonus ? "text-mint" : qTimer <= diffConfig.timeBonusSec * 2 ? "text-amber" : "text-coral";
  const dotColor = isSpeedBonus
    ? "bg-mint shadow-[0_0_8px_var(--color-mint)]"
    : qTimer <= diffConfig.timeBonusSec * 2
      ? "bg-amber shadow-[0_0_8px_var(--color-amber)]"
      : "bg-coral shadow-[0_0_8px_var(--color-coral)]";

  const chapterName = db.chapters[q.chapterId]?.name || q.chapterId;
  const chapterData = db.chapters[q.chapterId];
  const timerBarPct = Math.max(0, Math.min(100, (1 - qTimer / (diffConfig.timeBonusSec * 2)) * 100));

  return (
    <div className="min-h-screen bg-bg px-5 py-4 max-w-[640px] mx-auto">
      {/* Top bar */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-[13px] text-muted">
          {subjectInfo.icon} {subjectInfo.label} · {currentIndex + 1}/{questions.length}
        </span>
        <span className={`text-[12px] font-mono font-semibold ${timeLeft < 300 ? "text-coral" : "text-muted"}`}>
          {timeLeft <= 0 ? "\u23F0 Temps \u00E9coul\u00E9" : `${formatTime(timeLeft)} restantes`}
        </span>
      </div>

      {/* Challenge banner */}
      {challengeData && (
        <div className="mb-3 p-2.5 rounded-xl bg-accent-soft border border-accent/20 text-center">
          <div className="text-[12px] font-bold text-accent">
            {"\u2694\uFE0F D\u00E9fi de "}{challengeData.name}{" \u00B7 "}{challengeData.score}%
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="flex gap-[3px] mb-4">
        {Array.from({ length: questions.length }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-[5px] rounded-[3px] transition-all duration-300 ${
              i < currentIndex
                ? answers[i]?.correct ? "bg-mint" : "bg-coral"
                : i === currentIndex ? "" : "bg-dim/30"
            }`}
            style={i === currentIndex ? { background: diffConfig.color } : undefined}
          />
        ))}
      </div>

      {/* Difficulty badge + timer */}
      <div className="flex items-center justify-between mb-5 p-3 bg-surface rounded-xl border border-border">
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-extrabold px-3 py-1 rounded-lg uppercase tracking-wider"
            style={{ color: diffConfig.color, background: diffConfig.color + "18" }}>
            {diffConfig.icon} {diffConfig.label} · {diffConfig.points}pt{diffConfig.points > 1 ? "s" : ""}
          </span>
          {!answered && isSpeedBonus && (
            <span className="text-[11px] font-bold text-mint">{"\u26A1 Bonus vitesse actif"}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-[9px] h-[9px] rounded-full ${dotColor} ${
            !answered && !isSpeedBonus && qTimer > diffConfig.timeBonusSec * 1.5 ? "animate-pulse-dot" : ""
          }`} />
          <span className={`text-xl font-extrabold font-mono ${timerColor}`}>{qTimer}s</span>
        </div>
      </div>

      {/* Speed indicator bar */}
      {!answered && (
        <div className="mb-5">
          <div className="h-1 rounded-sm bg-border overflow-hidden">
            <div
              className="h-full rounded-sm"
              style={{
                background: isSpeedBonus ? "var(--color-mint)" : "var(--color-amber)",
                width: `${timerBarPct}%`,
                transition: "width 1s linear",
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-dim">{"\u26A1 Bonus si < "}{diffConfig.timeBonusSec}s</span>
            <span className="text-[10px] text-dim">{diffConfig.timeBonusSec * 2}s</span>
          </div>
        </div>
      )}

      {/* Speed result after answering */}
      {answered && !modeConfig.noFeedback && (
        <div className={`mb-4 px-3.5 py-2 rounded-xl flex items-center gap-2 ${
          lastCorrect && qTimer <= diffConfig.timeBonusSec
            ? "bg-mint-soft border border-mint/20"
            : "bg-transparent border border-transparent"
        }`}>
          {lastCorrect && qTimer <= diffConfig.timeBonusSec && (
            <span className="text-[12px] font-bold text-mint">
              {"\u26A1 Bonus vitesse ! +"}{Math.round(diffConfig.points * diffConfig.bonusMultiplier * 10) / 10}{" "}
              pt{diffConfig.points * diffConfig.bonusMultiplier >= 1 ? "s" : ""}
            </span>
          )}
          {lastCorrect && qTimer > diffConfig.timeBonusSec && (
            <span className="text-[12px] text-sub">
              {"\u2713 Correct \u00B7 "}{diffConfig.points} pt{diffConfig.points > 1 ? "s" : ""}{" · R\u00E9ponds en moins de "}{diffConfig.timeBonusSec}{"s pour le bonus !"}
            </span>
          )}
          {!lastCorrect && (
            <span className="text-[12px] text-coral">{"\u2717 Incorrect \u00B7 0 pt"}</span>
          )}
        </div>
      )}

      {/* Question - smooth transition, no zoom */}
      <div style={{
        opacity: transitioning ? 0 : 1,
        transform: transitioning ? "translateX(16px)" : "translateX(0)",
        transition: "opacity 0.15s ease, transform 0.15s ease",
      }}>
        <div className="text-[11px] font-bold text-accent uppercase tracking-widest mb-1">{chapterName}</div>
        <div className="text-lg font-bold leading-relaxed mb-6 whitespace-pre-wrap">{q.q}</div>

        <QuestionEngine question={q} onAnswer={handleAnswer} answered={answered} />

        {answered && !modeConfig.noFeedback && chapterData && (
          <div className={`mt-4 p-3.5 rounded-xl border ${
            lastCorrect ? "bg-mint-soft border-mint/20" : "bg-accent-soft border-accent/20"
          }`}>
            <div className="flex gap-2.5 items-start">
              <span className="text-lg mt-0.5">{lastCorrect ? "\uD83C\uDFAF" : "\uD83D\uDCD8"}</span>
              <div>
                <div className={`text-[13px] font-bold mb-0.5 ${lastCorrect ? "text-mint" : "text-text"}`}>
                  {lastCorrect ? "Bravo ! Envie d'aller plus loin sur ce chapitre ?" : "Ce chapitre est \u00E0 retravailler en priorit\u00E9"}
                </div>
                {q.ref && (
                  <div className="text-[11px] text-sub mb-1.5 flex items-center gap-1">
                    <span>{"\uD83D\uDCD6"}</span>
                    <span>{"Retrouve cet exercice : "}<strong className="text-text">{q.ref}</strong></span>
                  </div>
                )}
                <div className="text-[12px] text-sub leading-relaxed mb-1.5">
                  <strong className="text-text">{chapterData.fiche}</strong> — {chapterData.detail}
                </div>
                <a href={chapterData.ficheUrl} target="_blank" rel="noopener noreferrer"
                  className={`text-[12px] font-bold no-underline border-b ${lastCorrect ? "text-mint border-mint/30" : "text-accent border-accent/30"}`}>
                  {lastCorrect ? "Exercices avanc\u00E9s \u2192" : "Voir les exercices corrig\u00E9s \u2192"}
                </a>
              </div>
            </div>
          </div>
        )}

        {answered && !modeConfig.noFeedback && (
          <div className="mt-5">
            <button onClick={() => goNext()}
              className="w-full p-4 rounded-xl border-none font-bold text-[15px] transition-all duration-200 bg-gradient-to-br from-accent to-[#7c6cf0] text-white shadow-[0_4px_24px_var(--color-accent-glow)] hover:translate-y-[-2px] hover:brightness-110">
              {currentIndex < questions.length - 1 ? "Question suivante \u2192" : "Voir mes r\u00E9sultats \u2192"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-muted text-lg">Chargement...</div>
      </div>
    }>
      <QuizContent />
    </Suspense>
  );
}
