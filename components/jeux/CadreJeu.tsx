"use client";

// Le cadre commun des jeux (décision 0010) : le bandeau, les réponses proposées, la ligne de résultat, l'écran de fin,
// et les outils dont chaque jeu a besoin (chronomètre, minuteur, tirages).
// Rien n'est tiré au hasard pendant l'affichage : tout part de la graine donnée par le serveur.

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useEffectEvent, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Icone from "@/components/appli/Icone";
import ContenuHtml from "@/components/socle/ContenuHtml";
import { p2, pluriel } from "@/lib/commun/format";
import { melangeGraine, tire, type FinDePartie, type LigneEssentiel } from "@/lib/commun/jeux";

/** Les props des jeux qui partent du tableau « À connaître par cœur ». */
export interface PropsLignes { lignes: LigneEssentiel[]; graine: number; fin: FinDePartie; retour: string }

/** En dessous de ce nombre de notions ou de questions, un jeu n'a pas assez de matière. */
export const MINIMUM = 4;
export const PAS_ASSEZ = "Pas assez de notions pour ce jeu.";
/** Le temps pendant lequel la bonne réponse reste montrée avant la suite, en millisecondes. */
export const PAUSE_REPONSE = 1200;
/** Le serveur n'enregistre pas une partie de plus d'une heure : une partie laissée ouverte compte pour une heure. */
const DUREE_MAX = 3600;

/** Ce que le cadre donne au plateau d'un jeu : de quoi tirer ses cartes, et de quoi dire que la partie est finie. */
export interface Partie {
  /** la graine de cette partie ; « Rejouer » en donne une autre */
  graine: number;
  /** à appeler quand la partie est finie : le score (de 0 à 100), la durée en secondes, et une phrase de bilan */
  termine: (score: number, secondes: number, bilan: string) => void;
}

type Enregistrement = Awaited<ReturnType<FinDePartie>>;

const ContextePartie = createContext<Partie | null>(null);

/** La partie en cours, pour le plateau d'un jeu monté dans `CadreJeu`. */
export function usePartie(): Partie {
  const partie = useContext(ContextePartie);
  if (!partie) throw new Error("Le plateau d'un jeu se monte dans CadreJeu.");
  return partie;
}

/**
 * Donne le focus à ce qui vient d'apparaître après une action de l'élève (écran de fin, nouvelle partie, carte suivante) :
 * au clavier, on ne repart pas du haut de la page. S'emploie comme `ref` d'un élément qui vient d'être monté.
 */
export const prendFocus = (element: HTMLElement | null) => { element?.focus(); };

/**
 * Le cadre d'un jeu. Il compte les parties, monte un plateau neuf à chacune, appelle `fin` une seule fois par partie
 * et affiche l'écran de fin avec le record. Le plateau, passé en enfant, lit sa graine et la fonction qui termine
 * la partie avec `usePartie`.
 */
export default function CadreJeu({ graine, fin, retour, manque = null, children }: {
  graine: number;
  fin: FinDePartie;
  retour: string;
  /** ce qui empêche de jouer : ce message remplace alors le jeu */
  manque?: string | null;
  children: ReactNode;
}) {
  const [manche, setManche] = useState(0);
  const [bilan, setBilan] = useState<{ score: number; phrase: string } | null>(null);
  const [record, setRecord] = useState<Enregistrement>(null);
  // Deux repères lus seulement dans les gestionnaires : la partie est-elle déjà finie (pour appeler `fin` une seule fois),
  // et quel est son numéro (pour ignorer une réponse du serveur arrivée après « Rejouer »).
  const dejaFinie = useRef(false);
  const numero = useRef(0);

  const termine = (score: number, secondes: number, phrase: string) => {
    if (dejaFinie.current) return;
    dejaFinie.current = true;
    const partie = numero.current;
    const points = Math.max(0, Math.min(100, Math.round(score)));
    setBilan({ score: points, phrase });
    fin(points, Math.max(0, Math.min(DUREE_MAX, Math.round(secondes)))).then(
      (reponse) => { if (numero.current === partie) setRecord(reponse); },
      () => { /* l'enregistrement a échoué : le score reste affiché, sans record */ },
    );
  };
  const rejoue = () => {
    dejaFinie.current = false;
    numero.current += 1;
    setBilan(null);
    setRecord(null);
    setManche(manche + 1);
  };

  if (manque) {
    return (
      <div className="jeu-cadre">
        <div className="carte jeu-vide">
          <p>{manque}</p>
          <div className="actions"><Link className="btn btn-ligne" href={retour}><Icone nom="retour" />Retour aux jeux</Link></div>
        </div>
      </div>
    );
  }
  if (bilan) {
    return (
      <div className="jeu-cadre">
        <div className="carte jeu-fin apparait">
          <h2 className="jeu-fin-titre" tabIndex={-1} ref={prendFocus}>Partie terminée</h2>
          <div className="score-final"><b className="chiffres">{bilan.score}</b><span>{bilan.score > 1 ? "points" : "point"} sur 100</span></div>
          <p className="jeu-fin-phrase">{bilan.phrase}</p>
          <p className="jeu-fin-record" role="status">
            {record && (record.battu
              ? <span className="puce puce-ok jeu-pastille"><Icone nom="flamme" />Nouveau record&nbsp;!</span>
              : <>Ton record&nbsp;: <b className="chiffres">{record.record}</b></>)}
          </p>
          <div className="actions">
            <button type="button" className="btn btn-cuivre" onClick={rejoue}>Rejouer</button>
            <Link className="btn btn-ligne" href={retour}>Retour aux jeux</Link>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="jeu-cadre">
      {/* la clé monte un plateau neuf à chaque partie : son état repart de zéro, sans effet pour le remettre à zéro */}
      <div key={manche} className="jeu-plateau" role="group" aria-label="Partie en cours" tabIndex={-1} ref={manche > 0 ? prendFocus : undefined}>
        <ContextePartie value={{ graine: graine + manche * 7919, termine }}>{children}</ContextePartie>
      </div>
    </div>
  );
}

// ---------- le temps ----------

/**
 * Le chronomètre d'une partie : il part quand le plateau s'affiche. La fonction rendue donne les secondes écoulées.
 * Elle lit l'horloge : elle s'appelle dans un gestionnaire d'événement ou un minuteur, jamais pendant l'affichage.
 */
export function useChrono(): () => number {
  const depart = useRef<number | null>(null);
  useEffect(() => {
    if (depart.current === null) depart.current = Date.now();
  }, []);
  return useCallback(() => (depart.current === null ? 0 : Math.floor((Date.now() - depart.current) / 1000)), []);
}

const sansAbonnement = () => () => {};
/**
 * Faux dans la page rendue par le serveur, vrai dès que le jeu répond dans le navigateur.
 * Ce qui avance avec le temps (une formule qui tombe) attend ce moment, pour partir en même temps que son minuteur.
 */
export const useEnDirect = (): boolean => useSyncExternalStore(sansAbonnement, () => true, () => false);

/**
 * Appelle `rappel` une fois, `ms` millisecondes après que `cle` a pris une valeur. Le minuteur repart si `cle` change ;
 * il est annulé si `cle` redevient nulle ou si le composant disparaît. `rappel` lit toujours l'état le plus récent.
 */
export function useDelai(cle: string | number | null, ms: number, rappel: () => void): void {
  const auTerme = useEffectEvent(rappel);
  useEffect(() => {
    if (cle === null) return;
    const id = setTimeout(() => auTerme(), ms);
    return () => clearTimeout(id);
  }, [cle, ms]);
}

/** « 00:42 », comme le minuteur du mode DS. */
const horloge = (secondes: number) => `${p2(Math.floor(secondes / 60))}:${p2(secondes % 60)}`;
/** « 42 s », « 1 min 05 s » : une durée de partie, dans une phrase. */
export const tempsDit = (secondes: number) => (secondes < 60 ? `${secondes}\u00a0s` : `${Math.floor(secondes / 60)}\u00a0min ${p2(secondes % 60)}\u00a0s`);
/** « 8 bonnes réponses sur 10. » */
export const bilanReponses = (bonnes: number, total: number) => `${pluriel(bonnes, "bonne réponse", "bonnes réponses")} sur ${total}.`;

// ---------- le bandeau ----------

/** Le bandeau au-dessus du plateau : il réunit les compteurs du jeu (score, coups, erreurs, temps, vies). */
export function BandeauJeu({ children }: { children: ReactNode }) {
  return <div className="jeu-bandeau">{children}</div>;
}

/** Un compteur du bandeau : « Coups 12 », « Question 3 sur 10 ». */
export function Compteur({ nom, valeur, suite }: { nom: string; valeur: ReactNode; suite?: string }) {
  return <span className="jeu-compteur">{nom} <b className="chiffres">{valeur}</b>{suite ? ` ${suite}` : null}</span>;
}

/** Le temps qui passe, dans le bandeau. Il se fige sur `arret` dès que cette valeur est donnée. */
export function TempsJeu({ lis, arret }: { lis: () => number; arret: number | null }) {
  const [secondes, setSecondes] = useState(0);
  const lisMaintenant = useEffectEvent(lis);
  useEffect(() => {
    if (arret !== null) return;
    const id = setInterval(() => setSecondes(lisMaintenant()), 250);
    return () => clearInterval(id);
  }, [arret]);
  return <span className="jeu-compteur" role="timer" aria-label="Temps"><Icone nom="horloge" /><b className="chiffres">{horloge(arret ?? secondes)}</b></span>;
}

/** Les vies qui restent : des pastilles pleines, puis vides. */
export function ViesJeu({ reste, total }: { reste: number; total: number }) {
  return (
    <span className="jeu-compteur jeu-vies" role="img" aria-label={`Vies\u00a0: ${reste} sur ${total}`}>
      Vies
      {Array.from({ length: total }, (_, i) => <i key={i} className={i < reste ? "jeu-vie" : "jeu-vie jeu-vie-perdue"} />)}
    </span>
  );
}

// ---------- les réponses proposées ----------

export interface OptionJeu {
  cle: string;
  /** la réponse, en HTML déjà nettoyé (une notion)... */
  html?: string;
  /** ...ou en texte simple (le titre d'un chapitre) */
  texte?: string;
  /** un repère court devant la réponse, comme le numéro d'un chapitre */
  repere?: string;
}

/**
 * Les réponses proposées, une par bouton. Tant que `choisie` est indéfinie, l'élève peut répondre.
 * Ensuite la bonne réponse passe au vert, celle qu'il a choisie à tort passe au rouge, et les boutons ne répondent plus.
 * Les boutons gardent leur place d'une question à l'autre : au clavier, le focus reste sur le jeu.
 */
export function OptionsJeu({ nom, options, bonne, choisie, repond }: {
  /** ce que lit un lecteur d'écran en arrivant sur les réponses */
  nom: string;
  options: OptionJeu[];
  /** la clé de la bonne réponse */
  bonne: string;
  /** indéfinie : pas encore de réponse ; null : le temps est écoulé sans réponse ; sinon la clé choisie */
  choisie: string | null | undefined;
  repond: (cle: string, bouton: HTMLButtonElement) => void;
}) {
  const fige = choisie !== undefined;
  return (
    <div className="jeu-options" role="group" aria-label={nom}>
      {options.map((o, i) => {
        const juste = fige && o.cle === bonne;
        const fausse = fige && o.cle === choisie && o.cle !== bonne;
        return (
          <button key={i} type="button" aria-disabled={fige}
            className={`jeu-option${juste ? " jeu-bon" : fausse ? " jeu-faux" : fige ? " jeu-eteint" : ""}`}
            onClick={(e) => { if (!fige) repond(o.cle, e.currentTarget); }}>
            {o.repere && <span className="jeu-option-repere">{o.repere}</span>}
            {o.html !== undefined ? <ContenuHtml className="jeu-option-texte" html={o.html} /> : <span className="jeu-option-texte">{o.texte}</span>}
            {juste && <span className="jeu-marque jeu-marque-ok"><Icone nom="ok" /><span className="jeu-sr">Bonne réponse</span></span>}
            {fausse && <span className="jeu-marque jeu-marque-ko"><Icone nom="croix" /><span className="jeu-sr">Ta réponse</span></span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * La ligne qui dit le résultat d'une réponse : une pastille verte, rouge ou neutre, puis un complément.
 * Elle reste dans la page, vide entre deux réponses : c'est elle qu'un lecteur d'écran annonce.
 */
export function Annonce({ verdict, titre, children }: {
  /** null : rien à annoncer pour l'instant */
  verdict: "bon" | "faux" | "neutre" | null;
  titre: string;
  children?: ReactNode;
}) {
  return (
    <p className="jeu-annonce" role="status">
      {verdict !== null && (
        <span className={`puce${verdict === "bon" ? " puce-ok" : verdict === "faux" ? " puce-ko" : ""} jeu-pastille`}>
          {verdict !== "neutre" && <Icone nom={verdict === "bon" ? "ok" : "croix"} />}{titre}
        </span>
      )}
      {verdict !== null && children}
    </p>
  );
}

// ---------- les tirages ----------

const PLAGE = Array.from({ length: 1024 }, (_, k) => k);
/** L'écart entre les graines de deux tirages d'une même partie. */
export const ECART = 104729;

/**
 * Mélange une liste à partir de la graine, comme `melangeGraine`, sans ses régularités sur les petites listes :
 * sur quatre éléments, `melangeGraine` ne donne que 12 des 24 ordres, et la bonne réponse tomberait une fois sur trois
 * en première place. Ici chaque élément reçoit un entier tiré avec `tire` dans une plage de 1024, et la liste est
 * rangée dans l'ordre de ces entiers : tous les ordres sortent, et deux questions de suite ne se ressemblent pas.
 */
export function brasse<T>(liste: readonly T[], graine: number): T[] {
  if (liste.length > PLAGE.length) return melangeGraine(liste, graine);
  const rangs = tire(PLAGE, liste.length, graine);
  return liste.map((element, i) => ({ element, rang: rangs[i] })).sort((a, b) => a.rang - b.rang).map((e) => e.element);
}

/**
 * Les lignes sans deux notions ni deux relations identiques : dans un jeu d'association, une carte n'a qu'une seule
 * réponse possible. De deux lignes qui se ressemblent, la première de la liste est gardée.
 */
export function sansDoublon(lignes: readonly LigneEssentiel[]): LigneEssentiel[] {
  const notions = new Set<string>();
  const relations = new Set<string>();
  const gardees: LigneEssentiel[] = [];
  for (const ligne of lignes) {
    if (notions.has(ligne.notion) || relations.has(ligne.relation)) continue;
    notions.add(ligne.notion);
    relations.add(ligne.relation);
    gardees.push(ligne);
  }
  return gardees;
}

/** Les mêmes lignes, mélangées d'abord : de deux lignes qui se ressemblent, celle qui joue change d'une partie à l'autre. */
export const lignesDePartie = (lignes: readonly LigneEssentiel[], graine: number): LigneEssentiel[] => sansDoublon(brasse(lignes, graine));

/** Les réponses proposées pour une question : la bonne et `nombre` autres tirées dans `autres`, dans un ordre mélangé. */
export function propositions(bonne: OptionJeu, autres: readonly OptionJeu[], nombre: number, graine: number): OptionJeu[] {
  return brasse([bonne, ...brasse(autres, graine).slice(0, nombre)], graine + 1);
}

/** La réponse que propose une ligne du tableau : sa notion. */
export const optionNotion = (ligne: LigneEssentiel): OptionJeu => ({ cle: ligne.id, html: ligne.notion });
