import { AnswerRecord, Difficulty, DIFFICULTY_CONFIG } from "./types";

// Grade weights per difficulty tier (out of 20):
//   Basiques  → up to 8/20   (foundation)
//   Classiques → +7 (8→15)   (core BAC level)
//   Experts   → +4 (15→19)   (excellence)
//   Bonus vitesse → up to +1  (19→20, réservé à l'excellence totale)
//   Max sans bonus = 19/20 (95%), max avec tous bonus = 20/20 (100%)
const GRADE_WEIGHTS = { basique: 8, classique: 7, expert: 4 };
const BONUS_MAX_BOOST = 1; // +1 point max si tous les bonus vitesse obtenus

export function computeScore(answers: AnswerRecord[]) {
  let bonusCount = 0;
  let totalBonusPoints = 0;

  const diffStats: Record<Difficulty, { correct: number; total: number }> = {
    basique: { correct: 0, total: 0 },
    classique: { correct: 0, total: 0 },
    expert: { correct: 0, total: 0 },
  };

  for (const answer of answers) {
    const config = DIFFICULTY_CONFIG[answer.difficulty];
    diffStats[answer.difficulty].total++;

    if (answer.correct) {
      diffStats[answer.difficulty].correct++;
      if (answer.bonusEarned) {
        totalBonusPoints += config.points * config.bonusMultiplier;
        bonusCount++;
      }
    }
  }

  // Compute grade using tier weights (max 19 from tiers alone)
  let tierGrade = 0;
  for (const diff of ["basique", "classique", "expert"] as Difficulty[]) {
    const { correct, total } = diffStats[diff];
    if (total > 0) {
      tierGrade += (correct / total) * GRADE_WEIGHTS[diff];
    }
  }

  // Bonus vitesse boost: up to +1 point (proportional to % of questions answered fast)
  const totalQ = answers.length;
  const bonusBoost = totalQ > 0 ? (bonusCount / totalQ) * BONUS_MAX_BOOST : 0;
  const rawGrade = tierGrade + bonusBoost;

  const grade = Math.min(20, Math.max(0, Math.round(rawGrade)));
  const readinessPercent = Math.min(100, Math.max(0, Math.round((rawGrade / 20) * 100)));

  return {
    readinessPercent,
    grade,
    bonusCount,
    totalBonusPoints: Math.round(totalBonusPoints * 10) / 10,
    correct: answers.filter((a) => a.correct).length,
    total: answers.length,
  };
}

export function getScoreByDifficulty(answers: AnswerRecord[]) {
  const result: Record<Difficulty, { correct: number; total: number }> = {
    basique: { correct: 0, total: 0 },
    classique: { correct: 0, total: 0 },
    expert: { correct: 0, total: 0 },
  };

  for (const answer of answers) {
    result[answer.difficulty].total++;
    if (answer.correct) result[answer.difficulty].correct++;
  }

  return result;
}

export function getScoreByChapter(
  answers: AnswerRecord[],
  chapters: Record<string, { name: string; fiche: string; detail: string }>
) {
  const result: Record<
    string,
    {
      name: string;
      fiche: string;
      detail: string;
      correct: number;
      total: number;
      percent: number;
      avgTime: number;
      skills: Record<string, { correct: number; total: number }>;
      wrongRefs: string[];
    }
  > = {};

  for (const [id, ch] of Object.entries(chapters)) {
    result[id] = {
      name: ch.name,
      fiche: ch.fiche,
      detail: ch.detail,
      correct: 0,
      total: 0,
      percent: 0,
      avgTime: 0,
      skills: {},
      wrongRefs: [],
    };
  }

  for (const answer of answers) {
    const ch = result[answer.chapterId];
    if (!ch) continue;
    ch.total++;
    if (answer.correct) {
      ch.correct++;
    } else if (answer.ref) {
      ch.wrongRefs.push(answer.ref);
    }

    if (!ch.skills[answer.skill]) {
      ch.skills[answer.skill] = { correct: 0, total: 0 };
    }
    ch.skills[answer.skill].total++;
    if (answer.correct) ch.skills[answer.skill].correct++;
  }

  for (const ch of Object.values(result)) {
    ch.percent = ch.total > 0 ? Math.round((ch.correct / ch.total) * 100) : 0;
    const chAnswers = answers.filter(
      (a) =>
        result[a.chapterId] &&
        result[a.chapterId].name === ch.name
    );
    ch.avgTime =
      chAnswers.length > 0
        ? Math.round(
            chAnswers.reduce((sum, a) => sum + a.time, 0) / chAnswers.length
          )
        : 0;
  }

  return result;
}

export interface Verdict {
  emoji: string;
  title: string;
  sub: string;
  color: string;
  cta: string;
}

export function getVerdict(readinessPercent: number): Verdict {
  if (readinessPercent >= 90)
    return {
      emoji: "\u{1F451}",
      title: "Pr\u00EAt pour le BAC",
      sub: "Tu ma\u00EEtrises les fondamentaux. Les Masterfiches te blindent pour 0 impasse le jour J.",
      color: "#fbbf24",
      cta: "Vise l\u2019excellence \u2192",
    };
  if (readinessPercent >= 75)
    return {
      emoji: "\uD83D\uDD25",
      title: "Bonne pr\u00E9paration",
      sub: "Excellent niveau. Quelques chapitres \u00E0 consolider pour viser l\u2019excellence.",
      color: "#34d399",
      cta: "Passe de bon \u00E0 imbattable \u2192",
    };
  if (readinessPercent >= 50)
    return {
      emoji: "\uD83D\uDCAA",
      title: "En progression",
      sub: "Tu es sur la bonne voie. En ciblant tes lacunes, tu peux progresser vite.",
      color: "#635bff",
      cta: "Comble tes lacunes \u2192",
    };
  return {
    emoji: "\u26A0\uFE0F",
    title: "Intensifie tes r\u00E9visions",
    sub: "Chaque jour compte. Un plan structur\u00E9 chapitre par chapitre change tout.",
    color: "#f87171",
    cta: "Commence ta remont\u00E9e \u2192",
  };
}
