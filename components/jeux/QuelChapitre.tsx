"use client";

// Quel chapitre ? : une question de cours s'affiche, il faut la ranger dans son chapitre.

import { useRef, useState, type CSSProperties } from "react";
import ContenuHtml from "@/components/socle/ContenuHtml";
import type { ChapitreJeu, FinDePartie, QuestionChapitre } from "@/lib/commun/jeux";
import CadreJeu, { Annonce, BandeauJeu, bilanReponses, brasse, Compteur, ECART, MINIMUM, OptionsJeu, PAUSE_REPONSE, useChrono, useDelai, usePartie, type OptionJeu } from "./CadreJeu";

const QUESTIONS = 10;
/** Le nombre de chapitres proposés au plus pour une question. */
const CHAPITRES = 4;

interface Tour { question: QuestionChapitre; bonne: string; options: OptionJeu[] }

/** Les chapitres sans doublon, dans l'ordre de leurs numéros. */
function chapitresDistincts(chapitres: readonly ChapitreJeu[]): ChapitreJeu[] {
  const parNumero = new Map<number, ChapitreJeu>();
  for (const chapitre of chapitres) if (!parNumero.has(chapitre.num)) parNumero.set(chapitre.num, chapitre);
  return [...parNumero.values()].sort((a, b) => a.num - b.num);
}

/** Dix questions au plus. Chacune propose son chapitre et jusqu'à trois autres, toujours dans l'ordre des numéros. */
function prepare(questions: readonly QuestionChapitre[], chapitres: readonly ChapitreJeu[], graine: number): Tour[] {
  return brasse(questions, graine).slice(0, QUESTIONS).map((question, i) => {
    const autres = chapitres.filter((c) => c.num !== question.fiche);
    const gardes = autres.length > CHAPITRES - 1 ? brasse(autres, graine + ECART * (i + 1)).slice(0, CHAPITRES - 1) : autres;
    const proposes = chapitres.filter((c) => c.num === question.fiche || gardes.includes(c));
    return { question, bonne: String(question.fiche), options: proposes.map((c) => ({ cle: String(c.num), repere: String(c.num), texte: c.titre })) };
  });
}

function Plateau({ questions, chapitres }: { questions: QuestionChapitre[]; chapitres: ChapitreJeu[] }) {
  const partie = usePartie();
  // les questions sont tirées une fois, quand le plateau apparaît
  const [tours] = useState(() => prepare(questions, chapitres, partie.graine));
  const [rang, setRang] = useState(0);
  const [choisie, setChoisie] = useState<string | undefined>(undefined);
  /** le trajet de la carte vers le bouton choisi, en pixels */
  const [envol, setEnvol] = useState<{ dx: number; dy: number } | null>(null);
  const [bonnes, setBonnes] = useState(0);
  const carte = useRef<HTMLDivElement>(null);
  const lis = useChrono();
  const tour = tours[rang];
  const total = tours.length;
  const repondu = choisie !== undefined;
  const juste = choisie === tour.bonne;
  // dix points par bonne réponse quand il y a dix questions ; avec moins de questions, une partie sans faute vaut encore 100
  const score = Math.round((100 * bonnes) / total);

  // le bon chapitre reste montré un instant ; puis la question suivante arrive, ou la partie se termine
  useDelai(repondu ? rang : null, PAUSE_REPONSE, () => {
    if (rang + 1 < total) {
      setRang(rang + 1);
      setChoisie(undefined);
      setEnvol(null);
      return;
    }
    partie.termine(score, lis(), bilanReponses(bonnes, total));
  });

  const repond = (cle: string, bouton: HTMLButtonElement) => {
    if (repondu) return;
    // la carte part vers le bouton choisi : le trajet se mesure ici, au moment du clic
    const depart = carte.current?.getBoundingClientRect();
    const arrivee = bouton.getBoundingClientRect();
    setEnvol(depart ? {
      dx: Math.round(arrivee.left + arrivee.width / 2 - depart.left - depart.width / 2),
      dy: Math.round(arrivee.top + arrivee.height / 2 - depart.top - depart.height / 2),
    } : null);
    setChoisie(cle);
    if (cle === tour.bonne) setBonnes(bonnes + 1);
  };

  return (
    <>
      <BandeauJeu>
        <Compteur nom="Question" valeur={rang + 1} suite={`sur ${total}`} />
        <Compteur nom="Score" valeur={score} />
      </BandeauJeu>
      <div aria-live="polite">
        <div key={rang} ref={carte} className={`carte jeu-question ${envol ? "jeu-envol" : "apparait"}`}
          style={envol ? ({ "--jeu-dx": `${envol.dx}px`, "--jeu-dy": `${envol.dy}px` } as CSSProperties) : undefined}>
          <span className="jeu-etiquette">Question de cours</span>
          <ContenuHtml bloc className="jeu-question-titre" html={tour.question.titre} />
        </div>
      </div>
      <OptionsJeu nom="Chapitres proposés" options={tour.options} bonne={tour.bonne} choisie={choisie} repond={repond} />
      <Annonce verdict={!repondu ? null : juste ? "bon" : "faux"} titre={juste ? "Bonne réponse" : "Ce n'est pas ça"}>
        {!juste && <span>C&apos;est le chapitre {tour.bonne}.</span>}
      </Annonce>
    </>
  );
}

/**
 * Quel chapitre ? Dix questions au plus ; il faut au moins deux chapitres et quatre questions.
 * Score : arrondi de 100 × bonnes réponses / nombre de questions, soit 10 points par bonne réponse quand il y a dix questions.
 */
export default function QuelChapitre({ questions, chapitres, graine, fin, retour }: {
  questions: QuestionChapitre[]; chapitres: ChapitreJeu[]; graine: number; fin: FinDePartie; retour: string;
}) {
  const distincts = chapitresDistincts(chapitres);
  // une question dont le chapitre n'est pas proposé n'aurait pas de bonne réponse
  const jouables = questions.filter((q) => distincts.some((c) => c.num === q.fiche));
  const manque = distincts.length < 2 ? "Choisis au moins deux chapitres pour ce jeu."
    : jouables.length < MINIMUM ? "Pas assez de questions pour ce jeu." : null;
  return (
    <CadreJeu graine={graine} fin={fin} retour={retour} manque={manque}>
      <Plateau questions={jouables} chapitres={distincts} />
    </CadreJeu>
  );
}
