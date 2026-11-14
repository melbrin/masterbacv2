"use client";

// Suite de chiffres : des chiffres affichés un par un, un par seconde, à taper dans l'ordre sur le pavé numérique.
// Le plateau sert aussi à « À l'envers » (Envers.tsx), où la suite se tape du dernier chiffre au premier.

import { useState } from "react";
import { prendFocus } from "@/components/jeux/CadreJeu";
import { pluriel } from "@/lib/commun/format";
import type { PropsMemoire } from "@/lib/commun/memoire";
import { bilanNiveaux } from "@/lib/commun/memoire/regles";
import { aLEnvers, NIVEAUX_CHIFFRES, suiteChiffres } from "@/lib/commun/memoire/suites";
import { memeSuite } from "@/lib/commun/memoire/tirage";
import { BandeauManches, CadreMemoire, Pave, Points, Saisie, useDefile, useManches, Verdict, type Manches } from "./Commun";

// Une manche : les chiffres défilent, l'élève tape sa réponse, puis lit le verdict.
function Manche({ m, longueur, envers }: { m: Manches; longueur: number; envers: boolean }) {
  const suite = suiteChiffres(m.graine, longueur);
  const attendu = envers ? aLEnvers(suite) : suite;
  const [saisie, setSaisie] = useState<number[]>([]);
  const { rang: montre, vus } = useDefile(longueur, m.phase === "memorise", m.rappelle);
  return (
    <>
      <div className="carte mem-scene" data-phase={m.phase} tabIndex={-1} ref={m.rang > 0 ? prendFocus : undefined}>
        {m.phase === "memorise" && (
          <>
            <p className="jeu-etiquette">Retiens</p>
            <div className="mem-vedette chiffres" aria-live="polite" aria-atomic="true">
              {montre !== null && <span key={montre} className="mem-pop">{suite[montre]}</span>}
            </div>
            <Points total={longueur} rang={montre} vus={vus} />
          </>
        )}
        {m.phase === "rappel" && (
          <>
            <p className="jeu-etiquette">À toi</p>
            <Saisie nom="Ta réponse" total={longueur} valeur={saisie} />
            <p className="mem-aide">{envers ? "Du dernier chiffre au premier." : "Dans l'ordre où tu les as vus."}</p>
          </>
        )}
        {m.phase === "verdict" && (
          <>
            {envers && <p className="mem-aide">La suite montrée&nbsp;: <b className="mem-rappel-suite chiffres">{suite.join(" ")}</b></p>}
            <p className="jeu-etiquette">{envers ? "À l'envers" : "La suite"}</p>
            <Saisie nom={envers ? "La suite à l'envers" : "La suite"} total={longueur} valeur={attendu} juste />
            {!m.juste && (
              <>
                <p className="jeu-etiquette">Ta réponse</p>
                <Saisie nom="Ta réponse" total={longueur} valeur={saisie} attendu={attendu} />
              </>
            )}
          </>
        )}
      </div>
      <Verdict m={m} />
      <Pave actif={m.phase === "rappel"} vide={saisie.length === 0} plein={saisie.length >= longueur} pret={saisie.length >= longueur}
        tape={(chiffre) => setSaisie([...saisie, Number(chiffre)])} efface={() => setSaisie(saisie.slice(0, -1))}
        valide={() => m.juge(memeSuite(saisie, attendu))} />
    </>
  );
}

/** Le plateau des deux jeux de chiffres : `niveaux` donne les longueurs jouées, `envers` le sens de la réponse. */
export function PlateauChiffres({ niveaux, envers }: { niveaux: readonly number[]; envers: boolean }) {
  const m = useManches(niveaux.length, (reussis) => bilanNiveaux(niveaux, reussis,
    (n) => (envers ? `Tu as redonné à l'envers une suite de ${n} chiffres.` : `Tu as retenu une suite de ${n} chiffres.`),
    "Aucune suite retenue cette fois."));
  const longueur = niveaux[m.niveau];
  return (
    <>
      <BandeauManches m={m} enjeu={pluriel(longueur, "chiffre", "chiffres")} />
      {/* la clé monte une manche neuve à chaque tirage : sa saisie et son défilé repartent de zéro */}
      <Manche key={m.rang} m={m} longueur={longueur} envers={envers} />
    </>
  );
}

/**
 * Suite de chiffres. De 3 à 12 chiffres, un par seconde. Une suite réussie en donne une plus longue d'un chiffre ;
 * la partie s'arrête à la deuxième erreur. Score : 10 points par longueur réussie.
 */
export default function Chiffres(props: PropsMemoire) {
  return (
    <CadreMemoire {...props} jeu="chiffres" niveaux="De 3 à 12 chiffres"
      consigne={["Des chiffres s'affichent un par un.", "Retiens-les, puis tape-les dans le même ordre."]}>
      <PlateauChiffres niveaux={NIVEAUX_CHIFFRES} envers={false} />
    </CadreMemoire>
  );
}
