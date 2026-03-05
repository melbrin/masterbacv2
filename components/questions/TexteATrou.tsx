"use client";

import { useState, useRef, useEffect } from "react";
import { TrouQuestion } from "@/lib/types";

interface TexteATrouProps {
  question: TrouQuestion;
  onAnswer: (correct: boolean) => void;
  answered: boolean;
}

export default function TexteATrou({
  question,
  onAnswer,
  answered,
}: TexteATrouProps) {
  const [value, setValue] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue("");
    inputRef.current?.focus();
  }, [question.id]);

  const checkAnswer = () => {
    if (answered || !value.trim()) return;
    const normalized = value.trim().toLowerCase().replace(/\s+/g, "");
    const correct = question.acceptedAnswers.some(
      (ans) => ans.trim().toLowerCase().replace(/\s+/g, "") === normalized
    );
    setIsCorrect(correct);
    onAnswer(correct);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      checkAnswer();
    }
  };

  // Split the question text around "___"
  const parts = question.q.split("___");

  return (
    <div className="space-y-4">
      <div className="text-[15px] leading-relaxed">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <span className="inline-block mx-1 align-middle">
                <input
                  ref={i === 0 ? inputRef : undefined}
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={answered}
                  placeholder="..."
                  className={`w-28 px-3 py-1.5 rounded-lg border-2 text-center font-bold text-sm bg-card outline-none transition-all ${
                    answered
                      ? isCorrect
                        ? "border-mint text-mint bg-mint-soft"
                        : "border-coral text-coral bg-coral-soft"
                      : "border-accent text-text focus:border-accent focus:shadow-[0_0_12px_var(--color-accent-glow)]"
                  }`}
                />
              </span>
            )}
          </span>
        ))}
      </div>

      {!answered && (
        <button
          onClick={checkAnswer}
          disabled={!value.trim()}
          className="w-full p-3.5 rounded-xl border-none font-bold text-[15px] transition-all duration-200 bg-gradient-to-br from-accent to-[#7c6cf0] text-white shadow-[0_4px_24px_var(--color-accent-glow)] hover:translate-y-[-2px] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          Valider
        </button>
      )}

      {answered && (
        <div
          className={`p-3 rounded-xl text-sm font-semibold ${
            isCorrect
              ? "bg-mint-soft border border-mint/20 text-mint"
              : "bg-coral-soft border border-coral/20 text-coral"
          }`}
        >
          {isCorrect
            ? "✓ Bonne réponse !"
            : `✗ La réponse était : ${question.answer}`}
        </div>
      )}
    </div>
  );
}
