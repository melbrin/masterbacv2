"use client";

// Chacun sa place : des pictogrammes sont posés sur une grille quelques secondes, puis la grille se vide.
// Pour chaque pictogramme demandé, l'élève touche sa case. La première case fausse arrête la manche.

import { useState } from "react";
import { prendFocus } from "@/components/jeux/CadreJeu";
import { pluriel } from "@/lib/commun/format";
import type { PropsMemoire } from "@/lib/commun/memoire";
import { COTE_PLACES, NIVEAUX_PLACES, placesPictos } from "@/lib/commun/memoire/espace";
import { nomPicto, picto } from "@/lib/commun/memoire/pictos";
import { bilanNiveaux } from "@/lib/commun/memoire/regles";
import { plage } from "@/lib/commun/memoire/tirage";
import { BandeauManches, CadreMemoire, Grille, Picto, Sablier, useExposition, useManches, Verdict, type CaseGrille, type Manches } from "./Commun";

/** Le temps pour regarder, en millisecondes : une seconde et demie, et un peu moins d'une seconde par objet. */
const regard = (nombre: number) => 1500 + 900 * nombre;

function Manche({ m, nombre }: { m: Manches; nombre: number }) {
  const { objets, demandes } = placesPictos(m.graine, nombre);
  /** le nombre d'objets déjà remis à leur place */
  const [places, setPlaces] = useState(0);
  const [fausse, setFausse] = useState<number | null>(null);
  const etape = useExposition(m.phase === "memorise", regard(nombre), m.rappelle);
  /** l'objet demandé ; après une erreur, il reste affiché avec le verdict */
  const demande = demandes[Math.min(places, nombre - 1)];
  const replaces = demandes.slice(0, places);

  const touche = (rang: number) => {
    const objet = objets.find((o) => o.place === rang);
    if (m.phase !== "rappel" || (objet && replaces.includes(objet.picto))) return;
    if (objet?.picto !== demande) { setFausse(rang); m.juge(false); return; }
    if (places + 1 === nombre) m.juge(true);
    setPlaces(places + 1);
  };
  const grille = plage(0, COTE_PLACES * COTE_PLACES - 1).map((rang): CaseGrille => {
    const objet = objets.find((o) => o.place === rang);
    const dessin = objet ? { contenu: <Picto id={objet.picto} />, dit: picto(objet.picto).mot } : {};
    if (m.phase === "memorise") return etape === "montre" ? dessin : {};
    if (rang === fausse) return { ton: "fausse", ...dessin };
    if (objet && replaces.includes(objet.picto)) return { ton: "juste", ...dessin };
    if (m.phase !== "verdict" || !objet) return {};
    return objet.picto === demande && !m.juste ? { ton: "oubliee", ...dessin } : dessin;
  });

  return (
    <>
      <div className="carte mem-scene mem-scene-grille" data-phase={m.phase} tabIndex={-1} ref={m.rang > 0 ? prendFocus : undefined}>
        {etape === "montre" && m.phase === "memorise" && <Sablier ms={regard(nombre)} />}
        {m.phase === "memorise"
          ? <p className="jeu-etiquette mem-tete">Retiens la place de chaque objet</p>
          : (
            <p className="mem-question mem-tete" aria-live="polite">
              {m.phase === "verdict" && m.juste ? "Tous les objets sont à leur place." : <>Où était <span className="mem-question-fin"><span className="mem-question-objet"><Picto id={demande} />{nomPicto(demande)}</span>?</span></>}
            </p>
          )}
        <Grille nom="Grille" colonnes={COTE_PLACES} cases={grille} actif={m.phase === "rappel"} touche={touche} />
      </div>
      <Verdict m={m} />
    </>
  );
}

function Plateau() {
  const m = useManches(NIVEAUX_PLACES.length, (reussis) => bilanNiveaux(NIVEAUX_PLACES, reussis,
    (n) => `Tu as retrouvé la place de ${n} objets.`, "Aucune grille retrouvée en entier cette fois."));
  const nombre = NIVEAUX_PLACES[m.niveau];
  return (
    <>
      <BandeauManches m={m} enjeu={pluriel(nombre, "objet", "objets")} />
      <Manche key={m.rang} m={m} nombre={nombre} />
    </>
  );
}

/**
 * Chacun sa place. De 3 à 8 objets posés sur une grille de 4 cases de côté, montrés quelques secondes.
 * La partie s'arrête à la deuxième erreur. Score : la part des six nombres d'objets réussis, sur 100.
 */
export default function Places(props: PropsMemoire) {
  return (
    <CadreMemoire {...props} jeu="places" niveaux="De 3 à 8 objets"
      consigne={["Des objets sont posés sur une grille, puis la grille se vide.", "Pour chaque objet demandé, touche la case où il était."]}>
      <Plateau />
    </CadreMemoire>
  );
}
