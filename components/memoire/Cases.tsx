"use client";

// Cases allumées : des cases s'allument ensemble deux secondes sur une grille, puis s'éteignent.
// L'élève les retouche, dans l'ordre qu'il veut. La première case fausse arrête la manche.

import { useState } from "react";
import { prendFocus } from "@/components/jeux/CadreJeu";
import { pluriel } from "@/lib/commun/format";
import type { PropsMemoire } from "@/lib/commun/memoire";
import { casesAllumees, NIVEAUX_CASES } from "@/lib/commun/memoire/espace";
import { bilanNiveaux } from "@/lib/commun/memoire/regles";
import { plage } from "@/lib/commun/memoire/tirage";
import { BandeauManches, CadreMemoire, Grille, Sablier, useExposition, useManches, Verdict, type CaseGrille, type Manches } from "./Commun";

/** Le temps pendant lequel les cases restent allumées, en millisecondes. */
const REGARD = 2000;

function Manche({ m, nombre }: { m: Manches; nombre: number }) {
  const { cote, cases } = casesAllumees(m.graine, nombre);
  const [trouvees, setTrouvees] = useState<number[]>([]);
  const [fausse, setFausse] = useState<number | null>(null);
  const etape = useExposition(m.phase === "memorise", REGARD, m.rappelle);

  const touche = (rang: number) => {
    if (m.phase !== "rappel" || trouvees.includes(rang)) return;
    if (!cases.includes(rang)) { setFausse(rang); m.juge(false); return; }
    const faites = [...trouvees, rang];
    setTrouvees(faites);
    if (faites.length === cases.length) m.juge(true);
  };
  const grille = plage(0, cote * cote - 1).map((rang): CaseGrille => {
    if (m.phase === "memorise") return etape === "montre" && cases.includes(rang) ? { ton: "allumee" } : {};
    if (rang === fausse) return { ton: "fausse" };
    if (trouvees.includes(rang)) return { ton: "juste" };
    return m.phase === "verdict" && cases.includes(rang) ? { ton: "oubliee" } : {};
  });

  return (
    <>
      <div className="carte mem-scene mem-scene-grille" data-phase={m.phase} tabIndex={-1} ref={m.rang > 0 ? prendFocus : undefined}>
        {etape === "montre" && m.phase === "memorise" && <Sablier ms={REGARD} />}
        <p className="jeu-etiquette" aria-live="polite">
          {m.phase === "memorise" ? "Retiens les cases allumées" : m.phase === "rappel" ? `À toi\u00a0: ${trouvees.length} sur ${nombre}` : "Les cases allumées"}
        </p>
        <Grille nom="Grille" colonnes={cote} cases={grille} actif={m.phase === "rappel"} touche={touche} />
      </div>
      <Verdict m={m} />
    </>
  );
}

function Plateau() {
  const m = useManches(NIVEAUX_CASES.length, (reussis) => bilanNiveaux(NIVEAUX_CASES, reussis,
    (n) => `Tu as retrouvé ${n} cases allumées.`, "Aucune grille retrouvée en entier cette fois."));
  const nombre = NIVEAUX_CASES[m.niveau];
  return (
    <>
      <BandeauManches m={m} enjeu={pluriel(nombre, "case", "cases")} />
      <Manche key={m.rang} m={m} nombre={nombre} />
    </>
  );
}

/**
 * Cases allumées. De 3 à 12 cases, allumées deux secondes, sur une grille de 4 puis de 5 cases de côté.
 * La partie s'arrête à la deuxième erreur. Score : 10 points par nombre de cases réussi.
 */
export default function Cases(props: PropsMemoire) {
  return (
    <CadreMemoire {...props} jeu="cases" niveaux="De 3 à 12 cases"
      consigne={["Des cases s'allument deux secondes, puis s'éteignent.", "Touche ensuite toutes les cases qui étaient allumées."]}>
      <Plateau />
    </CadreMemoire>
  );
}
