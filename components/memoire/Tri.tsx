"use client";

// Du plus petit au plus grand : des nombres de deux chiffres affichés un par un. L'élève les retape rangés,
// du plus petit au plus grand.

import { useState } from "react";
import { prendFocus } from "@/components/jeux/CadreJeu";
import { pluriel } from "@/lib/commun/format";
import type { PropsMemoire } from "@/lib/commun/memoire";
import { bilanNiveaux } from "@/lib/commun/memoire/regles";
import { NIVEAUX_TRI, nombresATrier, tries } from "@/lib/commun/memoire/suites";
import { memeSuite } from "@/lib/commun/memoire/tirage";
import { BandeauManches, CadreMemoire, Pave, Points, Saisie, useDefile, useManches, Verdict, type Manches, type Rythme } from "./Commun";

/** Chaque nombre reste un peu plus d'une seconde. */
const RYTHME: Rythme = { amorce: 700, montre: 1100, blanc: 200 };

/** Les chiffres d'une liste de nombres de deux chiffres, à la suite : [12, 45] devient [1, 2, 4, 5]. */
const chiffresDe = (nombres: readonly number[]) => nombres.flatMap((n) => [Math.floor(n / 10), n % 10]);

function Manche({ m, nombre }: { m: Manches; nombre: number }) {
  const nombres = nombresATrier(m.graine, nombre);
  const attendu = chiffresDe(tries(nombres));
  /** une case par chiffre, deux par nombre */
  const paquets = nombres.map(() => 2);
  const [saisie, setSaisie] = useState<number[]>([]);
  const { rang: montre, vus } = useDefile(nombre, m.phase === "memorise", m.rappelle, RYTHME);
  return (
    <>
      <div className="carte mem-scene" data-phase={m.phase} tabIndex={-1} ref={m.rang > 0 ? prendFocus : undefined}>
        {m.phase === "memorise" && (
          <>
            <p className="jeu-etiquette">Retiens</p>
            <div className="mem-vedette chiffres" aria-live="polite" aria-atomic="true">
              {montre !== null && <span key={montre} className="mem-pop">{nombres[montre]}</span>}
            </div>
            <Points total={nombre} rang={montre} vus={vus} />
          </>
        )}
        {m.phase === "rappel" && (
          <>
            <p className="jeu-etiquette">À toi</p>
            <Saisie nom="Ta réponse" total={2 * nombre} valeur={saisie} paquets={paquets} />
            <p className="mem-aide">Du plus petit au plus grand.</p>
          </>
        )}
        {m.phase === "verdict" && (
          <>
            <p className="mem-aide">Les nombres montrés&nbsp;: <b className="mem-rappel-suite chiffres">{nombres.join(" ")}</b></p>
            <p className="jeu-etiquette">Du plus petit au plus grand</p>
            <Saisie nom="Les nombres rangés" total={2 * nombre} valeur={attendu} paquets={paquets} juste />
            {!m.juste && (
              <>
                <p className="jeu-etiquette">Ta réponse</p>
                <Saisie nom="Ta réponse" total={2 * nombre} valeur={saisie} paquets={paquets} attendu={attendu} />
              </>
            )}
          </>
        )}
      </div>
      <Verdict m={m} />
      <Pave actif={m.phase === "rappel"} vide={saisie.length === 0} plein={saisie.length >= 2 * nombre} pret={saisie.length >= 2 * nombre}
        tape={(chiffre) => setSaisie([...saisie, Number(chiffre)])} efface={() => setSaisie(saisie.slice(0, -1))}
        valide={() => m.juge(memeSuite(saisie, attendu))} />
    </>
  );
}

function Plateau() {
  const m = useManches(NIVEAUX_TRI.length, (reussis) => bilanNiveaux(NIVEAUX_TRI, reussis,
    (n) => `Tu as rangé ${n} nombres de tête.`, "Aucune série rangée en entier cette fois."));
  const nombre = NIVEAUX_TRI[m.niveau];
  return (
    <>
      <BandeauManches m={m} enjeu={pluriel(nombre, "nombre", "nombres")} />
      <Manche key={m.rang} m={m} nombre={nombre} />
    </>
  );
}

/**
 * Du plus petit au plus grand. De 3 à 8 nombres de 10 à 99, tous différents, affichés un par un ; ils se retapent
 * rangés. La partie s'arrête à la deuxième erreur. Score : la part des six longueurs réussies, sur 100.
 */
export default function Tri(props: PropsMemoire) {
  return (
    <CadreMemoire {...props} jeu="tri" niveaux="De 3 à 8 nombres"
      consigne={["Des nombres s'affichent un par un.", "Retiens-les, puis tape-les du plus petit au plus grand."]}>
      <Plateau />
    </CadreMemoire>
  );
}
