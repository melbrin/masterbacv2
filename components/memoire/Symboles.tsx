"use client";

// Paires de symboles : des cartes montrées quelques secondes, puis retournées. L'élève retrouve les paires de
// pictogrammes. Trop de paires ratées, et la planche est perdue.

import { useState } from "react";
import { prendFocus, useDelai } from "@/components/jeux/CadreJeu";
import { pluriel } from "@/lib/commun/format";
import type { PropsMemoire } from "@/lib/commun/memoire";
import { cartesSymboles, NIVEAUX_SYMBOLES, ratesPermis } from "@/lib/commun/memoire/espace";
import { picto } from "@/lib/commun/memoire/pictos";
import { bilanNiveaux } from "@/lib/commun/memoire/regles";
import { BandeauManches, CadreMemoire, Picto, Sablier, useExposition, useManches, Verdict, type Manches } from "./Commun";

/** Le temps pour regarder les cartes, en millisecondes : une seconde, et trois dixièmes de seconde par carte. */
const regard = (cartes: number) => 1000 + 300 * cartes;
/** Le temps pendant lequel deux cartes qui ne vont pas ensemble restent visibles, en millisecondes. */
const ATTENTE = 900;

function Manche({ m, nombre }: { m: Manches; nombre: number }) {
  const cartes = cartesSymboles(m.graine, nombre);
  const paires = nombre / 2;
  const permis = ratesPermis(nombre);
  /** les cartes retournées qui ne forment pas encore une paire : deux au plus */
  const [visibles, setVisibles] = useState<number[]>([]);
  /** les pictogrammes dont la paire est trouvée */
  const [trouvees, setTrouvees] = useState<string[]>([]);
  const [rates, setRates] = useState(0);
  const etape = useExposition(m.phase === "memorise", regard(nombre), m.rappelle);
  // deux cartes qui ne vont pas ensemble se retournent après un court moment
  useDelai(m.phase === "rappel" && visibles.length === 2 ? `rate-${rates}` : null, ATTENTE, () => setVisibles([]));

  const retourne = (rang: number) => {
    if (m.phase !== "rappel" || visibles.length === 2 || visibles.includes(rang) || trouvees.includes(cartes[rang])) return;
    if (visibles.length === 0) { setVisibles([rang]); return; }
    if (cartes[visibles[0]] === cartes[rang]) {
      const faites = [...trouvees, cartes[rang]];
      setTrouvees(faites);
      setVisibles([]);
      if (faites.length === paires) m.juge(true);
      return;
    }
    setVisibles([visibles[0], rang]);
    setRates(rates + 1);
    if (rates + 1 > permis) m.juge(false);
  };

  return (
    <>
      <div className="carte mem-scene mem-scene-grille" data-phase={m.phase} tabIndex={-1} ref={m.rang > 0 ? prendFocus : undefined}>
        {etape === "montre" && m.phase === "memorise" && <Sablier ms={regard(nombre)} />}
        <p className="jeu-etiquette mem-tete" aria-live="polite">
          {m.phase === "memorise" ? "Retiens où sont les paires"
            : `Paires\u00a0: ${trouvees.length} sur ${paires} · Ratées\u00a0: ${Math.min(rates, permis)} sur ${permis}`}
        </p>
        <div className="mem-cartes" role="group" aria-label="Cartes à retourner">
          {cartes.map((id, rang) => {
            const trouvee = trouvees.includes(id);
            const visible = m.phase === "memorise" ? etape === "montre" : m.phase === "verdict" || trouvee || visibles.includes(rang);
            const ratee = visibles.length === 2 && visibles.includes(rang);
            return (
              <button key={rang} type="button" aria-disabled={m.phase !== "rappel" || visible} aria-label={visible ? picto(id).mot : `Carte ${rang + 1}, face cachée`}
                data-repere={visible ? id : ""} className={`jeu-paire${visible ? " jeu-retournee" : ""}${trouvee ? " jeu-trouvee" : ""}${ratee ? " jeu-ratee" : ""}`}
                onClick={() => retourne(rang)}>
                <span className="jeu-paire-int">
                  <span className="jeu-paire-dos" aria-hidden="true">?</span>
                  {/* le dessin reste sous la carte retournée : il ne disparaît pas avant la fin du retournement */}
                  <span className="jeu-paire-face" aria-hidden="true"><Picto id={id} /></span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <Verdict m={m} juste="Planche réussie" faux="Trop de paires ratées" />
    </>
  );
}

function Plateau() {
  const m = useManches(NIVEAUX_SYMBOLES.length, (reussis) => bilanNiveaux(NIVEAUX_SYMBOLES, reussis,
    (n) => `Tu as retrouvé toutes les paires d'une planche de ${n} cartes.`, "Aucune planche finie cette fois."));
  const nombre = NIVEAUX_SYMBOLES[m.niveau];
  return (
    <>
      <BandeauManches m={m} enjeu={pluriel(nombre, "carte", "cartes")} />
      <Manche key={m.rang} m={m} nombre={nombre} />
    </>
  );
}

/**
 * Paires de symboles. Trois planches : 12, 16 puis 20 cartes, montrées quelques secondes avant d'être retournées.
 * Une planche est perdue quand le nombre de paires ratées dépasse le nombre de paires. La partie s'arrête à la
 * deuxième planche perdue. Score : la part des trois planches réussies, sur 100.
 */
export default function Symboles(props: PropsMemoire) {
  return (
    <CadreMemoire {...props} jeu="symboles" niveaux="12, 16 puis 20 cartes"
      consigne={["Des cartes se montrent quelques secondes, puis se retournent.", "Retrouve les paires de symboles sans trop te tromper."]}>
      <Plateau />
    </CadreMemoire>
  );
}
