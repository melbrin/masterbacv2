export type Difficulty = "basique" | "classique" | "expert";

export type QuestionType =
  | "qcm"
  | "vrai_faux"
  | "trou"
  | "association"
  | "graphique"
  | "ordre";

export type Mode = "diagnostic" | "chapitre" | "express" | "bac_blanc";

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  d: Difficulty;
  skill: string;
  q: string;
  ref: string;
}

export interface QCMQuestion extends BaseQuestion {
  type: "qcm";
  o: string[];
  c: number;
}

export interface VraiFauxQuestion extends BaseQuestion {
  type: "vrai_faux";
  answer: boolean;
  explanation: string;
}

export interface TrouQuestion extends BaseQuestion {
  type: "trou";
  answer: string;
  acceptedAnswers: string[];
}

export interface AssociationQuestion extends BaseQuestion {
  type: "association";
  pairs: { left: string; right: string }[];
}

export interface GraphiqueQuestion extends BaseQuestion {
  type: "graphique";
  graphDesc: string;
  o: string[];
  c: number;
}

export interface OrdreQuestion extends BaseQuestion {
  type: "ordre";
  items: string[];
}

export type Question =
  | QCMQuestion
  | VraiFauxQuestion
  | TrouQuestion
  | AssociationQuestion
  | GraphiqueQuestion
  | OrdreQuestion;

export interface Chapter {
  id: string;
  name: string;
  fiche: string;
  ficheUrl: string;
  detail: string;
  subSkills: string[];
  questions: Question[];
}

export interface QuestionDB {
  meta: {
    version: string;
    subject: string;
    source: string;
    totalQuestions: number;
    chapters: number;
    difficulties: Difficulty[];
    questionTypes: QuestionType[];
    scoring: Record<
      Difficulty,
      { points: number; timeBonusSec: number; bonusMultiplier: number }
    >;
    modes: Record<
      Mode,
      {
        questions: number;
        timeMinutes: number;
        noFeedback?: boolean;
        distribution: Record<Difficulty, number>;
      }
    >;
  };
  chapters: Record<string, Chapter>;
}

export interface AnswerRecord {
  questionId: string;
  correct: boolean;
  time: number;
  chapterId: string;
  difficulty: Difficulty;
  skill: string;
  bonusEarned: boolean;
  pointsEarned: number;
}

export interface QuizConfig {
  mode: Mode;
  chapter?: string;
  subject: string;
}

export interface QuizState {
  config: QuizConfig;
  questions: (Question & { chapterId: string })[];
  currentIndex: number;
  answers: AnswerRecord[];
  questionTimer: number;
  globalTimer: number;
  isFinished: boolean;
}

export interface DifficultyConfig {
  label: string;
  color: string;
  colorClass: string;
  points: number;
  timeBonusSec: number;
  bonusMultiplier: number;
  icon: string;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  basique: {
    label: "Basique",
    color: "#34d399",
    colorClass: "mint",
    points: 1,
    timeBonusSec: 30,
    bonusMultiplier: 0.5,
    icon: "●",
  },
  classique: {
    label: "Classique",
    color: "#fbbf24",
    colorClass: "amber",
    points: 2,
    timeBonusSec: 60,
    bonusMultiplier: 0.5,
    icon: "●●",
  },
  expert: {
    label: "Expert",
    color: "#f87171",
    colorClass: "coral",
    points: 3,
    timeBonusSec: 120,
    bonusMultiplier: 0.5,
    icon: "●●●",
  },
};

export const MODE_CONFIG: Record<
  Mode,
  {
    label: string;
    description: string;
    questions: number;
    timeMinutes: number;
    noFeedback: boolean;
    distribution: Record<Difficulty, number>;
  }
> = {
  diagnostic: {
    label: "Diagnostic Complet",
    description: "40 questions, tous les chapitres, feedback apres chaque question",
    questions: 40,
    timeMinutes: 30,
    noFeedback: false,
    distribution: { basique: 16, classique: 14, expert: 10 },
  },
  chapitre: {
    label: "Par Chapitre",
    description: "15 questions sur un seul chapitre",
    questions: 15,
    timeMinutes: 12,
    noFeedback: false,
    distribution: { basique: 6, classique: 5, expert: 4 },
  },
  express: {
    label: "Express",
    description: "10 questions en 5 minutes, tous chapitres",
    questions: 10,
    timeMinutes: 5,
    noFeedback: false,
    distribution: { basique: 4, classique: 4, expert: 2 },
  },
  bac_blanc: {
    label: "BAC Blanc",
    description: "40 questions, conditions du jour J, aucun feedback",
    questions: 40,
    timeMinutes: 30,
    noFeedback: true,
    distribution: { basique: 16, classique: 14, expert: 10 },
  },
};
