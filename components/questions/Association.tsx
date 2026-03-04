"use client";

import { useState, useEffect } from "react";
import { AssociationQuestion } from "@/lib/types";

interface AssociationProps {
  question: AssociationQuestion;
  onAnswer: (correct: boolean) => void;
  answered: boolean;
}

export default function Association({
  question,
  onAnswer,
  answered,
}: AssociationProps) {
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matches, setMatches] = useState<Record<number, number>>({});
  const [shuffledRight, setShuffledRight] = useState<number[]>([]);

  useEffect(() => {
    const indices = question.pairs.map((_, i) => i);
    // Shuffle right column
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setShuffledRight(indices);
    setSelectedLeft(null);
    setMatches({});
  }, [question.id]);

  const handleLeftClick = (idx: number) => {
    if (answered || matches[idx] !== undefined) return;
    setSelectedLeft(idx === selectedLeft ? null : idx);
  };

  const handleRightClick = (rightIdx: number) => {
    if (answered || selectedLeft === null) return;
    // Check if this right item is already matched
    const alreadyMatched = Object.values(matches).includes(rightIdx);
    if (alreadyMatched) return;

    const newMatches = { ...matches, [selectedLeft]: rightIdx };
    setMatches(newMatches);
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

  const getMatchColor = (leftIdx: number) => {
    if (matches[leftIdx] === undefined) return "";
    if (!answered) return "border-accent bg-accent-soft";
    return matches[leftIdx] === leftIdx
      ? "border-mint bg-mint-soft"
      : "border-coral bg-coral-soft";
  };

  const getRightMatchColor = (rightIdx: number) => {
    const leftIdx = Object.entries(matches).find(
      ([, v]) => v === rightIdx
    )?.[0];
    if (leftIdx === undefined) return "";
    if (!answered) return "border-accent bg-accent-soft";
    return Number(leftIdx) === rightIdx
      ? "border-mint bg-mint-soft"
      : "border-coral bg-coral-soft";
  };

  return (
    <div className="space-y-4">
      <p className="text-xs font-bold text-muted uppercase tracking-widest">
        Cliquez sur un element a gauche puis sur sa correspondance a droite
      </p>

      <div className="grid grid-cols-2 gap-3">
        {/* Left column */}
        <div className="flex flex-col gap-2">
          {question.pairs.map((pair, idx) => (
            <button
              key={`left-${idx}`}
              onClick={() => handleLeftClick(idx)}
              className={`p-3 rounded-xl border-2 text-left text-sm font-semibold transition-all ${
                selectedLeft === idx
                  ? "border-accent bg-accent-soft text-accent"
                  : matches[idx] !== undefined
                    ? getMatchColor(idx) + " text-text"
                    : "border-border bg-card text-text cursor-pointer hover:border-accent/50"
              } ${answered ? "cursor-default" : ""}`}
            >
              {pair.left}
            </button>
          ))}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-2">
          {shuffledRight.map((origIdx) => (
            <button
              key={`right-${origIdx}`}
              onClick={() => handleRightClick(origIdx)}
              className={`p-3 rounded-xl border-2 text-left text-sm font-semibold transition-all ${
                isRightMatched(origIdx)
                  ? getRightMatchColor(origIdx) + " text-text"
                  : selectedLeft !== null
                    ? "border-border bg-card text-text cursor-pointer hover:border-accent/50"
                    : "border-border bg-card text-sub"
              } ${answered ? "cursor-default" : ""}`}
            >
              {question.pairs[origIdx].right}
            </button>
          ))}
        </div>
      </div>

      {answered && (
        <div className="p-3 rounded-xl bg-surface border border-border text-sm">
          <span className="font-bold text-text">Associations correctes : </span>
          {question.pairs.map((p, i) => (
            <span key={i} className="text-sub">
              {p.left} → {p.right}
              {i < question.pairs.length - 1 ? " · " : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
