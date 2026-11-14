"use client";

// Un tour en arrière : des symboles défilent un par un. Pour chacun, l'élève dit s'il est le même que celui
// d'il y a un tour, puis deux, puis trois. Une faute est permise par défilé ; à la deuxième, la manche est perdue.

import { useState } from "react";
import { prendFocus, useDelai } from "@/components/jeux/CadreJeu";
import type { PropsMemoire } from "@/lib/commun/memoire";
import { FORMES } from "@/lib/commun/memoire/formes";
import { bilanNiveaux } from "@/lib/commun/memoire/regles";
import { defileRetour, estRetour, FAUTES_RETOUR, NIVEAUX_RETOUR, type NiveauRetour } from "@/lib/commun/memoire/suites";
import { BandeauManches, CadreMemoire, FormeTrait, Points, useManches, Verdict, type Manches } from "./Commun";

/** Les six symboles du défilé : des formes au trait, sans couleur. */
const SYMBOLES = FORMES.slice(0, 6);
/** Les durées, en millisecondes : l'attente du départ, un symbole à regarder, le blanc entre deux symboles, la réponse montrée. */
const AMORCE = 700;
const REGARD = 1100;
const BLANC = 200;
const RETOUR = 450;

const TOURS = ["", "un tour", "deux tours", "trois tours"];
const question = (recul: number) => (recul === 1 ? "Le même que le précédent\u00a0?" : `Le même qu'il y a ${TOURS[recul]}\u00a0?`);

function Manche({ m, niveau }: { m: Manches; niveau: NiveauRetour }) {
  const suite = defileRetour(m.graine, niveau, SYMBOLES.length);
  /** le rang du symbole en cours */
  const [rang, setRang] = useState(0);
  /** vrai pendant le blanc qui précède le symbole */
  const [blanc, setBlanc] = useState(true);
  const [fautes, setFautes] = useState(0);
  /** la réponse donnée au symbole en cours : juste ou non ; null tant que l'élève n'a pas répondu */
  const [reponse, setReponse] = useState<boolean | null>(null);
  /** les premiers symboles n'ont pas encore de symbole à qui les comparer : l'élève les regarde */
  const aRegarder = rang < niveau.recul;
  const pareil = estRetour(suite, rang, niveau.recul);

  const suivant = () => {
    setRang(rang + 1);
    setBlanc(true);
    setReponse(null);
    if (rang + 1 === niveau.recul) m.rappelle();
  };
  useDelai(blanc ? `blanc-${rang}` : null, rang === 0 ? AMORCE : BLANC, () => setBlanc(false));
  useDelai(!blanc && aRegarder ? `regard-${rang}` : null, REGARD, suivant);
  useDelai(m.phase === "rappel" && reponse !== null ? `reponse-${rang}` : null, RETOUR, suivant);

  const repond = (dit: boolean) => {
    if (m.phase !== "rappel" || blanc || reponse !== null) return;
    const juste = dit === pareil;
    const total = fautes + (juste ? 0 : 1);
    setReponse(juste);
    setFautes(total);
    if (total > FAUTES_RETOUR) m.juge(false);
    else if (rang + 1 === niveau.longueur) m.juge(true);
  };
  const actif = m.phase === "rappel" && !blanc && reponse === null;
  const symbole = SYMBOLES[suite[rang]];

  return (
    <>
      <div className="carte mem-scene" data-phase={m.phase} tabIndex={-1} ref={m.rang > 0 ? prendFocus : undefined}>
        <p className="jeu-etiquette">{aRegarder ? "Regarde" : question(niveau.recul)}</p>
        <div className="mem-vedette mem-symbole" aria-live="polite" aria-atomic="true">
          {!blanc && <span key={rang} className="mem-pop" data-repere={symbole.mot}><FormeTrait forme={symbole.id} /><span className="jeu-sr">{symbole.mot}</span></span>}
        </div>
        <Points total={niveau.longueur} rang={rang} />
        <p className="mem-aide" role="status">
          {reponse === null ? (fautes < FAUTES_RETOUR ? "Une faute est permise." : "Plus de faute permise.")
            : reponse ? "Juste." : `Faute\u00a0: ${pareil ? "c'était le même" : "ce n'était pas le même"}.`}
        </p>
      </div>
      <Verdict m={m} juste="Défilé réussi" faux="Deux fautes">
        {!m.juste && <span>Le dernier symbole {pareil ? "était le même" : "n'était pas le même"} qu&apos;il y a {TOURS[niveau.recul]}.</span>}
      </Verdict>
      <div className="mem-deux" role="group" aria-label="Ta réponse">
        <button type="button" className="btn btn-ligne mem-grand" aria-disabled={!actif} onClick={() => repond(true)}>Le même</button>
        <button type="button" className="btn btn-ligne mem-grand" aria-disabled={!actif} onClick={() => repond(false)}>Pas le même</button>
      </div>
    </>
  );
}

function Plateau() {
  const m = useManches(NIVEAUX_RETOUR.length, (reussis) => bilanNiveaux(NIVEAUX_RETOUR.map((_, i) => i), reussis,
    (i) => `Tu as tenu un défilé de ${NIVEAUX_RETOUR[i].longueur} symboles, ${TOURS[NIVEAUX_RETOUR[i].recul]} en arrière.`,
    "Aucun défilé tenu jusqu'au bout cette fois."));
  const niveau = NIVEAUX_RETOUR[m.niveau];
  return (
    <>
      <BandeauManches m={m} enjeu={`${TOURS[niveau.recul]} en arrière`} />
      <Manche key={m.rang} m={m} niveau={niveau} />
    </>
  );
}

/**
 * Un tour en arrière. Six niveaux : comparer chaque symbole à celui d'il y a un tour (8 puis 12 symboles), deux tours
 * (10 puis 14), trois tours (12 puis 16). Une faute est permise par défilé. La partie s'arrête au deuxième défilé perdu.
 * Score : la part des six niveaux réussis, sur 100.
 */
export default function Retour(props: PropsMemoire) {
  return (
    <CadreMemoire {...props} jeu="retour" niveaux="1, 2 puis 3 tours en arrière"
      consigne={["Des symboles défilent, un par un.", "Dis si chacun est le même que celui d'un tour avant, puis de deux, puis de trois."]}>
      <Plateau />
    </CadreMemoire>
  );
}
