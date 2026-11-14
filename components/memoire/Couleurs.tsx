"use client";

// Suite de couleurs : quatre touches, chacune d'une couleur et d'un symbole. Une suite s'allume, touche après touche ;
// l'élève la rejoue. La suite garde son début et gagne une touche à chaque tour.

import { useState } from "react";
import Icone from "@/components/appli/Icone";
import { prendFocus, useDelai } from "@/components/jeux/CadreJeu";
import { pluriel } from "@/lib/commun/format";
import type { PropsMemoire } from "@/lib/commun/memoire";
import { forme, teinte, TOUCHES } from "@/lib/commun/memoire/formes";
import { bilanNiveaux } from "@/lib/commun/memoire/regles";
import { NIVEAUX_COULEURS, suiteTouches } from "@/lib/commun/memoire/suites";
import { BandeauManches, CadreMemoire, FormeDessin, Points, useDefile, useManches, Verdict, type Manches, type Rythme } from "./Commun";

/** Une touche s'allume un peu moins d'une demi-seconde, puis s'éteint avant la suivante. */
const RYTHME: Rythme = { amorce: 700, montre: 460, blanc: 170 };
/** Le temps pendant lequel une touche reste allumée après un appui, en millisecondes. */
const APPUI = 240;

const nomTouche = (rang: number) => `${teinte(TOUCHES[rang].teinte).nom}, ${forme(TOUCHES[rang].forme).mot}`;

// Une manche : la suite s'allume, puis l'élève la rejoue. La première touche fausse arrête la manche.
function Manche({ m, suite }: { m: Manches; suite: number[] }) {
  /** le nombre de touches déjà rejouées */
  const [rejouees, setRejouees] = useState(0);
  /** la touche que l'élève vient de toucher, allumée un court moment */
  const [appui, setAppui] = useState<{ touche: number; coup: number } | null>(null);
  /** la touche touchée à tort */
  const [fausse, setFausse] = useState<number | null>(null);
  const { rang: montre, vus } = useDefile(suite.length, m.phase === "memorise", m.rappelle, RYTHME);
  useDelai(appui ? appui.coup : null, APPUI, () => setAppui(null));
  const allumee = m.phase === "memorise" ? (montre !== null ? suite[montre] : null) : appui?.touche ?? null;

  const touche = (rang: number) => {
    if (m.phase !== "rappel") return;
    setAppui({ touche: rang, coup: rejouees });
    if (rang !== suite[rejouees]) { setFausse(rang); m.juge(false); return; }
    if (rejouees + 1 === suite.length) m.juge(true);
    setRejouees(rejouees + 1);
  };

  return (
    <>
      <div className="carte mem-scene mem-scene-basse" data-phase={m.phase} tabIndex={-1} ref={m.rang > 0 ? prendFocus : undefined}>
        {m.phase === "memorise" && (
          <>
            <p className="jeu-etiquette">Regarde</p>
            <Points total={suite.length} rang={montre} vus={vus} />
            <span className="jeu-sr" aria-live="assertive">{montre !== null ? nomTouche(suite[montre]) : ""}</span>
          </>
        )}
        {m.phase === "rappel" && (
          <>
            <p className="jeu-etiquette">À toi</p>
            <Points total={suite.length} rang={rejouees} />
          </>
        )}
        {m.phase === "verdict" && (
          <>
            <p className="jeu-etiquette">La suite</p>
            <ol className="mem-symboles" aria-label="La suite à rejouer">
              {suite.map((rang, i) => (
                <li key={i} className={!m.juste && i === rejouees ? "mem-symbole-ici" : undefined}>
                  <FormeDessin {...TOUCHES[rang]} pleine /><span className="jeu-sr">{nomTouche(rang)}{!m.juste && i === rejouees ? " : la touche qu'il fallait" : ""}</span>
                </li>
              ))}
            </ol>
            {!m.juste && <p className="mem-aide">La touche entourée est celle qu&apos;il fallait.</p>}
          </>
        )}
      </div>
      <Verdict m={m} />
      <div className="mem-pad" role="group" aria-label="Touches">
        {TOUCHES.map((t, rang) => (
          <button key={rang} type="button" aria-disabled={m.phase !== "rappel"} aria-label={nomTouche(rang)} onClick={() => touche(rang)}
            className={`mem-couleur mem-teinte-${t.teinte}${allumee === rang ? " mem-allumee" : ""}${fausse === rang ? " mem-couleur-fausse" : ""}`}>
            <FormeDessin {...t} pleine />
            {fausse === rang && <span className="jeu-marque jeu-marque-ko mem-option-marque"><Icone nom="croix" /><span className="jeu-sr">Ta réponse</span></span>}
          </button>
        ))}
      </div>
    </>
  );
}

function Plateau() {
  const m = useManches(NIVEAUX_COULEURS.length, (reussis) => bilanNiveaux(NIVEAUX_COULEURS, reussis,
    (n) => `Tu as rejoué une suite de ${n} touches.`, "Aucune suite rejouée cette fois."));
  const longueur = NIVEAUX_COULEURS[m.niveau];
  // la suite est celle de la partie, pas de la manche : chaque tour en rejoue le début, une touche plus loin
  const suite = suiteTouches(m.grainePartie, longueur);
  return (
    <>
      <BandeauManches m={m} enjeu={pluriel(longueur, "touche", "touches")} />
      <Manche key={m.rang} m={m} suite={suite} />
    </>
  );
}

/**
 * Suite de couleurs. La suite commence à 3 touches et s'allonge d'une touche à chaque tour réussi, jusqu'à 12.
 * Après une erreur, la même suite se rejoue ; la deuxième erreur arrête la partie. Score : 10 points par longueur réussie.
 */
export default function Couleurs(props: PropsMemoire) {
  return (
    <CadreMemoire {...props} jeu="couleurs" niveaux="De 3 à 12 touches"
      consigne={["Des touches s'allument l'une après l'autre.", "Rejoue la suite dans le même ordre\u00a0: elle s'allonge à chaque tour."]}>
      <Plateau />
    </CadreMemoire>
  );
}
