"use client";

// Les pièces communes des jeux de mémoire (décision 0013) : l'écran de consigne, le déroulé des manches, le verdict,
// le sablier, les claviers, la saisie, la grille de cases, les réponses à choisir, les pictogrammes et les formes.
// Chaque jeu se monte dans `CadreMemoire`, qui le place dans le cadre commun des jeux (components/jeux/CadreJeu.tsx).
// Rien n'est tiré au hasard pendant l'affichage : tout part de la graine de la partie.

import { useEffect, useEffectEvent, useReducer, useState, type CSSProperties, type ReactNode } from "react";
import Icone from "@/components/appli/Icone";
import CadreJeu, { Annonce, BandeauJeu, Compteur, prendFocus, useChrono, useDelai, usePartie, ViesJeu } from "@/components/jeux/CadreJeu";
import { jeuMemoire, type PropsMemoire } from "@/lib/commun/memoire";
import { nomCase } from "@/lib/commun/memoire/espace";
import { forme, teinte, type FormeColoree } from "@/lib/commun/memoire/formes";
import { picto } from "@/lib/commun/memoire/pictos";
import { avance, DEPART, ERREURS_MAX, partieFinie, scoreSur, type EtatManches } from "@/lib/commun/memoire/regles";
import { graineManche } from "@/lib/commun/memoire/tirage";

// ---------- le cadre et la consigne ----------

/** Ce que l'écran de consigne dit d'un jeu. */
export interface ConsigneJeu {
  /** l'identifiant du jeu dans le registre : il donne son icône */
  jeu: string;
  /** deux phrases courtes : ce qui s'affiche, puis ce qu'il faut faire */
  consigne: readonly [string, string];
  /** ce qui attend l'élève, en quelques mots : « De 3 à 12 chiffres » */
  niveaux: string;
}

// L'écran de consigne : rien ne défile avant l'appui sur « Commencer ».
function Consigne({ jeu, consigne, niveaux, commence }: ConsigneJeu & { commence: () => void }) {
  return (
    <div className="carte mem-consigne apparait">
      <span className="mem-consigne-icone"><Icone nom={jeuMemoire(jeu)?.icone ?? "ampoule"} /></span>
      <div className="mem-consigne-texte">
        <p>{consigne[0]}</p>
        <p>{consigne[1]}</p>
      </div>
      <ul className="mem-consigne-reperes">
        <li className="puce">{niveaux}</li>
        <li className="puce">{ERREURS_MAX} vies</li>
      </ul>
      <button type="button" className="btn btn-cuivre btn-plein" onClick={commence}>Commencer</button>
    </div>
  );
}

/**
 * Donne le focus au plateau qui vient d'apparaître et l'amène en haut de l'écran : sur un téléphone, ce qu'il faut
 * regarder et le clavier tiennent alors ensemble, sans défiler.
 */
const installe = (element: HTMLElement | null) => {
  if (!element) return;
  element.focus({ preventScroll: true });
  element.scrollIntoView({ block: "start" });
};

// La consigne d'abord ; le plateau du jeu se monte à l'appui sur « Commencer », et son chronomètre part à ce moment.
function Depart({ children, ...infos }: ConsigneJeu & { children: ReactNode }) {
  const [parti, setParti] = useState(false);
  if (!parti) return <Consigne {...infos} commence={() => setParti(true)} />;
  return <div className="mem-jeu" tabIndex={-1} ref={installe}>{children}</div>;
}

/**
 * Le cadre d'un jeu de mémoire : le cadre commun des jeux (écran de fin, record, « Rejouer »), l'écran de consigne,
 * puis le plateau passé en enfant. « Rejouer » repart de la consigne, avec une autre graine.
 * L'écran garde la même hauteur de la consigne à l'écran de fin : la page ne bouge pas quand son contenu change.
 */
export function CadreMemoire({ graine, fin, retour, children, ...infos }: PropsMemoire & ConsigneJeu & { children: ReactNode }) {
  return (
    <div className="mem-ecran">
      <CadreJeu graine={graine} fin={fin} retour={retour}>
        <Depart {...infos}>{children}</Depart>
      </CadreJeu>
    </div>
  );
}

// ---------- les manches ----------

/** Le temps pendant lequel une manche réussie reste à l'écran avant la suivante, en millisecondes. */
const PAUSE_JUSTE = 1100;

/** Une partie en cours : où elle en est, et de quoi la faire avancer. */
export interface Manches extends EtatManches {
  /** la graine du tirage de la manche en cours */
  graine: number;
  /** la graine de la partie, pour ce qui se tire une fois pour toutes les manches */
  grainePartie: number;
  /** le nombre de niveaux du jeu */
  niveaux: number;
  /** vrai quand le verdict affiché est celui de la dernière manche */
  derniere: boolean;
  /** la mémorisation est finie : à l'élève de répondre */
  rappelle: () => void;
  /** la réponse est donnée */
  juge: (juste: boolean) => void;
  /** après le verdict : la manche suivante, ou la fin de la partie */
  suite: () => void;
}

/**
 * Le déroulé d'une partie à niveaux (lib/commun/memoire/regles.ts). Une manche réussie laisse place à la suivante
 * après un court moment ; après une manche ratée, l'élève lit la bonne réponse et continue quand il veut.
 * À la fin, le score et la phrase de bilan partent vers le cadre du jeu.
 */
export function useManches(niveaux: number, bilan: (reussis: number) => string): Manches {
  const partie = usePartie();
  const lis = useChrono();
  // la graine est lue une fois, quand le plateau apparaît : si la page se recharge derrière et en donne une autre,
  // ce que l'élève vient de mémoriser ne change pas sous ses yeux
  const [grainePartie] = useState(partie.graine);
  const [etat, agit] = useReducer(avance, DEPART);
  const derniere = partieFinie(etat, niveaux);
  const suite = () => {
    if (derniere) partie.termine(scoreSur(etat.reussis, niveaux), lis(), bilan(etat.reussis));
    else agit({ type: "suite", rang: etat.rang });
  };
  useDelai(etat.phase === "verdict" && etat.juste ? `juste-${etat.rang}` : null, PAUSE_JUSTE, suite);
  return {
    ...etat,
    graine: graineManche(grainePartie, etat.rang),
    grainePartie,
    niveaux,
    derniere,
    rappelle: () => agit({ type: "rappel", rang: etat.rang }),
    juge: (juste) => agit({ type: "verdict", rang: etat.rang, juste }),
    suite,
  };
}

/** Le temps pendant lequel une bonne réponse reste montrée avant la question suivante, en millisecondes. */
const PAUSE_QUESTION = 650;

/**
 * Une suite de questions pendant le rappel d'une manche. Une bonne réponse reste montrée un instant, puis la question
 * suivante arrive ; la dernière bonne réponse gagne la manche, la première mauvaise la perd.
 * `repond` reçoit la réponse choisie et la bonne réponse de la question en cours.
 */
export function useQuestions(m: Manches, nombre: number): { rang: number; choisie: string | undefined; repond: (cle: string, bonne: string) => void } {
  const [rang, setRang] = useState(0);
  const [choisie, setChoisie] = useState<string | undefined>(undefined);
  useDelai(m.phase === "rappel" && choisie !== undefined ? `question-${rang}` : null, PAUSE_QUESTION, () => {
    setRang(rang + 1);
    setChoisie(undefined);
  });
  const repond = (cle: string, bonne: string) => {
    if (m.phase !== "rappel" || choisie !== undefined) return;
    setChoisie(cle);
    if (cle !== bonne) m.juge(false);
    else if (rang + 1 === nombre) m.juge(true);
  };
  return { rang, choisie, repond };
}

/** Le bandeau d'un jeu à niveaux : le niveau, ce qu'il demande (« 5 chiffres »), les vies. */
export function BandeauManches({ m, enjeu }: { m: Manches; enjeu: string }) {
  return (
    <BandeauJeu>
      <Compteur nom="Niveau" valeur={m.niveau + 1} suite={`sur ${m.niveaux}`} />
      <span className="mem-enjeu">{enjeu}</span>
      <ViesJeu reste={ERREURS_MAX - m.erreurs} total={ERREURS_MAX} />
    </BandeauJeu>
  );
}

/**
 * La ligne du verdict d'une manche : « Juste » ou non, un complément, et après une erreur le bouton pour continuer.
 * Elle garde sa place entre deux manches, vide : le reste de l'écran ne bouge pas.
 */
export function Verdict({ m, juste = "Juste", faux = "Ce n'est pas ça", pendant, children }: {
  m: Manches;
  juste?: string;
  faux?: string;
  /** pendant le rappel : ce qui prend la place du bouton, comme un compte et « Valider » */
  pendant?: ReactNode;
  /** un complément au verdict : la bonne réponse en quelques mots */
  children?: ReactNode;
}) {
  const rendu = m.phase === "verdict";
  return (
    <div className="mem-verdict">
      <Annonce verdict={!rendu ? null : m.juste ? "bon" : "faux"} titre={m.juste ? juste : faux}>{children}</Annonce>
      {m.phase === "rappel" && pendant}
      {rendu && !m.juste && (
        <button type="button" className="btn btn-cuivre mem-suite" ref={prendFocus} onClick={m.suite}>
          {m.derniere ? "Voir mon score" : "Continuer"}
        </button>
      )}
    </div>
  );
}

// ---------- le temps de la mémorisation ----------

/** Les durées d'un défilé, en millisecondes : l'attente avant le premier élément, chaque élément, le blanc qui le suit. */
export interface Rythme { amorce: number; montre: number; blanc: number }
/** Un élément par seconde. */
export const UN_PAR_SECONDE: Rythme = { amorce: 700, montre: 800, blanc: 200 };

/** Où en est un défilé : l'élément à montrer, et le nombre d'éléments déjà sortis. */
export interface Defile {
  /** le rang de l'élément à montrer ; null pendant l'attente du départ et pendant les blancs */
  rang: number | null;
  /** le nombre d'éléments déjà sortis, celui qui s'affiche compris */
  vus: number;
}

/**
 * Fait défiler `nombre` éléments un par un tant que `actif` est vrai, puis appelle `fini`.
 * Un blanc sépare deux éléments : sans animation aussi, deux éléments identiques de suite se voient comme deux.
 */
export function useDefile(nombre: number, actif: boolean, fini: () => void, rythme: Rythme = UN_PAR_SECONDE): Defile {
  // le pas : 0 pour l'attente du départ ; 2k + 1 pour l'élément k ; 2k + 2 pour le blanc qui le suit
  const [pas, setPas] = useState(0);
  useDelai(actif ? pas : null, pas === 0 ? rythme.amorce : pas % 2 === 1 ? rythme.montre : rythme.blanc, () => {
    if (pas >= 2 * nombre) fini();
    else setPas(pas + 1);
  });
  return { rang: actif && pas % 2 === 1 ? (pas - 1) / 2 : null, vus: Math.ceil(pas / 2) };
}

/** L'attente avant de montrer ce qu'il faut retenir, en millisecondes : le temps de poser les yeux sur le plateau. */
const AMORCE = 600;

/**
 * Montre quelque chose d'un seul coup pendant `ms` millisecondes tant que `actif` est vrai, puis appelle `fini`.
 * Rend « attente » avant, « montre » pendant, puis « cache » pendant `apres` millisecondes si un écran vide doit suivre.
 */
export function useExposition(actif: boolean, ms: number, fini: () => void, apres = 0): "attente" | "montre" | "cache" {
  const [etape, setEtape] = useState(0);
  useDelai(actif ? etape : null, etape === 0 ? AMORCE : etape === 1 ? ms : apres, () => {
    if (etape === 0) setEtape(1);
    else if (etape === 1 && apres > 0) setEtape(2);
    else fini();
  });
  return etape === 0 ? "attente" : etape === 1 ? "montre" : "cache";
}

// Les secondes qui restent, pour qui a demandé moins d'animations. Sinon la feuille de style les cache.
function Rebours({ ms }: { ms: number }) {
  const [reste, setReste] = useState(Math.ceil(ms / 1000));
  useEffect(() => {
    const terme = Date.now() + ms;
    const id = setInterval(() => setReste(Math.max(0, Math.ceil((terme - Date.now()) / 1000))), 200);
    return () => clearInterval(id);
  }, [ms]);
  return <span className="mem-rebours chiffres">{reste}&nbsp;s</span>;
}

/** Le temps qui reste pour regarder : une barre qui se vide en `ms` millisecondes. Se monte au début du temps. */
export function Sablier({ ms }: { ms: number }) {
  return (
    <div className="mem-sablier" role="timer" aria-label="Temps pour regarder" style={{ "--mem-duree": `${ms}ms` } as CSSProperties}>
      <span className="mem-sablier-barre"><i /></span>
      <Rebours ms={ms} />
    </div>
  );
}

/**
 * Les points sous un défilé ou une série de questions : un par élément. Celui qui s'affiche est marqué, ceux déjà
 * passés sont pleins. `vus` compte les éléments sortis quand rien ne s'affiche (un blanc) ; sans lui, `rang` suffit.
 */
export function Points({ total, rang, vus = rang ?? 0 }: { total: number; rang: number | null; vus?: number }) {
  return (
    <div className="mem-points" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => <i key={i} className={i === rang ? "mem-point-ici" : i < vus ? "mem-point-vu" : undefined} />)}
    </div>
  );
}

// ---------- la saisie et les claviers ----------

type Signe = string | number;

/**
 * Les cases d'une saisie : une par signe attendu. Pendant le rappel, la case à remplir est marquée.
 * Avec `attendu`, chaque signe est comparé à la bonne réponse : un signe faux est barré, pas seulement coloré.
 */
export function Saisie({ nom, total, valeur, paquets, attendu, juste = false }: {
  /** ce que lit un lecteur d'écran avant les signes : « Ta réponse » */
  nom: string;
  total: number;
  valeur: readonly Signe[];
  /** les tailles des paquets, pour espacer les cases ; sans elles, un seul paquet */
  paquets?: readonly number[];
  /** la bonne réponse, pour marquer les signes faux */
  attendu?: readonly Signe[];
  /** vrai pour montrer une réponse juste : toutes les cases passent au vert */
  juste?: boolean;
}) {
  const tailles = paquets ?? [total];
  const enCours = attendu === undefined && !juste;
  /** le rang du premier signe de chaque paquet */
  const debuts = tailles.map((_, p) => tailles.slice(0, p).reduce((somme, taille) => somme + taille, 0));
  return (
    <div className="mem-saisie" role="img" aria-label={`${nom}\u00a0: ${valeur.length > 0 ? valeur.join(" ") : "rien pour l'instant"}`}>
      {tailles.map((taille, p) => (
        <span key={p} className="mem-paquet">
          {Array.from({ length: taille }, (_, k) => {
            const i = debuts[p] + k;
            const signe = valeur[i];
            const faux = attendu !== undefined && signe !== attendu[i];
            return (
              <span key={i} className={`mem-signe${juste || (attendu !== undefined && !faux) ? " mem-signe-juste" : faux ? " mem-signe-faux" : enCours && i === valeur.length ? " mem-signe-ici" : ""}`}>
                {signe ?? ""}
              </span>
            );
          })}
        </span>
      ))}
    </div>
  );
}

interface ActionsClavier {
  tape: (signe: string) => void;
  efface: () => void;
  valide: () => void;
}

// Le clavier de l'ordinateur double le clavier affiché : les signes, Retour arrière pour effacer, Entrée pour valider.
function useFrappe(actif: boolean, signes: readonly string[], actions: ActionsClavier) {
  const frappe = useEffectEvent((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    const cible = e.target instanceof Element ? e.target : null;
    // hors du jeu (un lien du menu, un champ), les touches gardent leur rôle habituel
    if (cible && cible !== document.body && !cible.closest(".jeu-plateau")) return;
    const signe = e.key.toLocaleUpperCase("fr-FR");
    if (signes.includes(signe)) { e.preventDefault(); actions.tape(signe); return; }
    if (e.key === "Backspace") { e.preventDefault(); actions.efface(); return; }
    // sur un bouton, Entrée appuie sur ce bouton : elle ne valide que si le focus est ailleurs
    if (e.key === "Enter" && !cible?.closest("button")) { e.preventDefault(); actions.valide(); }
  });
  useEffect(() => {
    if (!actif) return;
    const ecoute = (e: KeyboardEvent) => frappe(e);
    window.addEventListener("keydown", ecoute);
    return () => window.removeEventListener("keydown", ecoute);
  }, [actif]);
}

interface PropsClavier extends ActionsClavier {
  /** faux pendant la mémorisation et le verdict : le clavier reste à sa place, éteint */
  actif: boolean;
  /** vrai quand la saisie est vide : rien à effacer */
  vide: boolean;
  /** vrai quand la saisie n'accepte plus de signe */
  plein: boolean;
  /** vrai quand la saisie peut être validée */
  pret: boolean;
}

// Une touche d'un clavier.
function Touche({ signe, actif, tape }: { signe: string; actif: boolean; tape: (signe: string) => void }) {
  return <button type="button" className="mem-touche" aria-disabled={!actif} onClick={() => { if (actif) tape(signe); }}>{signe}</button>;
}

// Les deux touches d'action d'un clavier.
function Effacer({ actif, efface }: { actif: boolean; efface: () => void }) {
  return (
    <button type="button" className="btn btn-ligne mem-touche-action" aria-disabled={!actif} onClick={() => { if (actif) efface(); }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="M9 5h11v14H9l-6-7z" /><path d="m12 9.5 5 5M17 9.5l-5 5" />
      </svg>
      <span className="mem-touche-nom">Effacer</span>
    </button>
  );
}
function Valider({ actif, valide }: { actif: boolean; valide: () => void }) {
  return (
    <button type="button" className="btn btn-cuivre mem-touche-action" aria-disabled={!actif} onClick={() => { if (actif) valide(); }}>
      <Icone nom="ok" /><span className="mem-touche-nom">Valider</span>
    </button>
  );
}

const CHIFFRES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

/** Le pavé numérique : dix chiffres, « Effacer » et « Valider ». Il répond aussi au clavier de l'ordinateur. */
export function Pave({ actif, vide, plein, pret, ...actions }: PropsClavier) {
  const tape = (signe: string) => { if (actif && !plein) actions.tape(signe); };
  const efface = () => { if (actif && !vide) actions.efface(); };
  const valide = () => { if (actif && pret) actions.valide(); };
  useFrappe(actif, CHIFFRES, { tape, efface, valide });
  return (
    <div className="mem-pave" role="group" aria-label="Pavé numérique">
      {CHIFFRES.slice(0, 9).map((c) => <Touche key={c} signe={c} actif={actif && !plein} tape={tape} />)}
      <Effacer actif={actif && !vide} efface={efface} />
      <Touche signe="0" actif={actif && !plein} tape={tape} />
      <Valider actif={actif && pret} valide={valide} />
    </div>
  );
}

/** Un clavier de signes (lettres et chiffres), sur `colonnes` colonnes, avec « Effacer » et « Valider » dessous. */
export function Clavier({ signes, colonnes, actif, vide, plein, pret, ...actions }: PropsClavier & { signes: readonly string[]; colonnes: number }) {
  const tape = (signe: string) => { if (actif && !plein) actions.tape(signe); };
  const efface = () => { if (actif && !vide) actions.efface(); };
  const valide = () => { if (actif && pret) actions.valide(); };
  useFrappe(actif, signes, { tape, efface, valide });
  return (
    <div className="mem-clavier" role="group" aria-label="Clavier">
      <div className="mem-clavier-signes" style={{ "--mem-colonnes": colonnes } as CSSProperties}>
        {signes.map((s) => <Touche key={s} signe={s} actif={actif && !plein} tape={tape} />)}
      </div>
      <div className="mem-clavier-actions">
        <Effacer actif={actif && !vide} efface={efface} />
        <Valider actif={actif && pret} valide={valide} />
      </div>
    </div>
  );
}

// ---------- la grille de cases ----------

/** Une case de la grille : sa couleur ne dit jamais seule son état, une marque ou un contenu l'accompagne. */
export interface CaseGrille {
  /** allumée : à retenir ; juste, fausse : touchée à raison ou à tort ; oubliee : il fallait la toucher */
  ton?: "allumee" | "juste" | "fausse" | "oubliee";
  /** ce que la case montre : un numéro, un pictogramme, une forme */
  contenu?: ReactNode;
  /** ce que lit un lecteur d'écran après le nom de la case */
  dit?: string;
}

const DIT_TON = { allumee: "allumée", juste: "juste", fausse: "ce n'était pas celle-ci", oubliee: "il fallait la toucher" } as const;

/** Une grille de cases à toucher. Elle garde ses boutons d'une phase à l'autre : au clavier, le focus reste en place. */
export function Grille({ nom, colonnes, cases, actif, touche }: {
  nom: string;
  colonnes: number;
  cases: readonly CaseGrille[];
  /** faux tant que l'élève regarde : les cases ne répondent pas */
  actif: boolean;
  touche?: (rang: number) => void;
}) {
  return (
    <div className="mem-grille" role="group" aria-label={nom} style={{ "--mem-colonnes": colonnes } as CSSProperties}>
      {cases.map((c, i) => {
        const dit = [c.dit, c.ton ? DIT_TON[c.ton] : null].filter(Boolean).join(", ");
        return (
          <button key={i} type="button" className={`mem-case${c.ton ? ` mem-case-${c.ton}` : ""}`} aria-disabled={!actif}
            aria-label={`Case ${nomCase(i, colonnes)}${dit ? `\u00a0: ${dit}` : ""}`} onClick={() => { if (actif) touche?.(i); }}>
            {c.contenu}
            {(c.ton === "juste" || c.ton === "fausse") && <span className={`mem-case-marque${c.contenu ? " mem-case-coin" : ""}`}><Icone nom={c.ton === "juste" ? "ok" : "croix"} /></span>}
          </button>
        );
      })}
    </div>
  );
}

// ---------- les réponses à choisir ----------

export interface OptionChoix {
  cle: string;
  /** ce que le bouton montre : un mot, un pictogramme et son nom, une couleur et son nom */
  contenu: ReactNode;
}

/**
 * Des réponses à choisir, sur deux colonnes. Tant que `choisie` est indéfinie, l'élève peut répondre. Ensuite la bonne
 * réponse est cochée en vert, celle choisie à tort est barrée d'une croix rouge, et les boutons ne répondent plus.
 */
export function Choix({ nom, options, bonne, choisie, repond, colonnes = 2 }: {
  nom: string;
  options: readonly OptionChoix[];
  bonne: string;
  choisie: string | undefined;
  repond: (cle: string) => void;
  colonnes?: number;
}) {
  const fige = choisie !== undefined;
  return (
    <div className="mem-choix" role="group" aria-label={nom} style={{ "--mem-colonnes": colonnes } as CSSProperties}>
      {/* les boutons gardent leur place d'une question à l'autre : au clavier, le focus reste sur le jeu */}
      {options.map((o, i) => {
        const juste = fige && o.cle === bonne;
        const fausse = fige && o.cle === choisie && o.cle !== bonne;
        return (
          <button key={i} type="button" aria-disabled={fige} className={`mem-option${juste ? " jeu-bon" : fausse ? " jeu-faux" : fige ? " jeu-eteint" : ""}`}
            onClick={() => { if (!fige) repond(o.cle); }}>
            {o.contenu}
            {juste && <span className="jeu-marque jeu-marque-ok mem-option-marque"><Icone nom="ok" /><span className="jeu-sr">Bonne réponse</span></span>}
            {fausse && <span className="jeu-marque jeu-marque-ko mem-option-marque"><Icone nom="croix" /><span className="jeu-sr">Ta réponse</span></span>}
          </button>
        );
      })}
    </div>
  );
}

// ---------- les pictogrammes et les formes ----------

// Les morceaux d'un tracé (lib/commun/memoire/pictos.ts), en éléments SVG.
function morceaux(trace: string, remplissage?: string): ReactNode[] {
  return trace.split("|").map((brut, i) => {
    const signe = "*~#".includes(brut[0]) ? brut[0] : "";
    const m = signe ? brut.slice(1) : brut;
    const classe = signe === "*" ? "mem-trait-fond" : signe === "~" ? "mem-fond" : signe === "#" ? "mem-plein" : undefined;
    if (m.startsWith("c:")) { const [cx, cy, r] = m.slice(2).split(","); return <circle key={i} className={classe} fill={remplissage} cx={cx} cy={cy} r={r} />; }
    if (m.startsWith("r:")) { const [x, y, w, h, rx] = m.slice(2).split(","); return <rect key={i} className={classe} fill={remplissage} x={x} y={y} width={w} height={h} rx={rx} />; }
    return <path key={i} className={classe} fill={remplissage} d={m} />;
  });
}

/** Un pictogramme. Il est décoratif : le bouton ou la case qui le porte dit son nom. */
export function Picto({ id }: { id: string }) {
  return <svg className="mem-picto" viewBox="0 0 24 24" aria-hidden="true" focusable="false">{morceaux(picto(id).trace)}</svg>;
}

/** Un pictogramme et son nom dessous, pour un bouton de réponse. */
export function PictoNomme({ id }: { id: string }) {
  const p = picto(id);
  return <span className="mem-picto-nomme"><Picto id={id} /><span>{p.mot.charAt(0).toLocaleUpperCase("fr-FR") + p.mot.slice(1)}</span></span>;
}

/**
 * Une planche de pictogrammes à regarder. Chacun a son nom pour un lecteur d'écran. `cachee` garde la place de la
 * planche sans rien montrer : l'écran ne bouge pas quand les objets apparaissent.
 */
export function Planche({ nom, pictos, cachee = false }: { nom: string; pictos: readonly string[]; cachee?: boolean }) {
  return (
    <ul className={`mem-planche${cachee ? " mem-cachee" : ""}`} aria-label={nom} aria-hidden={cachee || undefined}>
      {pictos.map((id) => <li key={id} className="mem-tuile"><Picto id={id} /><span className="jeu-sr">{picto(id).mot}</span></li>)}
    </ul>
  );
}

/** Le remplissage qui accompagne chaque teinte : plein, rayé, à pois, vide. Les motifs sont posés par `Motifs`. */
const REMPLISSAGE: Record<string, string> = { bleu: "currentColor", vert: "url(#mem-motif-vert)", rouge: "url(#mem-motif-rouge)", sable: "none" };

/**
 * Les motifs des teintes rayée et à pois. À monter une fois dans un jeu qui affiche des formes colorées :
 * les formes s'y réfèrent par leur identifiant.
 */
export function Motifs() {
  return (
    <svg className="mem-motifs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="mem-motif-vert" width="3.4" height="3.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect className="mem-teinte-vert" width="1.5" height="3.4" fill="currentColor" />
        </pattern>
        <pattern id="mem-motif-rouge" width="4.4" height="4.4" patternUnits="userSpaceOnUse">
          <circle className="mem-teinte-rouge" cx="1.1" cy="1.1" r="1.1" fill="currentColor" />
          <circle className="mem-teinte-rouge" cx="3.3" cy="3.3" r="1.1" fill="currentColor" />
        </pattern>
      </defs>
    </svg>
  );
}

/**
 * Une forme dans sa teinte, avec le remplissage de la teinte. `pleine` force un remplissage uni : les touches de
 * « Suite de couleurs », que leur symbole distingue déjà.
 */
export function FormeDessin({ forme: f, teinte: t, pleine = false }: FormeColoree & { pleine?: boolean }) {
  return (
    <svg className={`mem-forme mem-teinte-${teinte(t).id}${!pleine && t === "sable" ? " mem-forme-vide" : ""}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {morceaux(forme(f).trace, pleine ? "currentColor" : REMPLISSAGE[t])}
    </svg>
  );
}

/** Une forme au trait, sans teinte : le symbole seul, quand sa couleur est la question ou ne compte pas. */
export function FormeTrait({ forme: f }: { forme: string }) {
  return <svg className="mem-forme mem-forme-trait" viewBox="0 0 24 24" aria-hidden="true" focusable="false">{morceaux(forme(f).trace, "none")}</svg>;
}
