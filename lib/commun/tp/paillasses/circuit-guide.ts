// Le guide de la paillasse Circuits : ce qu'un professeur, debout à côté de l'élève, lui dirait de faire maintenant.
// Il se calcule à partir de l'état de la manipulation et de ce que la vue retient en plus : la courbe ouverte, le fil
// que l'élève vient de toucher, l'enregistrement qui se trace. Ici aussi, ce que la vue fait d'un geste : poser un
// composant, appuyer sur la touche de la carte.
// Le guide ne suppose pas que l'élève a suivi ses conseils : il lit le montage tel qu'il est. Un fil est à sa place s'il
// relie deux bornes que le montage du protocole réunit ; une acquisition convient si le professeur n'y trouve rien à redire.
// Fonctions pures : la vue s'en sert pour placer la main et écrire la phrase ; les tests suivent le guide jusqu'au bout
// et vérifient que la manipulation obtenue est sans faute (tests/unitaires/tp/circuit-guide.test.ts).
import { nombre } from "@/lib/commun/format";
import type { GesteBrut } from "../types";
import { CARTE, DUREES, GENERATEUR, bornesDe, composant, ecartAdmis, ohms, placeDe, regles, tauAttendu, type Composant, type EtatCircuit, type ReglagesCircuit } from "./circuit";

/** Ce que la vue retient en plus de l'état des règles. */
export interface VueCircuit {
  /** la courbe est ouverte en grand */
  courbe: boolean;
  /** le fil que l'élève vient de toucher, par ses deux bornes (« a:b ») : sa croix est affichée ; sinon null */
  filChoisi: string | null;
  /** vrai tant que la courbe se trace à l'écran */
  trace: boolean;
}

export type BoutonCircuit = "courbe" | "revenir" | "fini";
/** Un pas du guide : la phrase, et le geste à montrer. `etape` : le rang de l'étape du protocole en cours. */
export type PasDuGuide = { cle: string; texte: string; etape: number } & (
  /** prendre un composant et le poser : sur un emplacement de la plaque (« place0 »), ou dans sa case (« boite ») */
  | { geste: "glisser"; objet: string; cible: string }
  /** tirer un fil d'une borne à une autre */
  | { geste: "relier"; de: string; vers: string }
  /** toucher un fil posé, puis la croix qui le retire */
  | { geste: "toucher"; quoi: "fil" | "croix"; a: string; b: string }
  /** toucher la touche de la carte, ou le bouton de l'interrupteur */
  | { geste: "toucher"; quoi: "carte" | "interrupteur" }
  /** tourner la molette du générateur jusqu'à la tension `vers`, ou celle de la carte jusqu'à la durée `vers` */
  | { geste: "tourner"; molette: "tension" | "duree"; vers: number }
  /** le repère de la courbe ouverte */
  | { geste: "montrer"; quoi: "repere" }
  /** une touche sous la scène */
  | { geste: "bouton"; bouton: BoutonCircuit }
  | { geste: "attendre" }
);

// ---------- ce que la vue fait d'un geste ----------

/** Poser un composant sur une cible : le geste que ça donne aux règles. */
export const pose = (objet: string, cible: string): GesteBrut => (cible.startsWith("place") ? { g: "poser", quoi: objet, ou: Number(cible.slice(5)) } : { g: "ranger", quoi: objet });
/** La touche de la carte : au repos, elle lance l'acquisition ; pendant qu'elle attend ou enregistre, elle l'arrête. */
export const toucheDeLaCarte = (etat: EtatCircuit, trace: boolean): "lancer" | "arreter" => (etat.carte === "repos" || (etat.carte === "enregistre" && !trace) ? "lancer" : "arreter");

/** Le nom d'un composant dans une phrase : « le conducteur ohmique de 10 kΩ », « le condensateur », « l'interrupteur ». */
export const nomComposant = (c: Composant): string => (c.genre === "resistance" ? `le conducteur ohmique de ${ohms(c.valeur)}` : c.genre === "condensateur" ? "le condensateur" : "l'interrupteur");
/** Le même, après « de » : « du condensateur », « de l'interrupteur ». */
export const duComposant = (c: Composant): string => (c.genre === "interrupteur" ? "de l'interrupteur" : `du ${nomComposant(c).slice(3)}`);
/** Le nom d'une borne dans une phrase : « la borne + du générateur », « la borne gauche du condensateur ». */
export function nomBorne(r: ReglagesCircuit, etat: EtatCircuit, id: string): string {
  if (id === GENERATEUR.plus) return "la borne + du générateur";
  if (id === GENERATEUR.moins) return "la borne − du générateur";
  if (id === CARTE.voie) return "la voie de la carte";
  if (id === CARTE.masse) return "la masse de la carte";
  const rang = "abc".indexOf(id[0]);
  const c = composant(r, etat.plaque[rang]);
  return `la borne ${id[1] === "1" ? "gauche" : "droite"} ${c ? duComposant(c) : `de l'emplacement ${rang + 1}, vide`}`;
}
/** Où est un fil, dans une phrase : « entre la voie de la carte et la borne gauche du condensateur », « entre les deux bornes du condensateur ». */
export function entreBornes(r: ReglagesCircuit, etat: EtatCircuit, a: string, b: string): string {
  const bouts = [a, b];
  const rang = "abc".indexOf(a[0]);
  if (a !== b && rang >= 0 && bornesDe(rang).every((borne) => bouts.includes(borne))) {
    const c = composant(r, etat.plaque[rang]);
    return `entre les deux bornes ${c ? duComposant(c) : `de l'emplacement ${rang + 1}, vide`}`;
  }
  if (bouts.includes(GENERATEUR.plus) && bouts.includes(GENERATEUR.moins)) return "entre les deux bornes du générateur";
  if (bouts.includes(CARTE.voie) && bouts.includes(CARTE.masse)) return "entre la voie et la masse de la carte";
  return `entre ${nomBorne(r, etat, a)} et ${nomBorne(r, etat, b)}`;
}

// ---------- le prochain geste ----------

/** Les groupes de bornes qu'une liste de fils réunit : chaque borne y trouve le nom de son groupe. */
function groupes(fils: readonly (readonly [string, string])[]): (borne: string) => string {
  const parent = new Map<string, string>();
  const groupe = (borne: string): string => {
    if (!parent.has(borne)) parent.set(borne, borne);
    let x = borne;
    while (parent.get(x) !== x) x = parent.get(x)!;
    return x;
  };
  for (const [a, b] of fils) parent.set(groupe(a), groupe(b));
  return groupe;
}

/** La durée d'acquisition qui montre la montée, puis le palier : entre quatre et douze fois le temps caractéristique. */
export const dureeConseillee = (r: ReglagesCircuit): number => DUREES.find((d) => d >= 4 * tauAttendu(r) && d <= 12 * tauAttendu(r)) ?? DUREES[DUREES.length - 1];

/** Vrai si le professeur ne trouve rien à redire à la dernière acquisition : le montage, la décharge, la durée, la tension. */
export function acquisitionValable(r: ReglagesCircuit, etat: EtatCircuit): boolean {
  const acq = etat.acquisition;
  if (!acq) return false;
  // le générateur mis en sécurité plus tôt ne se rattrape pas : ce n'est pas l'affaire de cette courbe
  return regles.bilan(r, { ...etat, note: acq.morceaux[0].tau }).fautes.every((f) => f.code === "court");
}

/**
 * Ce qu'il faut faire maintenant. La fonction rend toujours un pas : le premier geste qui manque, dans l'ordre du
 * protocole. Elle ne lit que ce qu'un professeur verrait par-dessus l'épaule de l'élève.
 */
export function prochain(r: ReglagesCircuit, etat: EtatCircuit, v: VueCircuit): PasDuGuide {
  const E = { poser: 0, tension: 1, boucle: 2, carte: 3, decharger: 4, acquerir: 5, refaire: 6, lire: 7 };
  const resistance = r.boite.find((c) => c.genre === "resistance" && c.valeur === r.demande.R);
  const condensateur = r.boite.find((c) => c.genre === "condensateur");
  const interrupteur = r.boite.find((c) => c.genre === "interrupteur");
  const fini: PasDuGuide = { cle: "fini", etape: E.lire, texte: "Tout est fait. Touche « J'ai fini » pour appeler le professeur.", geste: "bouton", bouton: "fini" };
  if (!resistance || !condensateur || !interrupteur) return fini;
  const acq = etat.acquisition;
  const valable = acquisitionValable(r, etat);
  /** une courbe est là, mais elle ne convient pas : tout ce qui suit sert à la refaire */
  const aRefaire = acq !== null && !valable && !v.trace;
  const etapeDe = (rang: number) => (aRefaire ? E.refaire : rang);

  // ----- la courbe ouverte en grand -----
  if (v.courbe) {
    if (!valable) return { cle: "revenir", etape: E.refaire, texte: "Cette courbe ne convient pas pour la mesure. Touche « Revenir à la paillasse ».", geste: "bouton", bouton: "revenir" };
    return { cle: "courbe-repere", etape: E.lire, texte: "Glisse le repère là où la tension vaut 0,63 fois sa valeur finale ; les deux flèches le déplacent d'un point. Puis touche « Noter ce temps ».", geste: "montrer", quoi: "repere" };
  }
  // ----- la courbe se trace : on ne touche à rien -----
  if (v.trace) return { cle: "trace", etape: E.acquerir, texte: "La courbe se trace. Attends la fin de l'acquisition, sans toucher au circuit.", geste: "attendre" };
  // ----- la courbe est bonne : il reste à la lire -----
  if (valable && acq) {
    const lisible = acq.morceaux[0].tau;
    if (etat.note === null) return { cle: "courbe", etape: E.lire, texte: "La courbe est enregistrée, avec sa montée et son palier. Touche « Ouvrir la courbe ».", geste: "bouton", bouton: "courbe" };
    if (Math.abs(etat.note - lisible) > ecartAdmis(acq, lisible)) return { cle: "relire", etape: E.lire, texte: "Ton repère n'était pas au point où la tension vaut 0,63 fois sa valeur finale. Touche « Ouvrir la courbe » pour le replacer.", geste: "bouton", bouton: "courbe" };
    return fini;
  }

  // ----- les composants -----
  const intrus = etat.plaque.map((id) => composant(r, id)).find((c) => c !== undefined && c.genre === "resistance" && c.id !== resistance.id);
  if (intrus) return { cle: `ranger-${intrus.id}`, etape: etapeDe(E.poser), texte: `Le conducteur ohmique de ${ohms(intrus.valeur)} n'est pas celui du protocole. Remets-le dans sa case, dans la boîte.`, geste: "glisser", objet: intrus.id, cible: "boite" };
  const voulus: [Composant, number, string][] = [
    [interrupteur, 0, "Prends l'interrupteur dans la boîte et pose-le sur la plaque."],
    [resistance, 1, `Prends le conducteur ohmique de ${ohms(resistance.valeur)} et pose-le sur la plaque. Sa valeur est écrite dessus.`],
    [condensateur, 2, "Prends le condensateur et pose-le sur la plaque."],
  ];
  for (const [c, prefere, texte] of voulus) {
    if (placeDe(etat, c.id) >= 0) continue;
    const libre = etat.plaque[prefere] === null ? prefere : etat.plaque.indexOf(null);
    if (libre >= 0) return { cle: `poser-${c.genre}`, etape: etapeDe(E.poser), texte, geste: "glisser", objet: c.id, cible: `place${libre}` };
  }
  const [k1, k2] = bornesDe(placeDe(etat, interrupteur.id));
  const [r1, r2] = bornesDe(placeDe(etat, resistance.id));
  const [c1, c2] = bornesDe(placeDe(etat, condensateur.id));
  /** le montage du protocole : la boucle, puis la voie et la masse aux bornes du condensateur */
  const liaisons: [string, string, number][] = [
    [GENERATEUR.plus, k1, E.boucle], [k2, r1, E.boucle], [r2, c1, E.boucle], [c2, GENERATEUR.moins, E.boucle], [CARTE.voie, c1, E.carte], [CARTE.masse, c2, E.carte],
  ];
  const voulu = groupes(liaisons.map(([a, b]) => [a, b]));
  const enTrop = etat.fils.find(([a, b]) => voulu(a) !== voulu(b));
  const relies = groupes(etat.fils.filter(([a, b]) => voulu(a) === voulu(b)));
  const manque = liaisons.find(([a, b]) => relies(a) !== relies(b));
  const charge = Math.abs(etat.uC) > 0.02 * r.demande.E;
  const duree = dureeConseillee(r);
  // ----- la carte ne doit pas guetter pendant qu'on monte ou qu'on décharge : la décharge la déclencherait -----
  const pret = !enTrop && !manque && etat.E === r.demande.E && !etat.ferme && !charge && etat.duree === duree;
  if (etat.carte === "prete" && !pret) return { cle: "arreter", etape: etapeDe(E.acquerir), texte: "La carte attend déjà, mais le montage n'est pas prêt. Touche « Arrêter ».", geste: "toucher", quoi: "carte" };

  // ----- un fil qui met le générateur en sécurité se retire avant tout -----
  const retirer = (fil: readonly [string, string], etape: number, pourquoi: string): PasDuGuide => {
    const [a, b] = fil;
    return v.filChoisi === `${a}:${b}`
      ? { cle: `croix-${a}-${b}`, etape, texte: "Touche la croix : le fil s'en va.", geste: "toucher", quoi: "croix", a, b }
      : { cle: `retirer-${a}-${b}`, etape, texte: `${pourquoi} Touche ce fil, puis la croix qui apparaît.`, geste: "toucher", quoi: "fil", a, b };
  };
  if (enTrop && etat.securite) return retirer(enTrop, etapeDe(E.boucle), "Le générateur s'est mis en sécurité : un fil relie ses deux bornes sans aucune résistance entre elles.");
  // ----- un fil posé de travers, qui le mettrait en sécurité dès que la tension monte, se retire avant de la régler -----
  const monte = (e: EtatCircuit): boolean => regles.geste(r, e, { g: "tension", v: r.demande.E }).securite;
  if (enTrop && etat.E !== r.demande.E && monte(etat)) {
    const deTrop = etat.fils.filter(([a, b]) => voulu(a) !== voulu(b));
    const coupable = deTrop.find(([a, b]) => !monte(regles.geste(r, etat, { g: "retirer", a, b }))) ?? enTrop;
    const surLui = [GENERATEUR.plus, GENERATEUR.moins].every((borne) => coupable.includes(borne));
    return retirer(coupable, etapeDe(E.boucle), `Le fil ${entreBornes(r, etat, coupable[0], coupable[1])} ${surLui ? "le mettrait" : "mettrait le générateur"} en sécurité dès que la tension monte.`);
  }
  // ----- la tension du générateur -----
  if (etat.E !== r.demande.E) return { cle: "tension", etape: etapeDe(E.tension), texte: `Tourne la molette du générateur jusqu'à lire ${nombre(r.demande.E, 1)} V sur son afficheur.`, geste: "tourner", molette: "tension", vers: r.demande.E };
  // ----- l'interrupteur ouvert, avant de câbler et de décharger -----
  if (etat.ferme) return { cle: aRefaire ? "refaire-ouvrir" : "ouvrir", etape: etapeDe(E.boucle), texte: aRefaire ? "Cette courbe ne convient pas : il faut recommencer. Ouvre l'interrupteur : touche « Ouvrir »." : "L'interrupteur doit rester ouvert jusqu'à la mesure. Touche « Ouvrir ».", geste: "toucher", quoi: "interrupteur" };
  // ----- les fils -----
  if (enTrop) {
    const decharge = (enTrop[0] === c1 && enTrop[1] === c2) || (enTrop[0] === c2 && enTrop[1] === c1);
    return retirer(enTrop, etapeDe(decharge ? E.decharger : E.boucle), decharge ? "Le condensateur est déchargé : ce fil a fait son travail." : `Le fil ${entreBornes(r, etat, enTrop[0], enTrop[1])} n'est pas à sa place.`);
  }
  if (manque) {
    const [a, b, etape] = manque;
    return { cle: `relier-${a}-${b}`, etape: etapeDe(etape), texte: `Tire un fil de ${nomBorne(r, etat, a)} à ${nomBorne(r, etat, b)}.`, geste: "relier", de: a, vers: b };
  }
  // ----- la décharge -----
  if (charge) return { cle: "decharger", etape: etapeDe(E.decharger), texte: "Décharge le condensateur : tire un fil de l'une de ses bornes à l'autre.", geste: "relier", de: c1, vers: c2 };
  // ----- la durée, le lancement, l'interrupteur -----
  if (etat.duree !== duree) return { cle: "duree", etape: etapeDe(E.acquerir), texte: `Tourne la molette de la carte jusqu'à lire ${nombre(duree, 0)} s : assez pour voir la montée, puis le palier.`, geste: "tourner", molette: "duree", vers: duree };
  if (etat.carte !== "prete") return { cle: "lancer", etape: etapeDe(E.acquerir), texte: "Touche « Lancer l'acquisition » : la carte attendra que la tension bouge.", geste: "toucher", quoi: "carte" };
  return { cle: "fermer", etape: etapeDe(E.acquerir), texte: "Ferme l'interrupteur : touche « Fermer ». La courbe se trace aussitôt.", geste: "toucher", quoi: "interrupteur" };
}
