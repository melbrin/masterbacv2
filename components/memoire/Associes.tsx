"use client";

// Mots associés : des paires de mots sans rapport, montrées une à une. Ensuite, pour chaque premier mot,
// l'élève retrouve le second parmi quatre. La première erreur arrête la manche.

import { prendFocus } from "@/components/jeux/CadreJeu";
import { pluriel } from "@/lib/commun/format";
import type { PropsMemoire } from "@/lib/commun/memoire";
import { motsAssocies, NIVEAUX_ASSOCIES } from "@/lib/commun/memoire/mots";
import { bilanNiveaux } from "@/lib/commun/memoire/regles";
import { BandeauManches, CadreMemoire, Choix, Points, useDefile, useManches, useQuestions, Verdict, type Manches, type Rythme } from "./Commun";

/** Chaque paire reste un peu plus de deux secondes : le temps de lier les deux mots. */
const RYTHME: Rythme = { amorce: 700, montre: 2300, blanc: 300 };

function Manche({ m, nombre }: { m: Manches; nombre: number }) {
  const { paires, questions } = motsAssocies(m.graine, nombre);
  const { rang: montre, vus } = useDefile(nombre, m.phase === "memorise", m.rappelle, RYTHME);
  const { rang, choisie, repond } = useQuestions(m, nombre);
  const question = questions[rang];

  return (
    <>
      <div className="carte mem-scene" data-phase={m.phase} tabIndex={-1} ref={m.rang > 0 ? prendFocus : undefined}>
        {m.phase === "memorise" ? (
          <>
            <p className="jeu-etiquette">Retiens ces deux mots ensemble</p>
            <div className="mem-paire" aria-live="polite" aria-atomic="true">
              {montre !== null && (
                <span key={montre} className="mem-pop">
                  <b>{paires[montre][0]}</b><span className="mem-paire-lien" aria-hidden="true">+</span><span className="jeu-sr"> avec </span><b>{paires[montre][1]}</b>
                </span>
              )}
            </div>
            <Points total={nombre} rang={montre} vus={vus} />
          </>
        ) : (
          <>
            <p className="jeu-etiquette">Quel mot allait avec</p>
            <p className="mem-vedette mem-vedette-mot" aria-live="polite">{question.premier}&nbsp;?</p>
            <Points total={nombre} rang={rang} />
          </>
        )}
      </div>
      <Verdict m={m}>{!m.juste && <span><b>{question.premier}</b> allait avec <b>{question.second}</b>.</span>}</Verdict>
      {m.phase !== "memorise" && (
        <Choix nom="Mots proposés" options={question.choix.map((mot) => ({ cle: mot, contenu: mot }))} bonne={question.second} choisie={choisie}
          repond={(mot) => repond(mot, question.second)} />
      )}
    </>
  );
}

function Plateau() {
  const m = useManches(NIVEAUX_ASSOCIES.length, (reussis) => bilanNiveaux(NIVEAUX_ASSOCIES, reussis,
    (n) => `Tu as retenu ${n} paires de mots.`, "Aucune série de paires retenue en entier cette fois."));
  const nombre = NIVEAUX_ASSOCIES[m.niveau];
  return (
    <>
      <BandeauManches m={m} enjeu={pluriel(nombre, "paire", "paires")} />
      <Manche key={m.rang} m={m} nombre={nombre} />
    </>
  );
}

/**
 * Mots associés. De 4 à 8 paires de mots sans rapport, une paire à la fois. Ensuite une question par paire :
 * retrouver le second mot parmi quatre seconds mots de la manche. La partie s'arrête à la deuxième erreur.
 * Score : 20 points par nombre de paires réussi.
 */
export default function Associes(props: PropsMemoire) {
  return (
    <CadreMemoire {...props} jeu="associes" niveaux="De 4 à 8 paires"
      consigne={["Des paires de mots sans rapport s'affichent, une à une.", "Ensuite, pour chaque premier mot, retrouve le second."]}>
      <Plateau />
    </CadreMemoire>
  );
}
