"use client";

import { useCallback } from "react";
import { QuestionWithChapter } from "@/lib/questionSelector";
import QCM from "./questions/QCM";
import VraiFaux from "./questions/VraiFaux";
import TexteATrou from "./questions/TexteATrou";
import Association from "./questions/Association";
import LectureGraphique from "./questions/LectureGraphique";
import Ordonnancement from "./questions/Ordonnancement";

interface QuestionEngineProps {
  question: QuestionWithChapter;
  onAnswer: (correct: boolean) => void;
  answered: boolean;
}

export default function QuestionEngine({
  question,
  onAnswer,
  answered,
}: QuestionEngineProps) {
  const handleAnswer = useCallback(
    (correct: boolean) => {
      onAnswer(correct);
    },
    [onAnswer]
  );

  switch (question.type) {
    case "qcm":
      return (
        <QCM
          question={question}
          onAnswer={handleAnswer}
          answered={answered}
        />
      );
    case "vrai_faux":
      return (
        <VraiFaux
          question={question}
          onAnswer={handleAnswer}
          answered={answered}
        />
      );
    case "trou":
      return (
        <TexteATrou
          question={question}
          onAnswer={handleAnswer}
          answered={answered}
        />
      );
    case "association":
      return (
        <Association
          question={question}
          onAnswer={handleAnswer}
          answered={answered}
        />
      );
    case "graphique":
      return (
        <LectureGraphique
          question={question}
          onAnswer={handleAnswer}
          answered={answered}
        />
      );
    case "ordre":
      return (
        <Ordonnancement
          question={question}
          onAnswer={handleAnswer}
          answered={answered}
        />
      );
    default:
      return <div className="text-coral">Type de question non supporte</div>;
  }
}
