"use client";

import { useState } from "react";
import { GraphiqueQuestion } from "@/lib/types";

interface LectureGraphiqueProps {
  question: GraphiqueQuestion;
  onAnswer: (correct: boolean) => void;
  answered: boolean;
}

export default function LectureGraphique({
  question,
  onAnswer,
  answered,
}: LectureGraphiqueProps) {
  const [selected, setSelected] = useState<number | null>(null);

  const handleClick = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    onAnswer(idx === question.c);
  };

  return (
    <div className="space-y-4">
      {/* Graph description area */}
      <div className="p-4 rounded-xl bg-surface border border-border">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-accent text-lg">📊</span>
          <span className="text-xs font-bold text-muted uppercase tracking-widest">
            Lecture graphique
          </span>
        </div>
        <p className="text-sm text-sub leading-relaxed italic">
          {question.graphDesc}
        </p>
        <div className="mt-3 bg-card rounded-lg p-4 flex items-center justify-center min-h-[120px]">
          <svg
            viewBox="0 0 300 150"
            className="w-full max-w-[300px]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line x1="30" y1="120" x2="280" y2="120" stroke="#3a3a52" strokeWidth="1" />
            <line x1="30" y1="10" x2="30" y2="120" stroke="#3a3a52" strokeWidth="1" />
            <path
              d="M 30 100 Q 80 20 150 50 Q 220 80 280 110"
              fill="none"
              stroke="#635bff"
              strokeWidth="2"
            />
            <circle cx="30" cy="100" r="3" fill="#34d399" />
            <circle cx="150" cy="50" r="3" fill="#fbbf24" />
            <text x="280" y="135" fill="#6b6b88" fontSize="10">x</text>
            <text x="15" y="15" fill="#6b6b88" fontSize="10">y</text>
          </svg>
        </div>
      </div>

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
              <span>{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
