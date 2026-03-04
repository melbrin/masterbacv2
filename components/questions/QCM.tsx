"use client";

import { useState } from "react";
import { QCMQuestion } from "@/lib/types";

interface QCMProps {
  question: QCMQuestion;
  onAnswer: (correct: boolean) => void;
  answered: boolean;
}

export default function QCM({ question, onAnswer, answered }: QCMProps) {
  const [selected, setSelected] = useState<number | null>(null);

  const handleClick = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    onAnswer(idx === question.c);
  };

  return (
    <div className="flex flex-col gap-2.5">
      {question.o.map((opt, idx) => {
        let classes =
          "w-full p-3.5 rounded-xl border-2 text-left text-[15px] font-semibold transition-all duration-200 flex items-center gap-3";

        if (answered) {
          if (idx === question.c) {
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

        if (answered && idx === question.c) {
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
