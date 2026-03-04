"use client";

import { useState } from "react";
import { VraiFauxQuestion } from "@/lib/types";

interface VraiFauxProps {
  question: VraiFauxQuestion;
  onAnswer: (correct: boolean) => void;
  answered: boolean;
}

export default function VraiFaux({
  question,
  onAnswer,
  answered,
}: VraiFauxProps) {
  const [selected, setSelected] = useState<boolean | null>(null);

  const handleClick = (value: boolean) => {
    if (answered) return;
    setSelected(value);
    onAnswer(value === question.answer);
  };

  const buttons: { label: string; value: boolean; icon: string }[] = [
    { label: "VRAI", value: true, icon: "✓" },
    { label: "FAUX", value: false, icon: "✗" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {buttons.map((btn) => {
          const isCorrect = btn.value === question.answer;
          const isSelected = selected === btn.value;
          let classes =
            "flex-1 p-4 rounded-xl border-2 text-center font-bold text-lg transition-all duration-200";

          if (answered) {
            if (isCorrect) {
              classes +=
                " bg-mint-soft border-mint text-mint shadow-[0_0_16px_var(--color-mint-glow)]";
            } else if (isSelected) {
              classes += " bg-coral-soft border-coral text-coral";
            } else {
              classes += " bg-card border-border text-text opacity-35";
            }
          } else {
            classes +=
              " bg-card border-border text-text cursor-pointer hover:border-accent hover:bg-accent-soft";
          }

          return (
            <button
              key={btn.label}
              onClick={() => handleClick(btn.value)}
              className={classes}
            >
              <span className="text-2xl block mb-1">{btn.icon}</span>
              {btn.label}
            </button>
          );
        })}
      </div>

      {answered && question.explanation && (
        <div className="p-4 rounded-xl bg-surface border border-border">
          <p className="text-sm text-sub leading-relaxed">
            <span className="font-bold text-text">Explication : </span>
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
}
