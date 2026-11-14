"use client";

// Flash : un code de lettres et de chiffres s'affiche une seconde. L'élève le retape sur un clavier de signes.

import { useState } from "react";
import { prendFocus } from "@/components/jeux/CadreJeu";
import { pluriel } from "@/lib/commun/format";
import type { PropsMemoire } from "@/lib/commun/memoire";
import { codeFlash, NIVEAUX_FLASH, SIGNES_FLASH } from "@/lib/commun/memoire/images";
import { bilanNiveaux } from "@/lib/commun/memoire/regles";
import { memeSuite } from "@/lib/commun/memoire/tirage";
import { BandeauManches, CadreMemoire, Clavier, Saisie, Sablier, useExposition, useManches, Verdict, type Manches } from "./Commun";

/** Le temps pendant lequel le code reste affiché, en millisecondes. */
const REGARD = 1000;

function Manche({ m, longueur }: { m: Manches; longueur: number }) {
  const code = codeFlash(m.graine, longueur);
  const [saisie, setSaisie] = useState<string[]>([]);
  const etape = useExposition(m.phase === "memorise", REGARD, m.rappelle);
  return (
    <>
      <div className="carte mem-scene" data-phase={m.phase} tabIndex={-1} ref={m.rang > 0 ? prendFocus : undefined}>
        {m.phase === "memorise" && (
          <>
            {etape === "montre" && <Sablier ms={REGARD} />}
            <p className="jeu-etiquette">{etape === "attente" ? "Prépare-toi" : "Retiens ce code"}</p>
            <div className="mem-vedette mem-vedette-code" aria-live="polite" aria-atomic="true">{etape === "montre" && <span className="mem-pop">{code.join("")}</span>}</div>
          </>
        )}
        {m.phase === "rappel" && (
          <>
            <p className="jeu-etiquette">À toi</p>
            <Saisie nom="Ta réponse" total={longueur} valeur={saisie} />
            <p className="mem-aide">Retape le code, signe par signe.</p>
          </>
        )}
        {m.phase === "verdict" && (
          <>
            <p className="jeu-etiquette">Le code</p>
            <Saisie nom="Le code" total={longueur} valeur={code} juste />
            {!m.juste && (
              <>
                <p className="jeu-etiquette">Ta réponse</p>
                <Saisie nom="Ta réponse" total={longueur} valeur={saisie} attendu={code} />
              </>
            )}
          </>
        )}
      </div>
      <Verdict m={m} />
      <Clavier signes={SIGNES_FLASH} colonnes={6} actif={m.phase === "rappel"} vide={saisie.length === 0} plein={saisie.length >= longueur} pret={saisie.length >= longueur}
        tape={(signe) => setSaisie([...saisie, signe])} efface={() => setSaisie(saisie.slice(0, -1))} valide={() => m.juge(memeSuite(saisie, code))} />
    </>
  );
}

function Plateau() {
  const m = useManches(NIVEAUX_FLASH.length, (reussis) => bilanNiveaux(NIVEAUX_FLASH, reussis,
    (n) => `Tu as retenu un code de ${n} signes vu une seconde.`, "Aucun code retenu cette fois."));
  const longueur = NIVEAUX_FLASH[m.niveau];
  return (
    <>
      <BandeauManches m={m} enjeu={pluriel(longueur, "signe", "signes")} />
      <Manche key={m.rang} m={m} longueur={longueur} />
    </>
  );
}

/**
 * Flash. Un code de 4 à 8 signes (lettres et chiffres qui ne se confondent pas), affiché une seconde.
 * La partie s'arrête à la deuxième erreur. Score : 20 points par longueur réussie.
 */
export default function Flash(props: PropsMemoire) {
  return (
    <CadreMemoire {...props} jeu="flash" niveaux="De 4 à 8 signes"
      consigne={["Un code de lettres et de chiffres s'affiche une seconde.", "Retiens-le d'un coup d'œil, puis retape-le."]}>
      <Plateau />
    </CadreMemoire>
  );
}
