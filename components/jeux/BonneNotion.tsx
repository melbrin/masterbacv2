"use client";

// La bonne notion : une question de cours s'affiche, il faut trouver la notion qu'elle fait travailler.

import { useState } from "react";
import ContenuHtml from "@/components/socle/ContenuHtml";
import type { FinDePartie, QuestionNotion } from "@/lib/commun/jeux";
import CadreJeu, { Annonce, BandeauJeu, bilanReponses, brasse, Compteur, ECART, MINIMUM, OptionsJeu, PAUSE_REPONSE, propositions, useChrono, useDelai, usePartie, type OptionJeu } from "./CadreJeu";

const QUESTIONS = 10;
const LEURRES = 3;
/** La clé de la bonne notion parmi les réponses proposées. */
const BONNE = "bonne";

interface Tour { question: QuestionNotion; options: OptionJeu[] }

/** Les leurres d'une question, sans doublon et sans la bonne notion. */
const leurresDe = (question: QuestionNotion) => [...new Set(question.leurres)].filter((l) => l !== question.notion);

/** Dix questions au plus, chacune avec sa notion glissée parmi ses leurres. */
function prepare(questions: readonly QuestionNotion[], graine: number): Tour[] {
  return brasse(questions, graine).slice(0, QUESTIONS).map((question, i) => ({
    question,
    options: propositions(
      { cle: BONNE, html: question.notion },
      leurresDe(question).map((html, k) => ({ cle: `leurre-${k}`, html })),
      LEURRES, graine + ECART * (i + 1),
    ),
  }));
}

function Plateau({ questions }: { questions: QuestionNotion[] }) {
  const partie = usePartie();
  // les questions sont tirées une fois, quand le plateau apparaît
  const [tours] = useState(() => prepare(questions, partie.graine));
  const [rang, setRang] = useState(0);
  const [choisie, setChoisie] = useState<string | undefined>(undefined);
  const [bonnes, setBonnes] = useState(0);
  const lis = useChrono();
  const tour = tours[rang];
  const total = tours.length;
  const repondu = choisie !== undefined;
  const juste = choisie === BONNE;
  // dix points par bonne réponse quand il y a dix questions ; avec moins de questions, une partie sans faute vaut encore 100
  const score = Math.round((100 * bonnes) / total);

  // la bonne notion reste montrée un instant ; puis la question suivante arrive, ou la partie se termine
  useDelai(repondu ? rang : null, PAUSE_REPONSE, () => {
    if (rang + 1 < total) {
      setRang(rang + 1);
      setChoisie(undefined);
      return;
    }
    partie.termine(score, lis(), bilanReponses(bonnes, total));
  });

  const repond = (cle: string) => {
    if (repondu) return;
    setChoisie(cle);
    if (cle === BONNE) setBonnes(bonnes + 1);
  };

  return (
    <>
      <BandeauJeu>
        <Compteur nom="Question" valeur={rang + 1} suite={`sur ${total}`} />
        <Compteur nom="Score" valeur={score} />
      </BandeauJeu>
      <div aria-live="polite">
        <div key={rang} className="carte jeu-question apparait">
          <span className="jeu-etiquette">Question de cours</span>
          <ContenuHtml bloc className="jeu-question-titre" html={tour.question.titre} />
        </div>
      </div>
      <OptionsJeu nom="Notions proposées" options={tour.options} bonne={BONNE} choisie={choisie} repond={repond} />
      <Annonce verdict={!repondu ? null : juste ? "bon" : "faux"} titre={juste ? "Bonne réponse" : "Ce n'est pas ça"}>
        {!juste && <span>La bonne notion&nbsp;: <ContenuHtml html={tour.question.notion} /></span>}
      </Annonce>
    </>
  );
}

/**
 * La bonne notion. Dix questions au plus ; il en faut au moins quatre, chacune avec au moins un leurre.
 * Score : arrondi de 100 × bonnes réponses / nombre de questions, soit 10 points par bonne réponse quand il y a dix questions.
 */
export default function BonneNotion({ questions, graine, fin, retour }: {
  questions: QuestionNotion[]; graine: number; fin: FinDePartie; retour: string;
}) {
  // une question sans leurre n'aurait qu'une réponse proposée
  const jouables = questions.filter((q) => leurresDe(q).length > 0);
  return (
    <CadreJeu graine={graine} fin={fin} retour={retour} manque={jouables.length < MINIMUM ? "Pas assez de questions pour ce jeu." : null}>
      <Plateau questions={jouables} />
    </CadreJeu>
  );
}
