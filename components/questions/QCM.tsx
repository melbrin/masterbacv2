"use client";

import { useState, useMemo } from "react";
import { QCMQuestion } from "@/lib/types";

interface QCMProps {
  question: QCMQuestion;
  onAnswer: (correct: boolean) => void;
  answered: boolean;
}

export default function QCM({ question, onAnswer, answered }: QCMProps) {
  const [selected, setSelected] = useState<number | null>(null);

  // Shuffle options order, tracking which shuffled index is correct
  const { shuffledOptions, correctShuffledIndex } = useMemo(() => {
    const indices = question.o.map((_, i) => i);
    // Fisher-Yates shuffle seeded by question id for determinism
    let seed = 0;
    for (let i = 0; i < question.id.length; i++) {
      seed = (seed * 31 + question.id.charCodeAt(i)) | 0;
    }
    const rand = () => {
      seed = (seed * 16807 + 0) % 2147483647;
      return (seed & 0x7fffffff) / 2147483647;
    };
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return {
      shuffledOptions: indices.map((i) => question.o[i]),
      correctShuffledIndex: indices.indexOf(question.c),
    };
  }, [question.id, question.o, question.c]);

  const handleClick = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    onAnswer(idx === correctShuffledIndex);
  };

  return (
    <div className="flex flex-col gap-2.5">
      {shuffledOptions.map((opt, idx) => {
        let classes =
          "w-full p-3.5 rounded-xl border-2 text-left text-[15px] font-semibold transition-all duration-200 flex items-center gap-3";

        if (answered) {
          if (idx === correctShuffledIndex) {
            classes +=
              " bg-mint-soft border-mint text-mint shadow-[0_0_16px_var(--color-mint-glow)]";
          } else if (idx === selected) {
            classes += " bg-coral-soft border-coral text-coral";
          } else {
            classes += " bg-card border-border text-text opacity-35";
          }
        } else {
          classes +=
            " bg-card border-border text-text cursor-pointer hover:border-accent hover:bg-accent-soft";
        }

        const letter = String.fromCharCode(65 + idx);
        let iconBg = "bg-dim/40 text-muted";
        let icon: string | null = null;

        if (answered && idx === correctShuffledIndex) {
          iconBg = "bg-mint text-white";
          icon = "✓";
        } else if (answered && idx === selected) {
          iconBg = "bg-coral text-white";
          icon = "✗";
        }

        return (
          <button key={idx} onClick={() => handleClick(idx)} className={classes}>
            <span
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0 ${iconBg}`}
            >
              {icon || letter}
            </span>
            <span className="whitespace-pre-wrap">{opt}</span>
          </button>
        );
      })}
    </div>
  );
}
