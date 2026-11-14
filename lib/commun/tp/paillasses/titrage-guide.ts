// Le guide de la paillasse Titrage : ce qu'un professeur, debout à côté de l'élève, lui dirait de faire maintenant.
// Il se calcule à partir de l'état de la manipulation et de ce que la vue retient en plus : les outils posés, le
// robinet, la saisie ou la courbe ouverte. Ici aussi, poser un objet : ce que ce geste donne aux règles.
// Fonctions pures : la vue s'en sert pour placer la main et écrire la phrase ; les tests suivent le guide jusqu'au bout
// et vérifient que la manipulation obtenue est sans faute (tests/unitaires/tp/titrage-guide.test.ts).
import { nombre } from "@/lib/commun/format";
import type { GesteBrut } from "../types";
import { equivalenceReelle, lecture, volumeEquivalence, type EtatTitrage, type ReglagesTitrage } from "./titrage";

/** L'ouverture du robinet, de 0 (fermé) à 1 (grand ouvert). Jusqu'à ce seuil, la burette coule goutte à goutte ; au-delà, au filet. */
export const AU_FILET = 0.6;
/** Le temps entre deux gouttes, en secondes : plus d'une seconde robinet à peine ouvert, un quart de seconde au bord du filet. */
export const entreGouttes = (ouverture: number): number => 1.1 - ((Math.min(ouverture, AU_FILET) - 0.05) / (AU_FILET - 0.05)) * 0.85;
/** Le débit du filet, en mL par seconde. */
export const debitFilet = (ouverture: number): number => 0.3 + ((ouverture - AU_FILET) / (1 - AU_FILET)) * 1.2;

export type ObjetTitrage = "soude" | "poubelle" | "erlenmeyer" | "pipette" | "pissette" | "compte" | "barreau" | "sonde";
export type CibleTitrage = "burette" | "dessous" | "becher" | "vase" | "sonde"
  | "rangement-soude" | "rangement-pipette" | "rangement-pissette" | "rangement-compte" | "rangement-erlenmeyer" | "rangement-poubelle";
export type PoussoirTitrage = "verser" | "aspirer" | "redescendre" | "vider" | "eau" | "goutte";
export type BoutonTitrage = "noter" | "courbe" | "recommencer" | "fini";

/** Les outils posés : le flacon de solution titrante au-dessus de la burette ; la pissette ou le compte-gouttes au-dessus du récipient. */
export interface PosesTitrage { flacon: boolean; outil: "pissette" | "compte" | null }
/** Ce que la vue retient en plus de l'état des règles. */
export interface VueTitrage extends PosesTitrage {
  /** l'ouverture du robinet, de 0 à 1 */
  robinet: number;
  /** la saisie du volume lu est ouverte */
  saisie: boolean;
  /** la courbe des relevés est ouverte */
  courbe: boolean;
}

const ml = (x: number) => `${nombre(x, 2)} mL`;
const noms = (r: ReglagesTitrage) => {
  const sonde = r.suivi !== "indicateur";
  return {
    sonde,
    titrante: r.noms.titrante.toLowerCase(),
    titree: r.noms.titree.toLowerCase(),
    leVase: sonde ? "le bécher" : "l'erlenmeyer",
    LeVase: sonde ? "Le bécher" : "L'erlenmeyer",
    duVase: sonde ? "du bécher" : "de l'erlenmeyer",
    appareil: r.suivi === "conductimetre" ? "conductimètre" : "pH-mètre",
    indicateur: r.indicateur === "bbt" ? "BBT" : "phénolphtaléine",
  };
};

// ---------- poser un objet ----------

/** Ce que donne un objet posé : les gestes pour les règles, les outils posés ensuite, ce qui vient de se passer, et le geste qui vient après. */
export interface Pose { gestes: GesteBrut[]; poses: PosesTitrage; message: string; conseil?: string }

/**
 * Poser un objet sur une cible. `message` dit ce qui vient de se passer ; `conseil`, le geste que l'objet posé permet
 * (la vue l'ajoute quand le guide est coupé : avec le guide, c'est lui qui le dit). Un objet ou une cible inconnus ne changent rien.
 */
export function pose(r: ReglagesTitrage, etat: EtatTitrage, poses: PosesTitrage, objet: string, cible: string): Pose {
  const n = noms(r);
  const rangement = cible.startsWith("rangement");
  // la pipette laisse la place à ce qui vient au-dessus du récipient
  const pipetteAuRepos: GesteBrut[] = etat.pipette === "erlenmeyer" ? [{ g: "pipette", ou: "repos" }] : [];
  switch (objet) {
    case "soude":
      return rangement ? { gestes: [], poses: { ...poses, flacon: false }, message: `Le flacon de ${n.titrante} est reposé.` }
        : { gestes: [], poses: { ...poses, flacon: true }, message: "Le flacon est au-dessus de la burette.", conseil: "Garde le doigt sur « Verser » pour la remplir." };
    case "poubelle":
      return { gestes: [{ g: "dessous", quoi: rangement ? "rien" : "poubelle" }], poses, message: rangement ? "Le bécher poubelle est revenu sur la paillasse." : "Le bécher poubelle est sous la burette." };
    case "erlenmeyer":
      return { gestes: [{ g: "dessous", quoi: rangement ? "rien" : "erlenmeyer" }, ...pipetteAuRepos], poses: { ...poses, outil: null }, message: rangement ? `${n.LeVase} est revenu sur la paillasse.` : `${n.LeVase} est sous la burette.` };
    case "pipette": {
      const ou = rangement ? "repos" : cible === "becher" ? "becher" : "erlenmeyer";
      const gestes: GesteBrut[] = [{ g: "pipette", ou }];
      if (ou === "repos") return { gestes, poses, message: "La pipette est reposée." };
      if (ou === "becher") return { gestes, poses, message: "La pipette trempe dans la solution.", conseil: "Garde le doigt sur « Aspirer », puis ajuste le bas du ménisque sur le trait de jauge : regarde la loupe." };
      return { gestes, poses: { ...poses, outil: null }, message: `La pipette est au-dessus ${n.duVase}.`, conseil: "Garde le doigt sur « Vider »." };
    }
    case "pissette":
      if (cible === "sonde") return { gestes: [{ g: "rincersonde" }], poses, message: "Tu rinces la sonde à l'eau distillée." };
      return rangement ? { gestes: [], poses: { ...poses, outil: null }, message: "La pissette est reposée." }
        : { gestes: pipetteAuRepos, poses: { ...poses, outil: "pissette" }, message: `La pissette est au-dessus ${n.duVase}.`, conseil: "Garde le doigt sur « Eau » pour en ajouter." };
    case "compte":
      return rangement ? { gestes: [], poses: { ...poses, outil: null }, message: "Le flacon d'indicateur est reposé." }
        : { gestes: pipetteAuRepos, poses: { ...poses, outil: "compte" }, message: "L'indicateur est au-dessus de l'erlenmeyer.", conseil: "Touche « Goutte » pour en ajouter." };
    case "barreau":
      return { gestes: [{ g: "barreau" }], poses, message: `Le barreau aimanté est dans ${n.leVase}.` };
    case "sonde":
      return { gestes: [{ g: "sonde", dans: !rangement }], poses, message: rangement ? "La sonde est sortie de la solution." : `La sonde du ${n.appareil} est dans le bécher.` };
    default:
      return { gestes: [], poses, message: "" };
  }
}

// ---------- le prochain geste ----------

/** Un pas du guide : la phrase, et le geste à montrer. `etape` : le rang de l'étape du protocole en cours. */
export type PasDuGuide = { cle: string; texte: string; etape: number } & (
  | { geste: "glisser"; objet: ObjetTitrage; cible: CibleTitrage }
  | { geste: "maintenir" | "toucher"; poussoir: PoussoirTitrage }
  /** tourner le robinet (jusqu'à l'ouverture `vers`, de 0 à 1) ou la molette de l'agitateur (jusqu'à la vitesse `vers`) */
  | { geste: "tourner"; molette: "robinet" | "agitateur"; vers: number }
  | { geste: "montrer"; quoi: "loupe" | "couleur" | "appareil" | "repere" }
  /** une touche sous la scène */
  | { geste: "bouton"; bouton: BoutonTitrage }
  | { geste: "attendre" }
);

/** Le zéro est réglé quand le bas du ménisque est à une goutte du zéro, au plus. */
const AU_ZERO = 0.05;
/** La prise d'essai est juste à ce volume près : celui que le professeur accepte sans faute. */
const AU_TRAIT = 0.06;

/**
 * Ce qu'il faut faire maintenant. La fonction rend toujours un pas : le premier geste qui manque, dans l'ordre du
 * protocole. Elle ne lit que ce qu'un professeur verrait par-dessus l'épaule de l'élève.
 */
export function prochain(r: ReglagesTitrage, etat: EtatTitrage, v: VueTitrage): PasDuGuide {
  const n = noms(r);
  const conducti = r.suivi === "conductimetre";
  // le rang des étapes dans le protocole : avec une sonde, la préparation du récipient tient en deux étapes
  const E = n.sonde ? { rincer: 0, remplir: 1, prise: 2, preparer: 3, placer: 4, verser: 5, lire: 6 } : { rincer: 0, remplir: 1, prise: 2, preparer: 3, placer: 3, verser: 4, lire: 5 };
  const ouvert = v.robinet > 0;

  const glisser = (cle: string, etape: number, texte: string, objet: ObjetTitrage, cible: CibleTitrage): PasDuGuide => ({ cle, etape, texte, geste: "glisser", objet, cible });
  const maintenir = (cle: string, etape: number, texte: string, poussoir: PoussoirTitrage): PasDuGuide => ({ cle, etape, texte, geste: "maintenir", poussoir });
  const robinet = (cle: string, etape: number, texte: string, vers: number): PasDuGuide => ({ cle, etape, texte, geste: "tourner", molette: "robinet", vers });
  const bouton = (cle: string, etape: number, texte: string, quel: BoutonTitrage): PasDuGuide => ({ cle, etape, texte, geste: "bouton", bouton: quel });
  const montrer = (cle: string, etape: number, texte: string, quoi: "loupe" | "couleur" | "appareil" | "repere"): PasDuGuide => ({ cle, etape, texte, geste: "montrer", quoi });

  /** Le premier geste qui manque. */
  const pas = (): PasDuGuide => {
    // ----- lire : la courbe ou la saisie est ouverte -----
    if (v.courbe) {
      return montrer("courbe-repere", E.lire, conducti ? "Glisse le repère jusqu'à ce que les deux droites se croisent sur lui : c'est la rupture de pente. Puis touche « Noter ce volume »." : "Glisse le repère au milieu du saut de pH. Puis touche « Noter ce volume ».", "repere");
    }
    if (v.saisie) return montrer("lire", E.lire, "Lis dans la loupe la graduation en face du bas du ménisque. Écris-la avec les chiffres, puis touche « Noter ».", "loupe");

    const commence = etat.depart !== null;
    // ----- tout est fait -----
    if (commence && etat.note !== null) {
      if (ouvert) return robinet("fini-fermer", E.lire, "Ferme le robinet.", 0);
      return bouton("fini", E.lire, "Tout est fait. Touche « J'ai fini » pour appeler le professeur.", "fini");
    }
    // ----- ce qui coule sur la paillasse -----
    if (ouvert && etat.dessous === "rien" && etat.volume > 0) return robinet("renverse", commence ? E.verser : E.remplir, "Ferme vite le robinet : rien n'est posé sous la burette.", 0);

    /** De quoi recevoir ce qui sort de la burette quand on la rince ou qu'on règle son zéro. */
    const versLaPoubelle = (cle: string, etape: number): PasDuGuide | null => {
      if (etat.dessous === "erlenmeyer") return glisser(`${cle}-liberer`, etape, `Remets ${n.leVase} sur la paillasse : la place sous la burette doit être libre.`, "erlenmeyer", "rangement-erlenmeyer");
      if (etat.dessous === "rien") return glisser(`${cle}-poubelle`, etape, "Glisse le bécher poubelle sous la burette.", "poubelle", "dessous");
      return null;
    };

    if (!commence) {
      // ----- rincer la burette : y verser un peu de solution titrante, puis la vider dans le bécher poubelle -----
      if (etat.eauBurette) {
        const manque = versLaPoubelle("rincer", E.rincer);
        if (manque) return manque;
        if (etat.recu < 3 || etat.volume <= 0) {
          if (ouvert) return robinet("rincer-fermer", E.rincer, "Ferme le robinet.", 0);
          if (!v.flacon) return glisser("rincer-flacon", E.rincer, `Prends le flacon de ${n.titrante} et pose-le en haut de la burette.`, "soude", "burette");
          return maintenir("rincer-verser", E.rincer, "Garde le doigt sur « Verser » : mets 3 à 5 mL dans la burette, pour la rincer.", "verser");
        }
        if (!ouvert) return robinet("rincer-vider", E.rincer, "C'est assez. Tourne le robinet en grand : la solution de rinçage part dans le bécher poubelle.", 1);
        return { cle: "rincer-attendre", etape: E.rincer, texte: "Laisse la burette se vider jusqu'au bout.", geste: "attendre" };
      }
      // ----- remplir la burette au-dessus du zéro, puis régler le zéro -----
      const niveau = lecture(etat);
      // on remplit jusqu'au-dessus du zéro : un niveau qui passe devant le zéro en montant n'est pas un zéro réglé
      if (niveau > AU_ZERO || (niveau >= -AU_ZERO && !etat.descendu)) {
        if (ouvert) return robinet("remplir-fermer", E.remplir, "Ferme le robinet.", 0);
        if (!v.flacon) return glisser("remplir-flacon", E.remplir, `Pose le flacon de ${n.titrante} en haut de la burette.`, "soude", "burette");
        return maintenir("remplir-verser", E.remplir, "Garde le doigt sur « Verser » : remplis la burette jusqu'au-dessus du zéro. Lâche avant qu'elle déborde.", "verser");
      }
      if (niveau < -AU_ZERO) {
        const manque = versLaPoubelle("zero", E.remplir);
        if (manque) return manque;
        if (!ouvert) return robinet("zero-ouvrir", E.remplir, "Règle le zéro : entrouvre à peine le robinet, goutte à goutte. Le bas du ménisque doit descendre sur le 0 : regarde la loupe.", 0.3);
        if (v.robinet > AU_FILET) return robinet("zero-ralentir", E.remplir, "Referme un peu le robinet : le zéro se règle goutte à goutte.", 0.3);
        return montrer("zero-attendre", E.remplir, "Regarde la loupe. Dès que le bas du ménisque est sur le 0, ferme le robinet.", "loupe");
      }
      if (ouvert) return robinet("zero-fermer", E.remplir, "Le zéro est réglé : ferme le robinet.", 0);
      if (v.flacon) return glisser("ranger-flacon", E.remplir, `Repose le flacon de ${n.titrante}.`, "soude", "rangement-soude");
      if (etat.dessous === "poubelle") return glisser("ranger-poubelle", E.remplir, "Remets le bécher poubelle sur la paillasse.", "poubelle", "rangement-poubelle");
    }

    // ----- la prise d'essai -----
    const vidage = etat.pipette === "erlenmeyer" && etat.dansPipette > 0;
    if (Math.abs(etat.prise - r.Va) > AU_TRAIT) {
      if (commence || (etat.prise > AU_TRAIT && !vidage)) {
        return bouton("prise-refaire", E.prise, etat.prise <= 0 ? `Il n'y a pas de prise d'essai dans ${n.leVase}. Touche « Recommencer le titrage ».` : `Ta prise d'essai fait ${ml(etat.prise)} au lieu de ${ml(r.Va)}. Touche « Recommencer le titrage » pour la refaire.`, "recommencer");
      }
      if (etat.dessous === "erlenmeyer") return glisser("prise-liberer", E.prise, `Remets ${n.leVase} sur la paillasse : on le prépare avant de le glisser sous la burette.`, "erlenmeyer", "rangement-erlenmeyer");
      // ce qu'il manque dans la pipette pour arriver au trait de jauge : négatif si le liquide le dépasse
      const manque = r.Va - etat.prise - etat.dansPipette;
      if (etat.pipette === "becher") {
        if (manque > AU_TRAIT) return maintenir("prise-aspirer", E.prise, "Garde le doigt sur « Aspirer » : le liquide doit monter jusqu'au trait de jauge, ou juste au-dessus. Regarde la loupe.", "aspirer");
        if (manque < -AU_TRAIT) return { cle: "prise-ajuster", etape: E.prise, texte: "Le liquide dépasse le trait. Touche « Vider » par petits coups : le bas du ménisque doit redescendre sur le trait.", geste: "toucher", poussoir: "redescendre" };
        return glisser("prise-porter", E.prise, `Le bas du ménisque est sur le trait. Porte la pipette au-dessus ${n.duVase}.`, "pipette", "vase");
      }
      if (Math.abs(manque) > AU_TRAIT && !(vidage && etat.prise > AU_TRAIT)) {
        return glisser("prise-plonger", E.prise, etat.dansPipette > 0 ? `Le ménisque n'est pas sur le trait : replonge la pipette dans le bécher de ${n.titree}.` : `Prends la pipette jaugée et plonge-la dans le bécher de ${n.titree}.`, "pipette", "becher");
      }
      if (etat.pipette === "repos") return glisser("prise-porter", E.prise, `Porte la pipette au-dessus ${n.duVase}.`, "pipette", "vase");
      return maintenir("prise-vider", E.prise, `Garde le doigt sur « Vider » : toute la prise d'essai doit couler dans ${n.leVase}.`, "vider");
    }
    if (etat.pipette !== "repos") return glisser("prise-ranger", E.prise, "Repose la pipette.", "pipette", "rangement-pipette");

    // ----- préparer le récipient : l'indicateur, ou l'eau et la sonde ; le barreau ; sous la burette ; l'agitation -----
    const sortir = (cle: string, etape: number): PasDuGuide => glisser(cle, etape, `Remets ${n.leVase} sur la paillasse : il se prépare là.`, "erlenmeyer", "rangement-erlenmeyer");
    if (!n.sonde) {
      if (etat.gouttes === 0 && commence) return bouton("indicateur-refaire", E.preparer, "Tu as versé sans indicateur coloré : rien ne montrera l'équivalence. Touche « Recommencer le titrage ».", "recommencer");
      if (etat.gouttes < 2 && !commence) {
        if (etat.dessous === "erlenmeyer") return sortir("indicateur-liberer", E.preparer);
        if (v.outil !== "compte") return glisser("indicateur-poser", E.preparer, `Pose le flacon de ${n.indicateur} au-dessus de l'erlenmeyer.`, "compte", "vase");
        return { cle: "indicateur-gouttes", etape: E.preparer, texte: `Touche « Goutte » : mets deux ou trois gouttes de ${n.indicateur}.`, geste: "toucher", poussoir: "goutte" };
      }
      if (v.outil === "compte") return glisser("indicateur-ranger", E.preparer, `Repose le flacon de ${n.indicateur}.`, "compte", "rangement-compte");
    } else {
      if (etat.eau < r.eau - 2) {
        if (etat.dessous === "erlenmeyer") return sortir("eau-liberer", E.preparer);
        if (v.outil !== "pissette") return glisser("eau-poser", E.preparer, "Pose la pissette d'eau distillée au-dessus du bécher.", "pissette", "vase");
        return maintenir("eau-verser", E.preparer, `Garde le doigt sur « Eau » : ajoute de l'eau distillée jusqu'à la graduation ${nombre(r.Va + r.eau, 0)} du bécher.`, "eau");
      }
    }
    if (!etat.barreau) return glisser("barreau", E.preparer, `Mets le barreau aimanté dans ${n.leVase}.`, "barreau", "vase");
    if (n.sonde && !etat.sonde) {
      if (etat.dessous === "erlenmeyer") return sortir("sonde-liberer", E.placer);
      if (!etat.sondeRincee) return glisser("sonde-rincer", E.placer, "Rince la sonde : porte la pissette d'eau distillée sur la sonde.", "pissette", "sonde");
      if (v.outil === "pissette") return glisser("eau-ranger", E.placer, "Repose la pissette.", "pissette", "rangement-pissette");
      return glisser("sonde-plonger", E.placer, `Plonge la sonde du ${n.appareil} dans le bécher.`, "sonde", "vase");
    }
    if (v.outil === "pissette") return glisser("eau-ranger", E.placer, "Repose la pissette.", "pissette", "rangement-pissette");
    if (etat.dessous !== "erlenmeyer") {
      if (etat.dessous === "poubelle") return glisser("ranger-poubelle", E.placer, "Remets le bécher poubelle sur la paillasse.", "poubelle", "rangement-poubelle");
      return glisser("placer", E.placer, `Glisse ${n.leVase} sous la burette, sur l'agitateur.`, "erlenmeyer", "dessous");
    }
    if (etat.agitation === 0) return { cle: "agiter", etape: E.placer, texte: "Tourne la molette de l'agitateur : le barreau doit tourner.", geste: "tourner", molette: "agitateur", vers: 3 };

    // ----- le titrage -----
    const equivalence = etat.prise > 0 ? equivalenceReelle(r, etat) : volumeEquivalence(r);
    if (!n.sonde) {
      const depasse = etat.verse - equivalence;
      if (depasse >= 0) {
        if (ouvert) return robinet("titrage-fermer", E.verser, "La couleur a changé pour de bon : ferme le robinet.", 0);
        if (depasse > 0.12 || etat.franchi === "filet") return bouton("titrage-refaire", E.verser, "Tu as dépassé l'équivalence. Touche « Recommencer le titrage » : tu refais une prise d'essai, et tu finis goutte à goutte.", "recommencer");
        return bouton("noter", E.lire, "Touche « Noter le volume ».", "noter");
      }
      if (depasse < -1.5) {
        if (v.robinet <= AU_FILET) return robinet("titrage-filet", E.verser, `Ouvre le robinet au filet. Regarde la tache de couleur, là où la solution tombe dans ${n.leVase}.`, 0.85);
        return montrer("titrage-surveiller", E.verser, "Surveille la tache de couleur. Tant qu'elle reste petite, laisse couler.", "couleur");
      }
      if (v.robinet > AU_FILET) return robinet("titrage-ralentir", E.verser, "La tache de couleur s'étale : l'équivalence approche. Referme presque le robinet, pour finir goutte à goutte.", 0.3);
      if (!ouvert) return robinet("titrage-goutte", E.verser, "Rouvre à peine le robinet : goutte à goutte, jusqu'à ce que la couleur change pour de bon.", 0.3);
      return montrer("titrage-guetter", E.verser, "Goutte à goutte. Dès que tout le mélange change de couleur pour de bon, ferme le robinet.", "couleur");
    }
    // avec une sonde : l'appareil relève un point à chaque arrêt du robinet, ou à chaque goutte
    const arrets = etat.releves.map((p) => p.V).filter((V) => V !== etat.filetEnCours);
    const ajout = etat.verse - Math.max(0, ...arrets);
    const assez = conducti ? arrets.filter((V) => V > equivalence + 0.5).length >= 4 : etat.verse >= equivalence + 2.4;
    if (assez) {
      if (ouvert) return robinet("titrage-fermer", E.verser, conducti ? "Tu as assez de points après la rupture de pente : ferme le robinet." : "Tu as assez de points après le saut : ferme le robinet.", 0);
      return bouton("courbe", E.lire, "Touche « Ouvrir la courbe ».", "courbe");
    }
    if (!conducti && etat.verse >= equivalence - 1.5 && etat.verse < equivalence + 0.6) {
      if (v.robinet > AU_FILET) return robinet("titrage-serrer", E.verser, "Le pH monte plus vite : le saut approche. Referme presque le robinet, pour verser goutte à goutte.", 0.5);
      if (!ouvert) return robinet("titrage-goutte", E.verser, "Rouvre un peu le robinet : goutte à goutte, pour serrer les points pendant le saut de pH.", 0.5);
      return montrer("titrage-saut", E.verser, "Laisse tomber les gouttes : le pH saute, puis se calme. Regarde le pH-mètre.", "appareil");
    }
    if (v.robinet <= AU_FILET) {
      const debut = arrets.length < 2;
      return robinet("titrage-ajout", E.verser, debut ? `Verse par ajouts d'un millilitre : ouvre le robinet au filet, laisse couler 1 mL, puis referme. Le ${n.appareil} relève un point à chaque arrêt.`
        : !conducti && etat.verse >= equivalence ? "Le saut est passé. Encore deux ajouts d'un millilitre : ouvre le robinet au filet." : "Ajout suivant : ouvre le robinet au filet.", 0.8);
    }
    if (ajout >= 0.9) return robinet("titrage-arret", E.verser, `Cela fait 1 mL : referme le robinet. Le ${n.appareil} relève le point.`, 0);
    return montrer("titrage-couler", E.verser, "Laisse couler 1 mL : regarde la burette dans la loupe.", "loupe");
  };

  const p = pas();
  // on ne déplace rien pendant que la burette coule
  return ouvert && p.geste === "glisser" ? robinet("fermer", p.etape, "Ferme d'abord le robinet.", 0) : p;
}
