"use client";

// Relie : les notions d'un côté, les relations de l'autre. On touche un élément de chaque côté pour les relier.

import { useState, type CSSProperties } from "react";
import ContenuHtml from "@/components/socle/ContenuHtml";
import { pluriel } from "@/lib/commun/format";
import type { LigneEssentiel } from "@/lib/commun/jeux";
import CadreJeu, { Annonce, BandeauJeu, brasse, Compteur, lignesDePartie, MINIMUM, PAS_ASSEZ, prendFocus, sansDoublon, TempsJeu, tempsDit, useChrono, useDelai, usePartie, type PropsLignes } from "./CadreJeu";

const PAR_MANCHE = 5;
/** Le temps pendant lequel une mauvaise paire reste marquée, en millisecondes. */
const SECOUSSE = 600;
/** Le temps pendant lequel la dernière paire d'une manche reste à l'écran avant la suite, en millisecondes. */
const ATTENTE = 900;

type Cote = "notion" | "relation";
interface Manche { notions: LigneEssentiel[]; relations: LigneEssentiel[] }

/** Une manche de cinq lignes au plus, ou deux manches s'il y a au moins dix lignes. Les relations sont dans un autre ordre que les notions. */
function prepare(lignes: readonly LigneEssentiel[], graine: number): Manche[] {
  const distinctes = lignesDePartie(lignes, graine);
  const tirees = distinctes.slice(0, distinctes.length >= 2 * PAR_MANCHE ? 2 * PAR_MANCHE : PAR_MANCHE);
  const lots = tirees.length > PAR_MANCHE ? [tirees.slice(0, PAR_MANCHE), tirees.slice(PAR_MANCHE)] : [tirees];
  return lots.map((notions, i) => {
    const melangees = brasse(notions, graine + 17 * (i + 1));
    // si le mélange redonne le même ordre, il est décalé d'un cran : sinon chaque relation serait en face de sa notion
    const relations = melangees.every((l, k) => l.id === notions[k].id) ? [...melangees.slice(1), ...melangees.slice(0, 1)] : melangees;
    return { notions, relations };
  });
}

// Un élément à relier : une notion ou une relation.
function Lien({ html, choisi, numero, ratee, touche }: {
  html: string;
  choisi: boolean;
  /** le numéro de sa paire une fois l'élément relié : le même des deux côtés */
  numero: number | null;
  /** vrai un court moment après une mauvaise paire */
  ratee: boolean;
  touche: () => void;
}) {
  return (
    <button type="button" aria-pressed={choisi} aria-disabled={numero !== null} onClick={touche}
      className={`jeu-lien${numero !== null ? " jeu-bon" : choisi ? " jeu-choisi" : ratee ? " jeu-faux jeu-secoue" : ""}`}>
      <ContenuHtml className="jeu-lien-texte" html={html} />
      {numero !== null && <span className="jeu-lien-rang"><span className="jeu-sr">Paire </span>{numero}</span>}
    </button>
  );
}

function Plateau({ lignes }: { lignes: LigneEssentiel[] }) {
  const partie = usePartie();
  // les manches sont tirées une fois, quand le plateau apparaît
  const [manches] = useState(() => prepare(lignes, partie.graine));
  const [rang, setRang] = useState(0);
  /** les lignes reliées dans la manche en cours, dans l'ordre où elles l'ont été */
  const [reliees, setReliees] = useState<string[]>([]);
  /** l'élément touché en premier, qui attend son vis-à-vis */
  const [choix, setChoix] = useState<{ cote: Cote; id: string } | null>(null);
  /** la mauvaise paire qui vient d'être tentée */
  const [ratee, setRatee] = useState<{ notion: string; relation: string } | null>(null);
  const [erreurs, setErreurs] = useState(0);
  const [annonce, setAnnonce] = useState<{ verdict: "bon" | "faux"; titre: string } | null>(null);
  /** le temps relevé à la dernière paire : la partie est gagnée */
  const [duree, setDuree] = useState<number | null>(null);
  const lis = useChrono();
  const manche = manches[rang];
  const total = manches.reduce((n, m) => n + m.notions.length, 0);
  const mancheFinie = reliees.length === manche.notions.length;

  // la marque d'une mauvaise paire s'efface après un court moment
  useDelai(ratee ? erreurs : null, SECOUSSE, () => setRatee(null));
  // la manche est finie et une autre suit : elle arrive après un court moment
  useDelai(mancheFinie && rang + 1 < manches.length ? `manche-${rang}` : null, ATTENTE, () => {
    setRang(rang + 1);
    setReliees([]);
    setAnnonce(null);
  });
  // la dernière paire reste un instant à l'écran, puis la partie se termine
  useDelai(duree, ATTENTE, () => partie.termine(
    Math.max(10, 100 - 10 * erreurs - Math.floor((duree ?? 0) / 6)), duree ?? 0,
    `${pluriel(total, "paire reliée", "paires reliées")} en ${tempsDit(duree ?? 0)}, ${erreurs === 0 ? "sans erreur" : `avec ${pluriel(erreurs, "erreur", "erreurs")}`}.`,
  ));

  const touche = (cote: Cote, id: string) => {
    if (duree !== null || reliees.includes(id)) return;
    if (choix === null || choix.cote === cote) {
      // premier élément touché, ou changement d'avis du même côté ; retoucher le même élément le relâche
      setChoix(choix !== null && choix.id === id ? null : { cote, id });
      return;
    }
    // un élément de chaque côté : la paire est jugée
    setChoix(null);
    if (choix.id !== id) {
      setErreurs(erreurs + 1);
      setRatee(cote === "notion" ? { notion: id, relation: choix.id } : { notion: choix.id, relation: id });
      setAnnonce({ verdict: "faux", titre: "Ce n'est pas la bonne paire" });
      return;
    }
    const liees = [...reliees, id];
    setReliees(liees);
    setRatee(null);
    setAnnonce({ verdict: "bon", titre: `Bonne paire\u00a0: ${liees.length} sur ${manche.notions.length}` });
    if (liees.length === manche.notions.length && rang + 1 === manches.length) setDuree(lis());
  };
  const numero = (id: string) => (reliees.includes(id) ? reliees.indexOf(id) + 1 : null);

  return (
    <>
      <BandeauJeu>
        <Compteur nom="Erreurs" valeur={erreurs} />
        {manches.length > 1 && <Compteur nom="Manche" valeur={rang + 1} suite={`sur ${manches.length}`} />}
        <TempsJeu lis={lis} arret={duree} />
      </BandeauJeu>
      {/* la clé monte des boutons neufs à la deuxième manche ; le focus les suit, pour jouer au clavier */}
      <div key={rang} className="jeu-relie apparait" tabIndex={-1} ref={rang > 0 ? prendFocus : undefined}
        style={{ "--jeu-rangees": manche.notions.length } as CSSProperties}>
        <div className="jeu-relie-colonne" role="group" aria-label="Notions">
          {manche.notions.map((l) => (
            <Lien key={l.id} html={l.notion} choisi={choix?.cote === "notion" && choix.id === l.id} numero={numero(l.id)}
              ratee={ratee?.notion === l.id} touche={() => touche("notion", l.id)} />
          ))}
        </div>
        <div className="jeu-relie-colonne" role="group" aria-label="Relations">
          {manche.relations.map((l) => (
            <Lien key={l.id} html={l.relation} choisi={choix?.cote === "relation" && choix.id === l.id} numero={numero(l.id)}
              ratee={ratee?.relation === l.id} touche={() => touche("relation", l.id)} />
          ))}
        </div>
      </div>
      <Annonce verdict={annonce?.verdict ?? null} titre={annonce?.titre ?? ""} />
    </>
  );
}

/**
 * Relie. Une manche de cinq lignes au plus (il en faut quatre), deux manches à partir de dix lignes.
 * Score : max(10, 100 - 10 × erreurs - partie entière de secondes / 6).
 */
export default function Relie({ lignes, graine, fin, retour }: PropsLignes) {
  return (
    <CadreJeu graine={graine} fin={fin} retour={retour} manque={sansDoublon(lignes).length < MINIMUM ? PAS_ASSEZ : null}>
      <Plateau lignes={lignes} />
    </CadreJeu>
  );
}
