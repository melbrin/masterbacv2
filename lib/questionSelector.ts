import {
  Question,
  Chapter,
  Mode,
  Difficulty,
  MODE_CONFIG,
} from "./types";

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function groupBy<T>(
  array: T[],
  key: (item: T) => string
): Record<string, T[]> {
  return array.reduce(
    (groups, item) => {
      const k = key(item);
      if (!groups[k]) groups[k] = [];
      groups[k].push(item);
      return groups;
    },
    {} as Record<string, T[]>
  );
}

export type QuestionWithChapter = Question & { chapterId: string };

export function selectQuestions(
  mode: Mode,
  chapters: Record<string, Chapter>,
  selectedChapter?: string
): QuestionWithChapter[] {
  const config = MODE_CONFIG[mode];

  // Build question pool with chapter info
  let pool: QuestionWithChapter[] = [];

  if (selectedChapter && chapters[selectedChapter]) {
    pool = chapters[selectedChapter].questions.map((q) => ({
      ...q,
      chapterId: selectedChapter,
    }));
  } else {
    for (const [chId, ch] of Object.entries(chapters)) {
      for (const q of ch.questions) {
        pool.push({ ...q, chapterId: chId });
      }
    }
  }

  const selected: QuestionWithChapter[] = [];

  for (const [diff, count] of Object.entries(config.distribution) as [
    Difficulty,
    number,
  ][]) {
    const available = shuffle(pool.filter((q) => q.d === diff));

    if (!selectedChapter) {
      // Ensure chapter diversity
      const byChapter = groupBy(available, (q) => q.chapterId);
      const chapterIds = Object.keys(byChapter);
      const perChapter = Math.ceil(count / chapterIds.length);

      let picked: QuestionWithChapter[] = [];
      for (const chQuestions of Object.values(byChapter)) {
        picked.push(...chQuestions.slice(0, perChapter));
      }
      picked = shuffle(picked).slice(0, count);
      selected.push(...picked);
    } else {
      selected.push(...available.slice(0, count));
    }
  }

  // Sort: basique first, then classique, then expert
  const diffOrder: Record<Difficulty, number> = {
    basique: 0,
    classique: 1,
    expert: 2,
  };
  selected.sort((a, b) => diffOrder[a.d] - diffOrder[b.d]);

  return selected.slice(0, config.questions);
}
