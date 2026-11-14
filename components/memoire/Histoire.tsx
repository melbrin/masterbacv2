"use client";

// L'histoire : un court texte à lire, puis cinq questions à choix sur ses détails. Trois histoires par partie,
// de plus en plus longues. Le déroulé est dans lib/commun/memoire/histoire.ts.

import { useReducer, useState } from "react";
import { Annonce, BandeauJeu, Compteur, prendFocus, useChrono, useDelai, usePartie, ViesJeu } from "@/components/jeux/CadreJeu";
import { pluriel } from "@/lib/commun/format";
import type { PropsMemoire } from "@/lib/commun/memoire";
import {
  avanceHistoire, DEPART_HISTOIRE, histoireFinie, histoiresDePartie, PHRASES_HISTOIRE, QUESTIONS_HISTOIRE, QUESTIONS_PAR_HISTOIRE,
} from "@/lib/commun/memoire/histoire";
import { ERREURS_MAX, scoreSur } from "@/lib/commun/memoire/regles";
import { CadreMemoire, Choix, Points, Sablier } from "./Commun";

/** Le temps de lecture au plus, en millisecondes : sept secondes par phrase. L'élève peut passer aux questions avant. */
const lecture = (phrases: number) => 7000 * phrases;
/** Le temps pendant lequel une bonne réponse reste montrée avant la suite, en millisecondes. */
const PAUSE_JUSTE = 1100;

function Plateau() {
  const partie = usePartie();
  const lis = useChrono();
  // les trois histoires sont écrites une fois, quand le plateau apparaît
  const [histoires] = useState(() => histoiresDePartie(partie.graine));
  const [etat, agit] = useReducer(avanceHistoire, DEPART_HISTOIRE);
  const histoire = histoires[etat.histoire];
  const question = histoire.questions[etat.question];
  const repondu = etat.phase === "question" && etat.choisie !== null;
  const juste = repondu && etat.choisie === question.bonne;
  const finie = histoireFinie(etat);

  const suite = () => {
    if (!finie) { agit({ type: "suite", histoire: etat.histoire, question: etat.question }); return; }
    partie.termine(scoreSur(etat.bonnes, QUESTIONS_HISTOIRE), lis(),
      `${pluriel(etat.bonnes, "bonne réponse", "bonnes réponses")} sur ${QUESTIONS_HISTOIRE} questions.`);
  };
  // le temps de lecture est écoulé : les questions arrivent
  useDelai(etat.phase === "lecture" ? `lecture-${etat.histoire}` : null, lecture(histoire.phrases.length), () => agit({ type: "questions", histoire: etat.histoire }));
  // une bonne réponse reste montrée un instant ; après une erreur, l'élève continue quand il veut
  useDelai(juste ? `juste-${etat.histoire}-${etat.question}` : null, PAUSE_JUSTE, suite);

  return (
    <>
      <BandeauJeu>
        <Compteur nom="Histoire" valeur={etat.histoire + 1} suite={`sur ${PHRASES_HISTOIRE.length}`} />
        <Compteur nom="Bonnes réponses" valeur={etat.bonnes} />
        <ViesJeu reste={ERREURS_MAX - etat.erreurs} total={ERREURS_MAX} />
      </BandeauJeu>
      {etat.phase === "lecture" ? (
        <>
          <div key={`lecture-${etat.histoire}`} className="carte mem-scene mem-recit" data-phase="lecture" tabIndex={-1} ref={etat.histoire > 0 ? prendFocus : undefined}>
            <Sablier ms={lecture(histoire.phrases.length)} />
            <p className="jeu-etiquette">Lis et retiens les détails</p>
            <p className="mem-recit-texte">{histoire.phrases.join(" ")}</p>
          </div>
          <div className="mem-verdict">
            <Annonce verdict={null} titre="" />
            <button type="button" className="btn btn-cuivre mem-suite" onClick={() => agit({ type: "questions", histoire: etat.histoire })}>Passer aux questions</button>
          </div>
        </>
      ) : (
        <>
          <div key={`question-${etat.histoire}`} className="carte mem-scene mem-scene-question" data-phase={repondu ? "verdict" : "question"} tabIndex={-1} ref={prendFocus}>
            <p className="jeu-etiquette">Question {etat.question + 1} sur {QUESTIONS_PAR_HISTOIRE}</p>
            <p className="mem-question" aria-live="polite">{question.question}</p>
            <Points total={QUESTIONS_PAR_HISTOIRE} rang={etat.question} />
          </div>
          <div className="mem-verdict">
            <Annonce verdict={!repondu ? null : juste ? "bon" : "faux"} titre={juste ? "Juste" : "Ce n'est pas ça"}>
              {!juste && <span>La bonne réponse&nbsp;: <b>{question.bonne}</b>.</span>}
            </Annonce>
            {repondu && !juste && (
              <button type="button" className="btn btn-cuivre mem-suite" ref={prendFocus} onClick={suite}>{finie ? "Voir mon score" : "Continuer"}</button>
            )}
          </div>
          <Choix nom="Réponses proposées" options={question.choix.map((choix) => ({ cle: choix, contenu: choix }))} bonne={question.bonne}
            choisie={etat.choisie ?? undefined}
            repond={(choix) => agit({ type: "reponse", histoire: etat.histoire, question: etat.question, choix, juste: choix === question.bonne })} />
        </>
      )}
    </>
  );
}

/**
 * L'histoire. Trois histoires de 4, 5 puis 6 phrases, fabriquées à partir de modèles et de détails tirés avec la graine,
 * et cinq questions à choix par histoire. Chaque mauvaise réponse est une erreur : la partie s'arrête à la deuxième.
 * Score : la part des bonnes réponses sur les quinze questions, sur 100.
 */
export default function Histoire(props: PropsMemoire) {
  return (
    <CadreMemoire {...props} jeu="histoire" niveaux="3 histoires, 15 questions"
      consigne={["Une courte histoire s'affiche\u00a0: lis-la avec attention.", "Ensuite, réponds à cinq questions sur ses détails."]}>
      <Plateau />
    </CadreMemoire>
  );
}
