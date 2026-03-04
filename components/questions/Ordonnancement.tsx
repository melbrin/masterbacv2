"use client";

import { useState, useEffect } from "react";
import { OrdreQuestion } from "@/lib/types";

interface OrdonnancementProps {
  question: OrdreQuestion;
  onAnswer: (correct: boolean) => void;
  answered: boolean;
}

export default function Ordonnancement({
  question,
  onAnswer,
  answered,
}: OrdonnancementProps) {
  const [items, setItems] = useState<string[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    // Shuffle items
    const shuffled = [...question.items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setItems(shuffled);
    setDragIdx(null);
  }, [question.id]);

  const moveItem = (fromIdx: number, direction: "up" | "down") => {
    if (answered) return;
    const toIdx = direction === "up" ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= items.length) return;
    const newItems = [...items];
    [newItems[fromIdx], newItems[toIdx]] = [newItems[toIdx], newItems[fromIdx]];
    setItems(newItems);
  };

  const handleValidate = () => {
    if (answered) return;
    // Check if order matches
    const isCorrect = items.every(
      (item, idx) => item === question.items[idx]
    );
    // Partial credit: count positions that are correct
    onAnswer(isCorrect);
  };

  const getItemStatus = (item: string, idx: number) => {
    if (!answered) return "neutral";
    return item === question.items[idx] ? "correct" : "incorrect";
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-muted uppercase tracking-widest">
        Remettez les etapes dans le bon ordre
      </p>

      <div className="flex flex-col gap-2">
        {items.map((item, idx) => {
          const status = getItemStatus(item, idx);

          return (
            <div
              key={`${item}-${idx}`}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                status === "correct"
                  ? "bg-mint-soft border-mint"
                  : status === "incorrect"
                    ? "bg-coral-soft border-coral"
                    : dragIdx === idx
                      ? "bg-accent-soft border-accent"
                      : "bg-card border-border"
              }`}
            >
              {/* Number indicator */}
              <span
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0 ${
                  status === "correct"
                    ? "bg-mint text-white"
                    : status === "incorrect"
                      ? "bg-coral text-white"
                      : "bg-dim/40 text-muted"
                }`}
              >
                {idx + 1}
              </span>

              {/* Item text */}
              <span className="flex-1 text-sm font-semibold">{item}</span>

              {/* Move buttons */}
              {!answered && (
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveItem(idx, "up")}
                    disabled={idx === 0}
                    className="w-6 h-6 rounded flex items-center justify-center text-xs bg-surface border border-border text-sub hover:text-text hover:border-accent disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveItem(idx, "down")}
                    disabled={idx === items.length - 1}
                    className="w-6 h-6 rounded flex items-center justify-center text-xs bg-surface border border-border text-sub hover:text-text hover:border-accent disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                  >
                    ▼
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!answered && (
        <button
          onClick={handleValidate}
          className="w-full p-3.5 rounded-xl border-none font-bold text-[15px] transition-all duration-200 bg-gradient-to-br from-accent to-[#7c6cf0] text-white shadow-[0_4px_24px_var(--color-accent-glow)] hover:translate-y-[-2px]"
        >
          Valider l&apos;ordre
        </button>
      )}

      {answered && (
        <div className="p-3 rounded-xl bg-surface border border-border text-sm">
          <span className="font-bold text-text">Ordre correct : </span>
          {question.items.map((item, i) => (
            <span key={i} className="text-sub">
              {i + 1}. {item}
              {i < question.items.length - 1 ? " → " : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
