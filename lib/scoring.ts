import { AnswerRecord, Difficulty, DIFFICULTY_CONFIG } from "./types";

export function computeScore(answers: AnswerRecord[]) {
  let rawScore = 0;
  let maxRawScore = 0;
  let bonusCount = 0;
  let totalBonusPoints = 0;

  for (const answer of answers) {
    const config = DIFFICULTY_CONFIG[answer.difficulty];
    maxRawScore += config.points;

    if (answer.correct) {
      rawScore += config.points;
      if (answer.bonusEarned) {
        const bonus = config.points * config.bonusMultiplier;
        rawScore += bonus;
        totalBonusPoints += bonus;
        bonusCount++;
      }
    }
  }

  const grade = Math.min(
    20,
    Math.max(0, Math.round((rawScore / maxRawScore) * 20))
  );

  return {
    grade,
    rawScore: Math.round(rawScore * 10) / 10,
    maxRawScore,
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
    };
  }

  for (const answer of answers) {
    const ch = result[answer.chapterId];
    if (!ch) continue;
    ch.total++;
    if (answer.correct) ch.correct++;

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

export function getVerdict(grade: number): Verdict {
  if (grade >= 18)
    return {
      emoji: "👑",
      title: "Exceptionnel",
      sub: "Tu es dans le top. Les Masterfiches te blindent pour 0 impasse le jour J.",
      color: "#fbbf24",
      cta: "Vise le 20/20 →",
    };
  if (grade >= 15)
    return {
      emoji: "🔥",
      title: "Tres solide",
      sub: "Excellent niveau. Entre 15 et 20, chaque point se joue sur les exercices pieges.",
      color: "#34d399",
      cta: "Passe de bon a imbattable →",
    };
  if (grade >= 12)
    return {
      emoji: "💪",
      title: "Bonne base",
      sub: "Tu es sur la bonne voie. En 3 semaines ciblees, tu peux viser 16+.",
      color: "#635bff",
      cta: "Comble tes lacunes →",
    };
  if (grade >= 8)
    return {
      emoji: "⚠️",
      title: "Peut mieux faire",
      sub: "Des chapitres sont fragiles. Il reste du temps, c'est largement suffisant.",
      color: "#fbbf24",
      cta: "Remonte de +5 points →",
    };
  return {
    emoji: "🚨",
    title: "Agis maintenant",
    sub: "Chaque jour compte. Un plan structure chapitre par chapitre change tout.",
    color: "#f87171",
    cta: "Commence ta remontee →",
  };
}
