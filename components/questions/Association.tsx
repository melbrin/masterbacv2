"use client";

import { useState, useEffect } from "react";
import { AssociationQuestion } from "@/lib/types";

interface AssociationProps {
  question: AssociationQuestion;
  onAnswer: (correct: boolean) => void;
  answered: boolean;
}

const PAIR_COLORS = [
  { border: "#635bff", bg: "#635bff22", text: "#635bff" },
  { border: "#34d399", bg: "#34d39922", text: "#34d399" },
  { border: "#f59e0b", bg: "#f59e0b22", text: "#f59e0b" },
  { border: "#ec4899", bg: "#ec489922", text: "#ec4899" },
  { border: "#06b6d4", bg: "#06b6d422", text: "#06b6d4" },
  { border: "#8b5cf6", bg: "#8b5cf622", text: "#8b5cf6" },
];

export default function Association({
  question,
  onAnswer,
  answered,
}: AssociationProps) {
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matches, setMatches] = useState<Record<number, number>>({});
  const [shuffledRight, setShuffledRight] = useState<number[]>([]);
  const [matchOrder, setMatchOrder] = useState<number[]>([]);

  useEffect(() => {
    const indices = question.pairs.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setShuffledRight(indices);
    setSelectedLeft(null);
    setMatches({});
    setMatchOrder([]);
  }, [question.id]);

  const handleLeftClick = (idx: number) => {
    if (answered) return;
    // If already matched, deselect (remove the match)
    if (matches[idx] !== undefined) {
      const rightIdx = matches[idx];
      const newMatches = { ...matches };
      delete newMatches[idx];
      setMatches(newMatches);
      setMatchOrder((prev) => prev.filter((i) => i !== idx));
      setSelectedLeft(null);
      return;
    }
    setSelectedLeft(idx === selectedLeft ? null : idx);
  };

  const handleRightClick = (rightIdx: number) => {
    if (answered || selectedLeft === null) return;
    // If this right item is already matched, ignore
    const alreadyMatched = Object.values(matches).includes(rightIdx);
    if (alreadyMatched) return;

    const newMatches = { ...matches, [selectedLeft]: rightIdx };
    setMatches(newMatches);
    setMatchOrder((prev) => [...prev, selectedLeft]);
    setSelectedLeft(null);

    // If all matched, check correctness
    if (Object.keys(newMatches).length === question.pairs.length) {
      const allCorrect = question.pairs.every(
        (_, i) => newMatches[i] === i
      );
      onAnswer(allCorrect);
    }
  };

  const isRightMatched = (rightIdx: number) =>
    Object.values(matches).includes(rightIdx);

  // Get color index for a match (based on order of matching)
  const getColorIndex = (leftIdx: number): number => {
    const order = matchOrder.indexOf(leftIdx);
    return order >= 0 ? order % PAIR_COLORS.length : 0;
  };

  const getMatchStyle = (leftIdx: number, isCorrectResult?: boolean) => {
    if (matches[leftIdx] === undefined) return {};
    if (answered) {
      const isCorrect = isCorrectResult ?? (matches[leftIdx] === leftIdx);
      return {
        borderColor: isCorrect ? "var(--color-mint)" : "var(--color-coral)",
        background: isCorrect ? "var(--color-mint-soft)" : "var(--color-coral-soft)",
      };
    }
    const c = PAIR_COLORS[getColorIndex(leftIdx)];
    return { borderColor: c.border, background: c.bg };
  };

  const getRightMatchStyle = (rightIdx: number) => {
    const leftEntry = Object.entries(matches).find(([, v]) => v === rightIdx);
    if (!leftEntry) return {};
    const leftIdx = Number(leftEntry[0]);
    if (answered) {
      const isCorrect = leftIdx === rightIdx;
      return {
        borderColor: isCorrect ? "var(--color-mint)" : "var(--color-coral)",
        background: isCorrect ? "var(--color-mint-soft)" : "var(--color-coral-soft)",
      };
    }
    const c = PAIR_COLORS[getColorIndex(leftIdx)];
    return { borderColor: c.border, background: c.bg };
  };

  return (
    <div className="space-y-4">
      <p className="text-xs font-bold text-muted uppercase tracking-widest">
        {"Associe chaque élément. Clique à gauche pour désélectionner."}
      </p>

      <div className="grid grid-cols-2 gap-2">
        {/* Left column */}
        <div className="flex flex-col gap-2">
          {question.pairs.map((pair, idx) => {
            const isMatched = matches[idx] !== undefined;
            const isSelected = selectedLeft === idx;
            const style = isMatched ? getMatchStyle(idx) : {};

            return (
              <button
                key={`left-${idx}`}
                onClick={() => handleLeftClick(idx)}
                style={style}
                className={`p-2.5 rounded-xl border-2 text-left text-[13px] font-semibold transition-all leading-snug break-words min-h-[42px] ${
                  isSelected
                    ? "border-accent bg-accent-soft text-accent"
                    : isMatched
                      ? "text-text"
                      : "border-border bg-card text-text cursor-pointer hover:border-accent/50"
                } ${answered ? "cursor-default" : "cursor-pointer"}`}
              >
                {pair.left}
              </button>
            );
          })}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-2">
          {shuffledRight.map((origIdx) => {
            const matched = isRightMatched(origIdx);
            const style = matched ? getRightMatchStyle(origIdx) : {};

            return (
              <button
                key={`right-${origIdx}`}
                onClick={() => handleRightClick(origIdx)}
                style={style}
                className={`p-2.5 rounded-xl border-2 text-left text-[13px] font-semibold transition-all leading-snug break-words min-h-[42px] ${
                  matched
                    ? "text-text"
                    : selectedLeft !== null
                      ? "border-border bg-card text-text cursor-pointer hover:border-accent/50"
                      : "border-border bg-card text-sub"
                } ${answered ? "cursor-default" : ""}`}
              >
                {question.pairs[origIdx].right}
              </button>
            );
          })}
        </div>
      </div>

      {answered && (
        <div className="p-3 rounded-xl bg-surface border border-border text-sm">
          <span className="font-bold text-text">{"Associations correctes : "}</span>
          {question.pairs.map((p, i) => (
            <span key={i} className="text-sub">
              {p.left} {"\u2192"} {p.right}
              {i < question.pairs.length - 1 ? " \u00B7 " : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
