"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  QuizConfig,
  QuizState,
  AnswerRecord,
  Question,
  DIFFICULTY_CONFIG,
  Mode,
  Chapter,
} from "./types";
import { selectQuestions, QuestionWithChapter } from "./questionSelector";

interface QuizContextType {
  state: QuizState | null;
  startQuiz: (
    config: QuizConfig,
    chapters: Record<string, Chapter>
  ) => void;
  submitAnswer: (record: AnswerRecord) => void;
  nextQuestion: () => void;
  getCurrentQuestion: () => QuestionWithChapter | null;
  updateTimers: (questionTime: number, globalTime: number) => void;
  finishQuiz: () => void;
  resetQuiz: () => void;
}

const QuizContext = createContext<QuizContextType | null>(null);

export function QuizProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<QuizState | null>(null);

  const startQuiz = useCallback(
    (config: QuizConfig, chapters: Record<string, Chapter>) => {
      const questions = selectQuestions(
        config.mode,
        chapters,
        config.chapter
      );
      setState({
        config,
        questions,
        currentIndex: 0,
        answers: [],
        questionTimer: 0,
        globalTimer: 0,
        isFinished: false,
      });
    },
    []
  );

  const submitAnswer = useCallback((record: AnswerRecord) => {
    setState((prev) => {
      if (!prev) return prev;
      return { ...prev, answers: [...prev.answers, record] };
    });
  }, []);

  const nextQuestion = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      const nextIdx = prev.currentIndex + 1;
      if (nextIdx >= prev.questions.length) {
        return { ...prev, isFinished: true };
      }
      return { ...prev, currentIndex: nextIdx, questionTimer: 0 };
    });
  }, []);

  const getCurrentQuestion = useCallback((): QuestionWithChapter | null => {
    if (!state || state.currentIndex >= state.questions.length) return null;
    return state.questions[state.currentIndex];
  }, [state]);

  const updateTimers = useCallback(
    (questionTime: number, globalTime: number) => {
      setState((prev) => {
        if (!prev) return prev;
        return { ...prev, questionTimer: questionTime, globalTimer: globalTime };
      });
    },
    []
  );

  const finishQuiz = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      return { ...prev, isFinished: true };
    });
  }, []);

  const resetQuiz = useCallback(() => {
    setState(null);
  }, []);

  return (
    <QuizContext.Provider
      value={{
        state,
        startQuiz,
        submitAnswer,
        nextQuestion,
        getCurrentQuestion,
        updateTimers,
        finishQuiz,
        resetQuiz,
      }}
    >
      {children}
    </QuizContext.Provider>
  );
}

export function useQuiz() {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error("useQuiz must be used within a QuizProvider");
  }
  return context;
}
