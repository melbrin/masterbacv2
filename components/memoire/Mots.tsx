"use client";

// Liste de mots : des mots affichés un par un. Ensuite, parmi deux fois plus de mots, l'élève coche ceux de la liste.

import { useState } from "react";
import Icone from "@/components/appli/Icone";
import { prendFocus } from "@/components/jeux/CadreJeu";
import { pluriel } from "@/lib/commun/format";
import type { PropsMemoire } from "@/lib/commun/memoire";
import { corrigeMots, listeMots, NIVEAUX_MOTS } from "@/lib/commun/memoire/mots";
import { bilanNiveaux } from "@/lib/commun/memoire/regles";
import { BandeauManches, CadreMemoire, Points, useDefile, useManches, Verdict, type Manches, type Rythme } from "./Commun";

/** Chaque mot reste un peu plus d'une seconde. */
const RYTHME: Rythme = { amorce: 700, montre: 1150, blanc: 200 };

function Manche({ m, nombre }: { m: Manches; nombre: number }) {
  const { liste, proposes } = listeMots(m.graine, nombre);
  const [coches, setCoches] = useState<string[]>([]);
  const { rang: montre, vus } = useDefile(nombre, m.phase === "memorise", m.rappelle, RYTHME);
  const correction = corrigeMots(liste, coches);
  const complet = coches.length === nombre;

  const bascule = (mot: string) => {
    if (m.phase !== "rappel") return;
    if (coches.includes(mot)) setCoches(coches.filter((autre) => autre !== mot));
    else if (!complet) setCoches([...coches, mot]);
  };

  return (
    <>
      <div className="carte mem-scene mem-scene-mots" data-phase={m.phase} tabIndex={-1} ref={m.rang > 0 ? prendFocus : undefined}>
        {m.phase === "memorise" ? (
          <>
            <p className="jeu-etiquette">Retiens</p>
            <div className="mem-vedette mem-vedette-mot" aria-live="polite" aria-atomic="true">
              {montre !== null && <span key={montre} className="mem-pop">{liste[montre]}</span>}
            </div>
            <Points total={nombre} rang={montre} vus={vus} />
          </>
        ) : (
          <>
            <p className="jeu-etiquette">{m.phase === "rappel" ? `Coche les ${nombre} mots de la liste` : "Les mots de la liste"}</p>
            <div className="mem-mots" role="group" aria-label="Mots proposés">
              {proposes.map((mot) => {
                const coche = coches.includes(mot);
                const deLaListe = liste.includes(mot);
                const corrige = m.phase === "verdict";
                // pendant le rappel, un mot coché est marqué ; quand le compte est atteint, les autres s'éteignent
                const ton = !corrige ? (coche ? " jeu-choisi" : complet ? " jeu-eteint" : "") : deLaListe ? (coche ? " jeu-bon" : " mem-mot-oublie") : coche ? " jeu-faux" : " jeu-eteint";
                return (
                  <button key={mot} type="button" className={`mem-mot${ton}`} aria-pressed={coche} aria-disabled={corrige || (complet && !coche)} onClick={() => bascule(mot)}>
                    <span>{mot}</span>
                    {!corrige && coche && <Icone nom="ok" />}
                    {corrige && deLaListe && coche && <><Icone nom="ok" /><span className="jeu-sr">, dans la liste</span></>}
                    {corrige && deLaListe && !coche && <span className="mem-mot-note">oublié</span>}
                    {corrige && !deLaListe && coche && <><Icone nom="croix" /><span className="jeu-sr">, pas dans la liste</span></>}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
      <Verdict m={m} pendant={(
        <>
          <span className="mem-compte" aria-live="polite">{coches.length} sur {nombre}</span>
          <button type="button" className="btn btn-cuivre mem-suite" aria-disabled={!complet} onClick={() => { if (complet) m.juge(correction.juste); }}>Valider</button>
        </>
      )}>
        {!m.juste && (
          <span>
            {[correction.oublies.length > 0 ? pluriel(correction.oublies.length, "mot oublié", "mots oubliés") : null,
              correction.enTrop.length > 0 ? pluriel(correction.enTrop.length, "mot en trop", "mots en trop") : null].filter(Boolean).join(", ")}.
          </span>
        )}
      </Verdict>
    </>
  );
}

function Plateau() {
  const m = useManches(NIVEAUX_MOTS.length, (reussis) => bilanNiveaux(NIVEAUX_MOTS, reussis,
    (n) => `Tu as reconnu une liste de ${n} mots.`, "Aucune liste reconnue en entier cette fois."));
  const nombre = NIVEAUX_MOTS[m.niveau];
  return (
    <>
      <BandeauManches m={m} enjeu={pluriel(nombre, "mot", "mots")} />
      <Manche key={m.rang} m={m} nombre={nombre} />
    </>
  );
}

/**
 * Liste de mots. De 6 à 12 mots, affichés un par un. Ensuite deux fois plus de mots sont proposés : il faut cocher
 * tous ceux de la liste, et eux seuls. La partie s'arrête à la deuxième erreur.
 * Score : la part des sept longueurs de liste réussies, sur 100.
 */
export default function Mots(props: PropsMemoire) {
  return (
    <CadreMemoire {...props} jeu="mots" niveaux="De 6 à 12 mots"
      consigne={["Des mots s'affichent un par un.", "Ensuite, coche ceux de la liste parmi deux fois plus de mots."]}>
      <Plateau />
    </CadreMemoire>
  );
}
