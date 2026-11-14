"use client";

// Le carnet de mesures : une ligne par lecture, que l'élève touche pour l'écrire ou la corriger avec le pavé de chiffres.
// Il sert aux paillasses des ultrasons, du pointage et de l'effet Doppler, où l'élève note plusieurs lectures.
// Il est écrit ici faute d'exister dans le kit (components/tp/kit/) : il a sa place à côté de Releve.

import { Releve } from "../kit";
import "./ultrasons-carnet.css";

/** Une ligne du carnet : ce qui se note, son unité, un exemple d'écriture, et ce qu'on répond à une valeur impossible. */
export interface LigneCarnet<Q extends string> {
  quoi: Q;
  /** le nom de la ligne dans le carnet : « Période du signal » */
  court: string;
  /** la question posée au-dessus du pavé de chiffres : « Période du signal, lue sur l'écran » */
  nom: string;
  unite: string;
  exemple: string;
  refus: string;
}

/**
 * Le carnet, à mettre dans les outils de l'établi quand il est ouvert (`saisie`). `ouvert` : la ligne en cours d'écriture,
 * ou null pour la liste des lignes. `note(quoi)` dit ce qui est déjà noté sur une ligne, ou null.
 * `vise` : ce que le guide met en avant, une ligne ou la touche « Fermer le carnet ».
 */
export function Carnet<Q extends string>({ lignes, ouvert, note, ecris, valide, ferme, vise = null }: {
  lignes: readonly LigneCarnet<Q>[]; ouvert: Q | null; note: (quoi: Q) => string | null; ecris: (quoi: Q | null) => void; valide: (quoi: Q, valeur: number) => void; ferme: () => void; vise?: Q | "fermer" | null;
}) {
  const ligne = lignes.find((l) => l.quoi === ouvert);
  if (ligne) return <Releve key={ligne.quoi} nom={ligne.nom} unite={ligne.unite} exemple={ligne.exemple} annule={() => ecris(null)} valide={(v) => valide(ligne.quoi, v)} />;
  return (
    <div className="pl-ultrasons-carnet">
      <p>Ton carnet de mesures. Touche une ligne pour écrire ta lecture, ou pour la corriger.</p>
      <ul>
        {lignes.map((l) => {
          const valeur = note(l.quoi);
          return <li key={l.quoi}><button type="button" className={vise === l.quoi ? "pl-vise" : undefined} onClick={() => ecris(l.quoi)}><span>{l.court}</span><b className={valeur === null ? "pl-ultrasons-vide" : undefined}>{valeur ?? "à noter"}</b></button></li>;
        })}
      </ul>
      <div className="pl-actions"><button type="button" className={`btn btn-ligne${vise === "fermer" ? " pl-vise" : ""}`} onClick={ferme}>Fermer le carnet</button></div>
    </div>
  );
}
