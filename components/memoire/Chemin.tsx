"use client";

// Le chemin : des cases s'allument l'une après l'autre. L'élève refait le chemin en touchant les cases dans l'ordre.
// La première case fausse arrête la manche.

import { useState } from "react";
import { prendFocus } from "@/components/jeux/CadreJeu";
import { pluriel } from "@/lib/commun/format";
import type { PropsMemoire } from "@/lib/commun/memoire";
import { cheminCases, COTE_CHEMIN, NIVEAUX_CHEMIN } from "@/lib/commun/memoire/espace";
import { bilanNiveaux } from "@/lib/commun/memoire/regles";
import { plage } from "@/lib/commun/memoire/tirage";
import { BandeauManches, CadreMemoire, Grille, useDefile, useManches, Verdict, type CaseGrille, type Manches, type Rythme } from "./Commun";

/** Chaque case reste allumée un peu plus d'une demi-seconde. */
const RYTHME: Rythme = { amorce: 700, montre: 620, blanc: 180 };

function Manche({ m, longueur }: { m: Manches; longueur: number }) {
  const chemin = cheminCases(m.graine, longueur);
  /** le nombre de cases déjà retrouvées, dans l'ordre */
  const [faites, setFaites] = useState(0);
  const [fausse, setFausse] = useState<number | null>(null);
  const { rang: montre } = useDefile(longueur, m.phase === "memorise", m.rappelle, RYTHME);

  const touche = (rang: number) => {
    if (m.phase !== "rappel") return;
    if (rang !== chemin[faites]) { setFausse(rang); m.juge(false); return; }
    if (faites + 1 === longueur) m.juge(true);
    setFaites(faites + 1);
  };
  const grille = plage(0, COTE_CHEMIN * COTE_CHEMIN - 1).map((rang): CaseGrille => {
    if (m.phase === "memorise") return montre !== null && chemin[montre] === rang ? { ton: "allumee" } : {};
    const etape = chemin.indexOf(rang);
    const numero = etape >= 0 ? { contenu: etape + 1, dit: `étape ${etape + 1}` } : {};
    if (rang === fausse) return { ton: "fausse", ...(m.phase === "verdict" ? numero : {}) };
    if (etape >= 0 && etape < faites) return { ton: "juste", ...numero };
    return m.phase === "verdict" && etape >= 0 ? { ton: "oubliee", ...numero } : {};
  });

  return (
    <>
      <div className="carte mem-scene mem-scene-grille" data-phase={m.phase} tabIndex={-1} ref={m.rang > 0 ? prendFocus : undefined}>
        <p className="jeu-etiquette" aria-live="polite">
          {m.phase === "memorise" ? "Suis le chemin" : m.phase === "rappel" ? `À toi\u00a0: ${faites} sur ${longueur}` : "Le chemin"}
        </p>
        <Grille nom="Grille" colonnes={COTE_CHEMIN} cases={grille} actif={m.phase === "rappel"} touche={touche} />
      </div>
      <Verdict m={m} />
    </>
  );
}

function Plateau() {
  const m = useManches(NIVEAUX_CHEMIN.length, (reussis) => bilanNiveaux(NIVEAUX_CHEMIN, reussis,
    (n) => `Tu as refait un chemin de ${n} cases.`, "Aucun chemin refait en entier cette fois."));
  const longueur = NIVEAUX_CHEMIN[m.niveau];
  return (
    <>
      <BandeauManches m={m} enjeu={pluriel(longueur, "case", "cases")} />
      <Manche key={m.rang} m={m} longueur={longueur} />
    </>
  );
}

/**
 * Le chemin. De 3 à 10 cases qui s'allument l'une après l'autre sur une grille de 4 cases de côté.
 * La partie s'arrête à la deuxième erreur. Score : la part des huit longueurs réussies, sur 100.
 */
export default function Chemin(props: PropsMemoire) {
  return (
    <CadreMemoire {...props} jeu="chemin" niveaux="De 3 à 10 cases"
      consigne={["Des cases s'allument l'une après l'autre.", "Refais le chemin\u00a0: touche les cases dans le même ordre."]}>
      <Plateau />
    </CadreMemoire>
  );
}
