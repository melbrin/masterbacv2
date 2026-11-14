"use client";

// Calcul en chaîne : un nombre, puis des opérations affichées une à une. L'élève garde le total en tête
// et saisit le résultat final sur le pavé numérique.

import { useState } from "react";
import { prendFocus } from "@/components/jeux/CadreJeu";
import { pluriel } from "@/lib/commun/format";
import type { PropsMemoire } from "@/lib/commun/memoire";
import { bilanNiveaux } from "@/lib/commun/memoire/regles";
import { chaineCalcul, ditOperation, NIVEAUX_CALCUL } from "@/lib/commun/memoire/suites";
import { BandeauManches, CadreMemoire, Pave, Points, useDefile, useManches, Verdict, type Manches, type Rythme } from "./Commun";

/** Chaque opération reste un peu moins de deux secondes : le temps de la faire de tête. */
const RYTHME: Rythme = { amorce: 700, montre: 1850, blanc: 300 };

// Une manche : le nombre de départ et les opérations défilent, puis l'élève saisit le résultat.
function Manche({ m, longueur }: { m: Manches; longueur: number }) {
  const chaine = chaineCalcul(m.graine, longueur);
  /** la réponse en cours de saisie : deux chiffres au plus */
  const [saisie, setSaisie] = useState("");
  // le premier élément du défilé est le nombre de départ, les suivants sont les opérations
  const { rang: montre, vus } = useDefile(longueur + 1, m.phase === "memorise", m.rappelle, RYTHME);
  return (
    <>
      <div className="carte mem-scene" data-phase={m.phase} tabIndex={-1} ref={m.rang > 0 ? prendFocus : undefined}>
        {m.phase === "memorise" && (
          <>
            <p className="jeu-etiquette">{montre === 0 || montre === null ? "Pars de" : "Calcule de tête"}</p>
            <div className="mem-vedette chiffres" aria-live="polite" aria-atomic="true">
              {montre !== null && <span key={montre} className="mem-pop">{montre === 0 ? chaine.depart : ditOperation(chaine.operations[montre - 1])}</span>}
            </div>
            <Points total={longueur + 1} rang={montre} vus={vus} />
          </>
        )}
        {m.phase === "rappel" && (
          <>
            <p className="jeu-etiquette">Ton résultat</p>
            <div className="mem-vedette chiffres mem-resultat" role="img" aria-label={`Ta réponse\u00a0: ${saisie || "rien pour l'instant"}`}>{saisie || "?"}</div>
            <p className="mem-aide">Tape le total, puis valide.</p>
          </>
        )}
        {m.phase === "verdict" && (
          <>
            <p className="jeu-etiquette">Le calcul</p>
            <ol className="mem-etapes" aria-label="Le calcul, étape par étape">
              <li>{chaine.depart}</li>
              {chaine.operations.map((o, i) => (
                <li key={i} className={i === longueur - 1 ? "mem-etape-finale" : undefined}>{ditOperation(o)} = <b>{o.total}</b></li>
              ))}
            </ol>
            {!m.juste && <p className="mem-aide">Ta réponse&nbsp;: <span className="mem-barre">{saisie}</span></p>}
          </>
        )}
      </div>
      <Verdict m={m} />
      <Pave actif={m.phase === "rappel"} vide={saisie === ""} plein={saisie.length >= 2} pret={saisie !== ""}
        tape={(chiffre) => setSaisie(saisie === "0" ? chiffre : saisie + chiffre)} efface={() => setSaisie(saisie.slice(0, -1))}
        valide={() => m.juge(Number(saisie) === chaine.resultat)} />
    </>
  );
}

function Plateau() {
  const m = useManches(NIVEAUX_CALCUL.length, (reussis) => bilanNiveaux(NIVEAUX_CALCUL, reussis,
    (n) => `Tu as tenu une chaîne de ${n} opérations.`, "Aucune chaîne tenue jusqu'au bout cette fois."));
  const longueur = NIVEAUX_CALCUL[m.niveau];
  return (
    <>
      <BandeauManches m={m} enjeu={pluriel(longueur, "opération", "opérations")} />
      <Manche key={m.rang} m={m} longueur={longueur} />
    </>
  );
}

/**
 * Calcul en chaîne. De 2 à 8 opérations (ajouter ou retirer de 2 à 9, multiplier par 2 ou 3), totaux entre 0 et 99.
 * La partie s'arrête à la deuxième erreur. Score : la part des sept longueurs réussies, sur 100.
 */
export default function Calcul(props: PropsMemoire) {
  return (
    <CadreMemoire {...props} jeu="calcul" niveaux="De 2 à 8 opérations"
      consigne={["Un nombre s'affiche, puis des opérations, une à une.", "Fais chaque calcul de tête et tape le résultat final."]}>
      <Plateau />
    </CadreMemoire>
  );
}
