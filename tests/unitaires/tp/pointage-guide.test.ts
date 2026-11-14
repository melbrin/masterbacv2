// Le guide de la paillasse « pointage » (lib/commun/tp/paillasses/pointage-guide.ts). Un élève de test fait, sans
// réfléchir, exactement ce que le guide lui dit : la manipulation qu'il obtient doit être sans faute, pour chaque
// graine. Le guide est donc complet, dans le bon ordre, et il ne tourne jamais en rond.
import { describe, expect, it } from "vitest";
import { CAMERA, boutsEtalon, centres, droiteJuste, grandeurs, reference, regles, type EtatPointage, type Point, type ReglagesPointage } from "@/lib/commun/tp/paillasses/pointage";
import { AU_CENTRE, aPointer, boutsVises, droiteGardeeJuste, droiteVisee, energieJuste, origineJuste, prochain, reperesJustes, type VuePointage } from "@/lib/commun/tp/paillasses/pointage-guide";
import { PLAFOND_AVEC_GUIDE, avecMarqueDuGuide, rejoue, type GesteBrut } from "@/lib/commun/tp/types";
import chute from "@/lib/serveur/contenu/tp/chute";
import { verifie } from "@/lib/serveur/tp";
import { GRAINES, type EtapeDePaillasse } from "../../outils/tp";

/** L'étape de paillasse du TP, pour une graine. */
function paillasse(graine: number): EtapeDePaillasse {
  const etape = chute.etapes(graine).find((e) => e.genre === "paillasse");
  if (!etape || etape.genre !== "paillasse") throw new Error("pas de paillasse dans le TP");
  return etape;
}
const reglages = (graine: number) => paillasse(graine).paillasse.reglages as ReglagesPointage;
const dixieme = (x: number) => Math.round(x * 10) / 10;

/** Ce que la vue retient à l'ouverture du logiciel. */
const VUE: VuePointage = { ecran: "film", outil: "echelle", image: 0, onglet: "vitesse", droite: { va: 0, vb: 0 }, repere: 0, carnet: "ferme", tenu: null };

interface Suivi { etat: EtatPointage; gestes: GesteBrut[]; cles: string[]; textes: Set<string>; vue: VuePointage; fini: boolean }
/** Toutes les phrases que le guide a dites dans les essais de ce fichier : le dernier essai les relit. */
const entendues = new Set<string>();
interface Eleve {
  /**
   * La maladresse de l'élève, en unités de l'image : à la première tentative d'un geste de visée (un repère, un pointé),
   * il arrive à cette distance du but ; à chaque reprise du même geste, il fait deux fois mieux.
   */
  tremble?: number;
  /** des gestes faits avant d'écouter le guide */
  avant?: GesteBrut[];
  /** ce que la vue retient après ces gestes */
  vue?: Partial<VuePointage>;
}

/** L'élève de test : il fait ce que le guide dit, jusqu'à « J'ai fini ». */
function suis(r: ReglagesPointage, eleve: Eleve = {}): Suivi {
  let etat = rejoue(regles, r, eleve.avant ?? []);
  const gestes: GesteBrut[] = [...(eleve.avant ?? [])];
  let vue: VuePointage = { ...VUE, ...eleve.vue };
  const cles: string[] = [];
  const textes = new Set<string>();
  const agit = (g: GesteBrut) => { const suite = regles.geste(r, etat, g); if (suite !== etat) { etat = suite; gestes.push(g); } };
  /** le nombre de fois où chaque geste de visée a déjà été tenté */
  const tentatives = new Map<string, number>();
  let dernier = "", essais = 0, n = 0;
  /** l'écart de la tentative en cours : sa direction tourne d'un geste à l'autre, sa taille diminue de moitié à chaque reprise */
  const ecart = (): Point => {
    const d = (eleve.tremble ?? 0) / 2 ** essais, a = (n++ * Math.PI) / 2 + 0.4;
    return { x: dixieme(d * Math.cos(a)), y: dixieme(d * Math.sin(a)) };
  };
  for (let tour = 0; tour < 1500; tour++) {
    const p = prochain(r, etat, vue);
    if (p.cle !== dernier) { cles.push(p.cle); dernier = p.cle; }
    textes.add(p.texte);
    entendues.add(p.texte);
    if (p.geste === "repere" || p.geste === "pointer" || p.geste === "bout") {
      essais = tentatives.get(p.cle) ?? 0;
      tentatives.set(p.cle, essais + 1);
    }
    switch (p.geste) {
      case "outil": vue = { ...vue, outil: p.outil }; break;
      case "repere": {
        const e = ecart();
        agit(p.quoi === "origine" ? { g: "origine", x: p.vers.x + e.x, y: p.vers.y + e.y } : { g: "etalon", bout: p.quoi, x: p.vers.x + e.x, y: p.vers.y + e.y });
        break;
      }
      case "image": vue = { ...vue, image: vue.image + p.sens }; break;
      case "pointer": {
        const e = ecart();
        agit({ g: "pointer", i: p.image, x: p.ou.x + e.x, y: p.ou.y + e.y });
        // le logiciel passe à l'image suivante après chaque pointé
        vue = { ...vue, image: Math.min(r.images - 1, p.image + 1) };
        break;
      }
      case "onglet": vue = { ...vue, onglet: p.onglet }; break;
      case "bout": {
        // le bout de la droite se pose au vingtième de m/s ; un élève maladroit le pose d'abord à côté
        const v = Math.round((p.vers + (eleve.tremble ?? 0) / 10 / 2 ** essais) * 20) / 20;
        vue = { ...vue, droite: p.cote === "gauche" ? { ...vue.droite, va: v } : { ...vue.droite, vb: v } };
        break;
      }
      case "viser": vue = { ...vue, repere: p.rang }; break;
      case "bouton":
        if (p.bouton === "fini") return { etat, gestes, cles, textes, vue, fini: true };
        if (p.bouton === "longueur") vue = { ...vue, carnet: "longueur" };
        else if (p.bouton === "courbes") vue = { ...vue, ecran: "courbes" };
        else if (p.bouton === "video") vue = { ...vue, ecran: "film" };
        else if (p.bouton === "garder") agit({ g: "droite", va: vue.droite.va, vb: vue.droite.vb });
        else if (p.bouton === "noter") vue = { ...vue, carnet: "ouvert" };
        else vue = { ...vue, carnet: "ferme" };
        break;
      case "ligne": vue = { ...vue, carnet: p.ligne }; break;
      case "ecrire":
        // la longueur de l'étalon se lit dans le protocole ; une énergie se lit au repère, au dixième de millijoule
        agit(p.ligne === "longueur" ? { g: "longueur", v: r.etalon } : { g: "noter", quoi: p.ligne, v: dixieme(grandeurs(r, etat)[vue.repere].Em) });
        vue = { ...vue, carnet: "ferme" };
        break;
      // « Annuler » : la saisie de la longueur se ferme, celle d'une énergie revient aux lignes du carnet
      case "attendre": vue = { ...vue, carnet: vue.carnet === "longueur" ? "ferme" : "ouvert" }; break;
    }
  }
  return { etat, gestes, cles, textes, vue, fini: false };
}

const fautes = (r: ReglagesPointage, etat: EtatPointage) => regles.bilan(r, etat).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);
const suite = (premier: number, dernier: number) => Array.from({ length: dernier - premier + 1 }, (_, i) => `pointer-${premier + i}`);

describe("l'élève qui suit le guide du pointage", () => {
  it("la manipulation est sans faute, pour chaque graine", () => {
    for (const graine of GRAINES) {
      const r = reglages(graine);
      const s = suis(r);
      expect(s.fini, `graine ${graine} : le guide s'arrête sur ${s.cles.slice(-3).join(", ")}`).toBe(true);
      expect(fautes(r, s.etat), `graine ${graine}`).toEqual([]);
      expect(regles.bilan(r, s.etat).score).toBe(1);
      // les mesures sont celles d'un pointage sans défaut : la pente à la précision de la droite près, les énergies au dixième
      const m = regles.bilan(r, s.etat).mesures, ideal = reference(r);
      expect(Math.abs(m.pente - ideal.pente)).toBeLessThan(0.3);
      expect(Math.abs(m.Em0 - ideal.Em0) / ideal.Em0).toBeLessThan(0.005);
      expect(Math.abs(m.Em1 - ideal.Em1) / ideal.Em1).toBeLessThan(0.005);
      // rejouée par le serveur, la liste des gestes redonne le même état
      expect(rejoue(regles, r, s.gestes)).toEqual(s.etat);
    }
  });
  it("un élève qui vise un peu à côté reste sans faute", () => {
    for (const graine of GRAINES.slice(0, 5)) {
      const r = reglages(graine);
      const s = suis(r, { tremble: 1.2 });
      expect(s.fini, `graine ${graine} : ${s.cles.slice(-3).join(", ")}`).toBe(true);
      expect(fautes(r, s.etat), `graine ${graine}`).toEqual([]);
    }
  });
  it("un élève maladroit est repris jusqu'à ce que chaque geste soit bon", () => {
    for (const graine of GRAINES.slice(0, 4)) {
      const r = reglages(graine);
      const s = suis(r, { tremble: 6 });
      expect(s.fini, `graine ${graine} : ${s.cles.slice(-3).join(", ")}`).toBe(true);
      expect(fautes(r, s.etat), `graine ${graine}`).toEqual([]);
      // chaque image mal pointée a été reprise : le guide est revenu en arrière
      expect(s.cles).toContain("image-reculer");
      expect(rejoue(regles, r, s.gestes)).toEqual(s.etat);
    }
  });
  it("le guide suit l'ordre du protocole, et montre chaque étape", () => {
    const r = reglages(1);
    const { cles, gestes } = suis(r);
    expect(cles).toEqual(["echelle-a", "echelle-b", "longueur-bouton", "longueur-ecrire", "outil-origine", "origine", "outil-pointage", ...suite(0, r.images - 1),
      "courbes", "droite-gauche", "droite-droit", "garder", "onglet-energies", "debut-bouton", "debut-ligne", "debut-ecrire", "repere-fin", "fin-bouton", "fin-ligne", "fin-ecrire", "fini"]);
    // le rang de l'étape du protocole ne recule jamais, et reste dans le protocole
    const protocole = paillasse(1).protocole;
    expect(protocole.length).toBe(5);
    let etat = regles.depart(r);
    let rang = 0;
    for (const g of gestes) {
      etat = regles.geste(r, etat, g);
      const e = prochain(r, etat, VUE).etape;
      expect(e).toBeLessThan(protocole.length);
      expect(e).toBeGreaterThanOrEqual(rang);
      rang = e;
    }
    expect(rang).toBe(protocole.length - 1);
  });
  it("le guide dit le geste, jamais la mesure : ni la longueur de l'étalon, ni une vitesse, ni une énergie", () => {
    const r = reglages(2);
    // toutes les phrases entendues par un élève maladroit, puis celles que donne chaque écran à chaque moment
    const maladroit = suis(r, { tremble: 6 });
    const textes = new Set<string>(maladroit.textes);
    let etat = regles.depart(r);
    for (const g of maladroit.gestes) {
      etat = regles.geste(r, etat, g);
      for (const ecran of ["film", "courbes"] as const) for (const carnet of ["ferme", "ouvert", "longueur", "debut", "fin"] as const) for (const onglet of ["vitesse", "energies"] as const) {
        textes.add(prochain(r, etat, { ...VUE, ecran, carnet, onglet, outil: "pointage" }).texte);
        textes.add(prochain(r, etat, { ...VUE, ecran, carnet, onglet, repere: 99 }).texte);
      }
    }
    expect(textes.size).toBeGreaterThan(60);
    // aucune valeur chiffrée avec son unité, et des phrases courtes : trois lignes au plus sur un téléphone
    for (const texte of textes) {
      expect(texte, texte).not.toMatch(/\d[\d,]*\s?(m|mJ|s|cm|%)(\s|\.|,|$)/);
      expect(texte.length, texte).toBeLessThanOrEqual(126);
    }
    // le protocole, lui, donne la longueur de l'étalon : c'est là que l'élève la lit
    expect(paillasse(2).protocole[0]).toMatch(/\(0,50\sm\)/);
  });
});

describe("pendant qu'un repère glisse, la consigne ne change pas", () => {
  const r = reglages(1);
  const [pied, sommet] = boutsEtalon(r);
  it("le repère A tenu sous le doigt : la consigne reste sur lui, même quand il passe sur le pied de l'étalon", () => {
    const tenu: VuePointage = { ...VUE, tenu: "a" };
    for (const x of [200, 60, 41, 40, 39, 20]) {
      const etat = rejoue(regles, r, [{ g: "etalon", bout: "a", x, y: pied.y }]);
      const p = prochain(r, etat, tenu);
      expect(p).toMatchObject({ cle: "echelle-a", geste: "repere", quoi: "a", pres: false });
      expect(p.texte).toContain("Glisse le repère A");
    }
    // lâché sur le pied, la consigne passe au repère B ; lâché tout près, elle demande de l'ajuster
    expect(prochain(r, rejoue(regles, r, [{ g: "etalon", bout: "a", x: 40.5, y: pied.y }]), VUE).cle).toBe("echelle-b");
    expect(prochain(r, rejoue(regles, r, [{ g: "etalon", bout: "a", x: 45, y: pied.y }]), VUE)).toMatchObject({ cle: "echelle-a", pres: true });
    expect(prochain(r, rejoue(regles, r, [{ g: "etalon", bout: "a", x: 45, y: pied.y }]), VUE).texte).toContain("Presque");
  });
  it("un repère repris alors que le guide est plus loin : la consigne revient sur lui, le temps du geste", () => {
    const etalonne: GesteBrut[] = [{ g: "etalon", bout: "a", x: pied.x, y: pied.y }, { g: "etalon", bout: "b", x: sommet.x, y: sommet.y }, { g: "longueur", v: r.etalon }];
    const etat = rejoue(regles, r, etalonne);
    expect(prochain(r, etat, VUE).cle).toBe("outil-origine");
    expect(prochain(r, etat, { ...VUE, tenu: "b" }).cle).toBe("echelle-b");
    expect(prochain(r, etat, { ...VUE, outil: "origine", tenu: "origine" }).cle).toBe("origine");
  });
  it("un bout de la droite tenu sous le doigt : la consigne reste sur lui", () => {
    const s = suis(r);
    const sansDroite = rejoue(regles, r, s.gestes.filter((g) => g.g !== "droite" && g.g !== "noter"));
    const visee = droiteVisee(r, sansDroite)!;
    const courbes: VuePointage = { ...VUE, ecran: "courbes", outil: "pointage", image: r.images - 1 };
    for (const va of [visee.va + 1, visee.va, visee.va - 1]) expect(prochain(r, sansDroite, { ...courbes, droite: { va, vb: 0 }, tenu: "gauche" }).cle).toBe("droite-gauche");
    expect(prochain(r, sansDroite, { ...courbes, droite: { va: visee.va, vb: 0 } }).cle).toBe("droite-droit");
    expect(prochain(r, sansDroite, { ...courbes, droite: visee }).cle).toBe("garder");
    expect(prochain(r, sansDroite, { ...courbes, droite: visee, tenu: "droit" }).cle).toBe("droite-droit");
  });
});

describe("ce que le guide vise", () => {
  const r = reglages(3);
  const [pied, sommet] = boutsEtalon(r);
  it("le repère A va au pied de l'étalon, le repère B en haut ; l'inverse convient si l'élève a commencé ainsi", () => {
    expect(boutsVises(r, regles.depart(r))).toEqual({ a: pied, b: sommet, inverse: false });
    const inverse = rejoue(regles, r, [{ g: "etalon", bout: "a", x: sommet.x + 3, y: sommet.y + 2 }]);
    expect(boutsVises(r, inverse)).toEqual({ a: sommet, b: pied, inverse: true });
    const s = suis(r, { avant: [{ g: "etalon", bout: "a", x: sommet.x + 3, y: sommet.y + 2 }] });
    expect(s.cles.slice(0, 3)).toEqual(["echelle-a", "echelle-b", "longueur-bouton"]);
    expect(s.etat.a).toEqual(sommet);
    expect(s.etat.b).toEqual(pied);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("des repères tout près des bouts, mais une échelle encore fausse : le guide fait reprendre le moins bien posé", () => {
    // un étalon d'un demi-mètre : deux unités d'écart à chaque bout font une échelle fausse de 4 %
    const court = reglages(2);
    const [p, s] = boutsEtalon(court);
    const etat = rejoue(regles, court, [{ g: "etalon", bout: "a", x: p.x, y: p.y + 1.6 }, { g: "etalon", bout: "b", x: s.x, y: s.y - 1.9 }]);
    expect(reperesJustes(court, etat)).toBe(false);
    const pas = prochain(court, etat, VUE);
    expect(pas).toMatchObject({ cle: "echelle-b", pres: true });
    expect(pas.texte).toContain("encore un peu fausse");
    expect(fautes(court, suis(court, { avant: [{ g: "etalon", bout: "a", x: p.x, y: p.y + 1.6 }, { g: "etalon", bout: "b", x: s.x, y: s.y - 1.9 }] }).etat)).toEqual([]);
  });
  it("l'origine sur le sol, où qu'elle soit le long du mur", () => {
    expect(origineJuste(regles.depart(r))).toBe(false);
    expect(origineJuste(rejoue(regles, r, [{ g: "origine", x: 250, y: CAMERA.sol + 1.5 }]))).toBe(true);
    expect(origineJuste(rejoue(regles, r, [{ g: "origine", x: pied.x, y: CAMERA.sol - 6 }]))).toBe(false);
  });
  it("la première image à pointer : celle qui manque, ou celle qui est pointée à côté de la balle", () => {
    const vrais = centres(r);
    const pointe = (i: number, dx = 0): GesteBrut => ({ g: "pointer", i, x: vrais[i].x + dx, y: vrais[i].y });
    expect(aPointer(r, regles.depart(r))).toBe(0);
    expect(aPointer(r, rejoue(regles, r, [pointe(0), pointe(1), pointe(3)]))).toBe(2);
    expect(aPointer(r, rejoue(regles, r, [pointe(0), pointe(1, AU_CENTRE + 0.5), pointe(2)]))).toBe(1);
    expect(aPointer(r, rejoue(regles, r, vrais.map((_, i) => pointe(i, 1))))).toBe(-1);
  });
});

describe("le guide rattrape une manipulation mal partie", () => {
  const r = reglages(4);
  const [pied, sommet] = boutsEtalon(r);
  const vrais = centres(r);
  const etalonne: GesteBrut[] = [{ g: "etalon", bout: "a", x: pied.x, y: pied.y }, { g: "etalon", bout: "b", x: sommet.x, y: sommet.y }, { g: "longueur", v: r.etalon }];
  const origine: GesteBrut = { g: "origine", x: pied.x, y: pied.y };
  const pointes: GesteBrut[] = vrais.map((c, i) => ({ g: "pointer", i, x: c.x, y: c.y }));
  /** tout est bien fait jusqu'aux courbes : il reste la droite et les énergies */
  const pointee = [...etalonne, origine, ...pointes];

  it("une longueur d'étalon fausse : il la fait corriger", () => {
    const s = suis(r, { avant: [...etalonne.slice(0, 2), { g: "longueur", v: r.etalon + 0.2 }] });
    expect(s.cles.slice(0, 3)).toEqual(["longueur-bouton", "longueur-ecrire", "outil-origine"]);
    expect(prochain(r, rejoue(regles, r, [...etalonne.slice(0, 2), { g: "longueur", v: r.etalon + 0.2 }]), VUE).texte).toContain("à corriger");
    expect(s.etat.longueur).toBe(r.etalon);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("une origine posée au-dessus du sol : il la fait redescendre", () => {
    const s = suis(r, { avant: [...etalonne, { g: "origine", x: 180, y: CAMERA.sol - 40 }], vue: { outil: "pointage" } });
    expect(s.cles.slice(0, 3)).toEqual(["outil-origine", "origine", "outil-pointage"]);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("des images sautées, d'autres pointées à côté : il y fait revenir, dans l'ordre", () => {
    const avant = [...etalonne, origine, ...pointes.filter((_, i) => i !== 3 && i !== 4), { g: "pointer", i: 8, x: vrais[8].x + 7, y: vrais[8].y - 5 }];
    const s = suis(r, { avant, vue: { outil: "pointage", image: r.images - 1 } });
    expect(s.cles.slice(0, 6)).toEqual(["image-reculer", "pointer-3", "pointer-4", "image-avancer", "pointer-8", "courbes"]);
    expect(prochain(r, rejoue(regles, r, avant), { ...VUE, outil: "pointage", image: 3 }).texte).toMatch(/^Image 4\s: touche le centre de la balle/);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("sur les courbes alors que le pointage n'est pas fini : il fait revenir à la vidéo", () => {
    const avant = [...etalonne, origine, ...pointes.slice(0, 6)];
    const s = suis(r, { avant, vue: { ecran: "courbes", outil: "pointage", image: 6 } });
    expect(s.cles.slice(0, 2)).toEqual(["video", "pointer-6"]);
    expect(s.fini).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("une droite gardée à plat : il la fait régler et garder de nouveau", () => {
    const avant = [...pointee, { g: "droite", va: 1, vb: 1 }];
    expect(droiteGardeeJuste(r, rejoue(regles, r, avant))).toBe(false);
    const s = suis(r, { avant, vue: { outil: "pointage", image: r.images - 1, droite: { va: 1, vb: 1 } } });
    expect(s.cles.slice(0, 4)).toEqual(["courbes", "droite-gauche", "droite-droit", "garder"]);
    expect(prochain(r, rejoue(regles, r, avant), VUE).texte).toContain("ne passe pas au milieu");
    expect(Math.abs(s.etat.droite!.pente - droiteJuste(r, s.etat)!.pente)).toBeLessThan(0.3);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("une énergie mal lue : il fait replacer le repère et relire", () => {
    const tout = grandeurs(r, rejoue(regles, r, pointee));
    const visee = droiteVisee(r, rejoue(regles, r, pointee))!;
    const avant = [...pointee, { g: "droite", ...visee }, { g: "noter", quoi: "debut", v: dixieme(tout[0].Em) }, { g: "noter", quoi: "fin", v: dixieme(tout[3].Em * 1.2) }];
    expect(energieJuste(r, rejoue(regles, r, avant), "debut")).toBe(true);
    expect(energieJuste(r, rejoue(regles, r, avant), "fin")).toBe(false);
    const s = suis(r, { avant, vue: { ecran: "courbes", outil: "pointage", image: r.images - 1, onglet: "energies", repere: 3, droite: visee } });
    expect(s.cles).toEqual(["repere-fin", "fin-bouton", "fin-ligne", "fin-ecrire", "fini"]);
    expect(prochain(r, rejoue(regles, r, avant), { ...VUE, ecran: "courbes", onglet: "energies", repere: 3 }).texte).toContain("à relire");
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("un carnet ouvert trop tôt, ou sur la mauvaise ligne : il le fait refermer", () => {
    const etat = rejoue(regles, r, pointee);
    const courbes: VuePointage = { ...VUE, ecran: "courbes", outil: "pointage", image: r.images - 1 };
    expect(prochain(r, etat, { ...courbes, onglet: "energies", carnet: "ouvert" })).toMatchObject({ cle: "carnet-fermer", geste: "bouton", bouton: "fermer" });
    expect(prochain(r, etat, { ...courbes, onglet: "energies", carnet: "fin" }).cle).toBe("carnet-annuler");
    expect(prochain(r, regles.depart(r), { ...VUE, carnet: "longueur" }).cle).toBe("carnet-annuler");
    const s = suis(r, { avant: pointee, vue: { ...courbes, onglet: "energies", carnet: "fin" } });
    expect(s.cles.slice(0, 3)).toEqual(["carnet-annuler", "carnet-fermer", "onglet-vitesse"]);
    expect(s.fini).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
  });
});

describe("toutes les phrases du guide, entendues dans les essais de ce fichier", () => {
  it("sont courtes (trois lignes au plus sur un téléphone) et ne soufflent aucune valeur", () => {
    expect(entendues.size).toBeGreaterThan(60);
    for (const texte of entendues) {
      expect(texte.length, texte).toBeLessThanOrEqual(126);
      expect(texte, texte).not.toMatch(/\d[\d,]*\s?(m|mJ|s|cm|%)(\s|\.|,|$)/);
    }
  });
});

describe("la marque du guide", () => {
  it("le professeur plafonne une manipulation faite avec le guide, et le dit", async () => {
    const etape = paillasse(1);
    const { gestes } = suis(etape.paillasse.reglages as ReglagesPointage);
    const trouve = async () => regles;
    const seul = await verifie(etape, { g: "paillasse", gestes }, {}, 1, trouve);
    const aide = await verifie(etape, { g: "paillasse", gestes: avecMarqueDuGuide(gestes) }, {}, 1, trouve);
    expect(seul?.retour).toMatchObject({ score: 1, correction: { genre: "paillasse", fautes: [] } });
    expect(aide?.retour).toMatchObject({ score: PLAFOND_AVEC_GUIDE, correction: { genre: "paillasse", fautes: [], guide: true } });
    expect(aide?.mesures).toEqual(seul?.mesures);
  });
});
