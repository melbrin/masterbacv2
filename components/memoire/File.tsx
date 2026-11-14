"use client";

// Les mots dans l'ordre : des mots affichés un par un. Ils reviennent mélangés ; l'élève les touche dans l'ordre
// où il les a vus. Le premier mot touché à tort arrête la manche.

import { useState } from "react";
import Icone from "@/components/appli/Icone";
import { prendFocus } from "@/components/jeux/CadreJeu";
import { pluriel } from "@/lib/commun/format";
import type { PropsMemoire } from "@/lib/commun/memoire";
import { fileMots, NIVEAUX_FILE } from "@/lib/commun/memoire/mots";
import { bilanNiveaux } from "@/lib/commun/memoire/regles";
import { BandeauManches, CadreMemoire, Points, useDefile, useManches, Verdict, type Manches, type Rythme } from "./Commun";

/** Chaque mot reste un peu plus d'une seconde. */
const RYTHME: Rythme = { amorce: 700, montre: 1150, blanc: 200 };

function Manche({ m, nombre }: { m: Manches; nombre: number }) {
  const { ordre, melanges } = fileMots(m.graine, nombre);
  /** le nombre de mots déjà remis à leur place */
  const [places, setPlaces] = useState(0);
  const [faux, setFaux] = useState<string | null>(null);
  const { rang: montre, vus } = useDefile(nombre, m.phase === "memorise", m.rappelle, RYTHME);

  const touche = (mot: string) => {
    if (m.phase !== "rappel" || ordre.indexOf(mot) < places) return;
    if (mot !== ordre[places]) { setFaux(mot); m.juge(false); return; }
    if (places + 1 === nombre) m.juge(true);
    setPlaces(places + 1);
  };

  return (
    <>
      <div className="carte mem-scene mem-scene-mots" data-phase={m.phase} tabIndex={-1} ref={m.rang > 0 ? prendFocus : undefined}>
        {m.phase === "memorise" ? (
          <>
            <p className="jeu-etiquette">Retiens l&apos;ordre</p>
            <div className="mem-vedette mem-vedette-mot" aria-live="polite" aria-atomic="true">
              {montre !== null && <span key={montre} className="mem-pop">{ordre[montre]}</span>}
            </div>
            <Points total={nombre} rang={montre} vus={vus} />
          </>
        ) : (
          <>
            <p className="jeu-etiquette" aria-live="polite">{m.phase === "rappel" ? `Touche le mot numéro ${places + 1}` : "Les mots dans l'ordre"}</p>
            <div className="mem-mots mem-mots-larges" role="group" aria-label="Mots à remettre dans l'ordre">
              {melanges.map((mot) => {
                const rang = ordre.indexOf(mot);
                const place = rang < places;
                // au verdict, chaque mot montre son numéro : ceux qui restaient à placer sont en pointillé
                const ton = mot === faux ? " jeu-faux" : place ? " jeu-bon" : m.phase === "verdict" ? " mem-mot-oublie" : "";
                return (
                  <button key={mot} type="button" className={`mem-mot${ton}`} aria-disabled={m.phase !== "rappel" || place} onClick={() => touche(mot)}>
                    {(place || m.phase === "verdict") && <span className="mem-mot-rang"><span className="jeu-sr">numéro </span>{rang + 1}</span>}
                    <span>{mot}</span>
                    {mot === faux && <><Icone nom="croix" /><span className="jeu-sr">, ta réponse</span></>}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
      <Verdict m={m}>{!m.juste && <span>Le mot numéro {places + 1} était <b>{ordre[Math.min(places, nombre - 1)]}</b>.</span>}</Verdict>
    </>
  );
}

function Plateau() {
  const m = useManches(NIVEAUX_FILE.length, (reussis) => bilanNiveaux(NIVEAUX_FILE, reussis,
    (n) => `Tu as remis ${n} mots dans l'ordre.`, "Aucune série remise dans l'ordre cette fois."));
  const nombre = NIVEAUX_FILE[m.niveau];
  return (
    <>
      <BandeauManches m={m} enjeu={pluriel(nombre, "mot", "mots")} />
      <Manche key={m.rang} m={m} nombre={nombre} />
    </>
  );
}

/**
 * Les mots dans l'ordre. De 3 à 8 mots, affichés un par un ; ils reviennent mélangés et se touchent dans l'ordre.
 * La partie s'arrête à la deuxième erreur. Score : la part des six longueurs réussies, sur 100.
 */
export default function File(props: PropsMemoire) {
  return (
    <CadreMemoire {...props} jeu="file" niveaux="De 3 à 8 mots"
      consigne={["Des mots s'affichent un par un.", "Ils reviennent mélangés\u00a0: touche-les dans l'ordre où tu les as vus."]}>
      <Plateau />
    </CadreMemoire>
  );
}
