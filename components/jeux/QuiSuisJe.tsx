"use client";

// Qui suis-je ? : retrouver une notion à partir de ce qu'il faut en retenir, avec le moins d'indices possible.

import { useState } from "react";
import Icone from "@/components/appli/Icone";
import ContenuHtml from "@/components/socle/ContenuHtml";
import { pluriel, points } from "@/lib/commun/format";
import type { LigneEssentiel } from "@/lib/commun/jeux";
import CadreJeu, {
  Annonce, BandeauJeu, Compteur, ECART, lignesDePartie, MINIMUM, OptionsJeu, optionNotion, PAS_ASSEZ, PAUSE_REPONSE,
  propositions, sansDoublon, useChrono, useDelai, usePartie, type OptionJeu, type PropsLignes,
} from "./CadreJeu";

const MANCHES = 8;

interface Manche { ligne: LigneEssentiel; options: OptionJeu[] }

/** Huit lignes au plus, chacune avec quatre notions : la sienne et trois autres. */
function prepare(lignes: readonly LigneEssentiel[], graine: number): Manche[] {
  const distinctes = lignesDePartie(lignes, graine);
  return distinctes.slice(0, MANCHES).map((ligne, i) => ({
    ligne,
    options: propositions(optionNotion(ligne), distinctes.filter((l) => l.id !== ligne.id).map(optionNotion), 3, graine + ECART * (i + 1)),
  }));
}

function Plateau({ lignes }: { lignes: LigneEssentiel[] }) {
  const partie = usePartie();
  // les manches sont tirées une fois, quand le plateau apparaît
  const [manches] = useState(() => prepare(lignes, partie.graine));
  const [rang, setRang] = useState(0);
  /** le nombre d'indices montrés pour la manche en cours : un, puis deux si l'élève le demande */
  const [indices, setIndices] = useState(1);
  const [choisie, setChoisie] = useState<string | undefined>(undefined);
  /** les notions trouvées avec un seul indice, et avec deux */
  const [trouvees, setTrouvees] = useState({ un: 0, deux: 0 });
  const lis = useChrono();
  const manche = manches[rang];
  const total = manches.length;
  const repondu = choisie !== undefined;
  const juste = choisie === manche.ligne.id;
  // Une notion trouvée vaut 100 / total avec un indice et 60 / total avec deux : 12,5 et 7,5 points pour huit manches.
  const score = (100 * trouvees.un + 60 * trouvees.deux) / total;

  // la bonne notion reste montrée un instant ; puis la manche suivante arrive, ou la partie se termine
  useDelai(repondu ? rang : null, PAUSE_REPONSE, () => {
    if (rang + 1 < total) {
      setRang(rang + 1);
      setIndices(1);
      setChoisie(undefined);
      return;
    }
    const nombre = trouvees.un + trouvees.deux;
    partie.termine(Math.round(score), lis(), nombre === 0 ? `Aucune notion trouvée sur ${total}.`
      : `${pluriel(nombre, "notion trouvée", "notions trouvées")} sur ${total}, dont ${trouvees.un} avec un seul indice.`);
  });

  const repond = (cle: string) => {
    if (repondu) return;
    setChoisie(cle);
    if (cle !== manche.ligne.id) return;
    setTrouvees(indices === 1 ? { ...trouvees, un: trouvees.un + 1 } : { ...trouvees, deux: trouvees.deux + 1 });
  };

  return (
    <>
      <BandeauJeu>
        <Compteur nom="Manche" valeur={rang + 1} suite={`sur ${total}`} />
        <Compteur nom="Score" valeur={points(score)} />
      </BandeauJeu>
      <div aria-live="polite">
        <div key={rang} className="carte jeu-question apparait">
          <div className="jeu-indice">
            <span className="jeu-etiquette">Indice 1</span>
            <ContenuHtml bloc className="jeu-indice-texte" html={manche.ligne.retenir} />
          </div>
          {indices > 1 && (
            <div className="jeu-indice apparait">
              <span className="jeu-etiquette">Indice 2</span>
              <ContenuHtml bloc className="jeu-formule" html={manche.ligne.relation} />
            </div>
          )}
        </div>
      </div>
      <div className="actions">
        <button type="button" className="btn btn-ligne" aria-disabled={indices > 1 || repondu} onClick={() => { if (!repondu) setIndices(2); }}>
          <Icone nom="ampoule" />Un indice de plus
        </button>
      </div>
      <OptionsJeu nom="Notions proposées" options={manche.options} bonne={manche.ligne.id} choisie={choisie} repond={repond} />
      <Annonce verdict={!repondu ? null : juste ? "bon" : "faux"} titre={juste ? "Bonne réponse" : "Ce n'est pas ça"}>
        {!juste && <span>La bonne notion&nbsp;: <ContenuHtml html={manche.ligne.notion} /></span>}
      </Annonce>
    </>
  );
}

/**
 * Qui suis-je ? Huit manches, ou autant que de lignes ; il en faut au moins quatre.
 * Score : arrondi de (100 × trouvées avec un indice + 60 × trouvées avec deux) / nombre de manches,
 * soit 12,5 et 7,5 points par notion quand il y a huit manches.
 */
export default function QuiSuisJe({ lignes, graine, fin, retour }: PropsLignes) {
  return (
    <CadreJeu graine={graine} fin={fin} retour={retour} manque={sansDoublon(lignes).length < MINIMUM ? PAS_ASSEZ : null}>
      <Plateau lignes={lignes} />
    </CadreJeu>
  );
}
