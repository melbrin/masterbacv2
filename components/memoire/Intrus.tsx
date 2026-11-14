"use client";

// L'intrus : une planche de pictogrammes à mémoriser. Sur la planche suivante, les mêmes objets reviennent mélangés,
// sauf un, remplacé par un objet nouveau : l'élève le touche.

import { useState } from "react";
import { prendFocus } from "@/components/jeux/CadreJeu";
import { pluriel } from "@/lib/commun/format";
import type { PropsMemoire } from "@/lib/commun/memoire";
import { NIVEAUX_INTRUS, plancheIntrus } from "@/lib/commun/memoire/images";
import { duPicto, nomPicto, picto } from "@/lib/commun/memoire/pictos";
import { bilanNiveaux } from "@/lib/commun/memoire/regles";
import { BandeauManches, CadreMemoire, Grille, Picto, Sablier, useExposition, useManches, Verdict, type CaseGrille, type Manches } from "./Commun";

/** Le temps pour regarder, en millisecondes. */
const regard = (nombre: number) => 1200 + 650 * nombre;
/** L'écran vide entre les deux planches, en millisecondes. */
const BLANC = 500;
/** Trois colonnes jusqu'à six objets, quatre ensuite. */
const colonnes = (nombre: number) => (nombre <= 6 ? 3 : 4);

function Manche({ m, nombre }: { m: Manches; nombre: number }) {
  const planche = plancheIntrus(m.graine, nombre);
  const [touchee, setTouchee] = useState<string | null>(null);
  const etape = useExposition(m.phase === "memorise", regard(nombre), m.rappelle, BLANC);
  const touche = (rang: number) => {
    if (m.phase !== "rappel") return;
    setTouchee(planche.apres[rang]);
    m.juge(planche.apres[rang] === planche.intrus);
  };
  const montres = m.phase === "memorise" ? planche.avant : planche.apres;
  const grille = montres.map((id): CaseGrille => {
    if (m.phase === "memorise" && etape !== "montre") return {};
    const dessin = { contenu: <Picto id={id} />, dit: picto(id).mot };
    if (m.phase !== "verdict") return dessin;
    if (id === planche.intrus) return { ton: m.juste ? "juste" : "oubliee", ...dessin };
    return id === touchee ? { ton: "fausse", ...dessin } : dessin;
  });
  return (
    <>
      <div className="carte mem-scene mem-scene-grille" data-phase={m.phase} tabIndex={-1} ref={m.rang > 0 ? prendFocus : undefined}>
        {etape === "montre" && m.phase === "memorise" && <Sablier ms={regard(nombre)} />}
        <p className="jeu-etiquette" aria-live="polite">
          {m.phase === "memorise" ? "Retiens ces objets" : m.phase === "rappel" ? "Touche l'objet nouveau" : "L'objet nouveau"}
        </p>
        <Grille nom="Planche d'objets" colonnes={colonnes(nombre)} cases={grille} actif={m.phase === "rappel"} touche={touche} />
      </div>
      <Verdict m={m}>{m.phase === "verdict" && <span>L&apos;intrus&nbsp;: {nomPicto(planche.intrus)}, à la place {duPicto(planche.parti)}.</span>}</Verdict>
    </>
  );
}

function Plateau() {
  const m = useManches(NIVEAUX_INTRUS.length, (reussis) => bilanNiveaux(NIVEAUX_INTRUS, reussis,
    (n) => `Tu as repéré l'intrus sur une planche de ${n} objets.`, "Aucun intrus repéré cette fois."));
  const nombre = NIVEAUX_INTRUS[m.niveau];
  return (
    <>
      <BandeauManches m={m} enjeu={pluriel(nombre, "objet", "objets")} />
      <Manche key={m.rang} m={m} nombre={nombre} />
    </>
  );
}

/**
 * L'intrus. De 5 à 12 objets montrés quelques secondes ; sur la planche suivante, un seul objet est nouveau.
 * La partie s'arrête à la deuxième erreur. Score : la part des huit nombres d'objets réussis, sur 100.
 */
export default function Intrus(props: PropsMemoire) {
  return (
    <CadreMemoire {...props} jeu="intrus" niveaux="De 5 à 12 objets"
      consigne={["Une planche d'objets s'affiche quelques secondes.", "Sur la planche suivante, un seul objet est nouveau\u00a0: touche-le."]}>
      <Plateau />
    </CadreMemoire>
  );
}
