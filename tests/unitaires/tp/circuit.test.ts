// La paillasse Circuits (lib/commun/tp/paillasses/circuit.ts) : ce que le matériel répond à chaque geste, et ce que le
// professeur dit de la manipulation. Les montages sont joués ici sans le navigateur, geste par geste.
import { describe, expect, it } from "vitest";
import {
  BORNES, CALIBRE, DUREES, FILS_MAX, POINTS, R_ENTREE, R_INTERNE, bornesDe, capacite, finDe, ohms, pasDe, placeDe, regime, regles, reponse, tauAttendu, tensionActuelle, tensionMesuree,
  type Acquisition, type EtatCircuit, type ReglagesCircuit, type Reseau,
} from "@/lib/commun/tp/paillasses/circuit";
import { niveauPour, rejoue, type GesteBrut } from "@/lib/commun/tp/types";

// une boîte : trois conducteurs ohmiques dont celui du protocole (10 kΩ), le condensateur (330 µF), l'interrupteur
const r: ReglagesCircuit = {
  boite: [
    { id: "ra", genre: "resistance", valeur: 1_000 }, { id: "rb", genre: "resistance", valeur: 100_000 }, { id: "rc", genre: "resistance", valeur: 10_000 },
    { id: "condo", genre: "condensateur", valeur: 330e-6 }, { id: "inter", genre: "interrupteur", valeur: 0 },
  ],
  demande: { R: 10_000, E: 5 },
  reste: 1.8,
};
const joue = (gestes: GesteBrut[], reglages = r): EtatCircuit => rejoue(regles, reglages, gestes);
const fautes = (gestes: GesteBrut[], reglages = r) => regles.bilan(reglages, joue(gestes, reglages)).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);
const relier = (fils: [string, string][]): GesteBrut[] => fils.map(([a, b]) => ({ g: "relier", a, b }));
const courbe = (etat: EtatCircuit): Acquisition => { if (!etat.acquisition) throw new Error("pas de courbe"); return etat.acquisition; };

// ---------- les gestes d'un élève soigneux ----------
/** L'interrupteur, le conducteur ohmique puis le condensateur, de gauche à droite sur la plaque. */
const poser = (resistance = "rc"): GesteBrut[] => [{ g: "poser", quoi: "inter", ou: 0 }, { g: "poser", quoi: resistance, ou: 1 }, { g: "poser", quoi: "condo", ou: 2 }];
const BOUCLE: [string, string][] = [["g+", "a1"], ["a2", "b1"], ["b2", "c1"], ["c2", "g-"]];
const CARTE: [string, string][] = [["voie", "c1"], ["masse", "c2"]];
const decharger: GesteBrut[] = [{ g: "relier", a: "c1", b: "c2" }, { g: "retirer", a: "c1", b: "c2" }];
const acquerir = (duree = 20): GesteBrut[] => [{ g: "duree", v: duree }, { g: "lancer" }, { g: "basculer" }];
/** Le montage soigné, jusqu'à la carte prête à être lancée. */
const monter = (resistance = "rc", E = 5): GesteBrut[] => [...poser(resistance), { g: "tension", v: E }, ...relier(BOUCLE), ...relier(CARTE), ...decharger];
const soignee: GesteBrut[] = [...monter(), ...acquerir(), { g: "noter", v: 3.3 }];

describe("la loi des nœuds", () => {
  const base: Reseau = {
    liens: [["g+", "r1"], ["r2", "c1"], ["c2", "g-"], ["voie", "c1"], ["masse", "c2"]],
    resistances: [{ a: "r1", b: "r2", R: 10_000 }],
    sources: [{ plus: "g+", moins: "g-", E: 5, r: R_INTERNE }],
    condensateur: { a: "c1", b: "c2", C: 330e-6 },
    mesure: { voie: "voie", masse: "masse", entree: R_ENTREE },
    reference: "g-",
  };
  it("un circuit en série : le condensateur tend vers E avec τ = R × C, et la carte lit u_C", () => {
    const rep = reponse(base);
    expect(rep.condensateur).toBe("branche");
    expect(rep.uInf).toBeCloseTo(5, 3);
    expect(rep.Rth).toBeCloseTo(10_001, 0);
    expect(rep.tau).toBeCloseTo(3.3, 2);
    expect([rep.a, rep.b]).toEqual([expect.closeTo(0, 6), expect.closeTo(1, 6)]);
    // une fois le condensateur chargé, plus aucun courant ne passe
    expect(rep.courant).toBeCloseTo(0, 6);
  });
  it("la voie aux bornes de la résistance lit E − u_C ; inversée, elle lit −u_C ; nulle part, elle lit zéro", () => {
    const surR = reponse({ ...base, liens: [["g+", "r1"], ["r2", "c1"], ["c2", "g-"], ["voie", "r1"], ["masse", "r2"]] });
    expect([surR.a, surR.b]).toEqual([expect.closeTo(5, 3), expect.closeTo(-1, 3)]);
    const inverse = reponse({ ...base, liens: [["g+", "r1"], ["r2", "c1"], ["c2", "g-"], ["voie", "c2"], ["masse", "c1"]] });
    expect([inverse.a, inverse.b]).toEqual([expect.closeTo(0, 6), expect.closeTo(-1, 6)]);
    const libre = reponse({ ...base, liens: [["g+", "r1"], ["r2", "c1"], ["c2", "g-"]] });
    expect([libre.a, libre.b]).toEqual([expect.closeTo(0, 6), expect.closeTo(0, 6)]);
    // la masse seule branchée : la voie, reliée à rien, suit la masse à travers l'entrée de la carte
    const uneSeule = reponse({ ...base, liens: [["g+", "r1"], ["r2", "c1"], ["c2", "g-"], ["masse", "g+"]] });
    expect(Math.abs(uneSeule.a)).toBeLessThan(0.01);
  });
  it("un fil entre les bornes de la source : elle débite E / r ; entre celles du condensateur : il est hors jeu", () => {
    expect(reponse({ ...base, liens: [...base.liens, ["g+", "g-"]] }).courant).toBeCloseTo(5 / R_INTERNE, 6);
    const shunte = reponse({ ...base, liens: [...base.liens, ["c1", "c2"]] });
    expect([shunte.condensateur, shunte.tau, shunte.b]).toEqual(["shunte", 0, 0]);
    expect(shunte.courant).toBeCloseTo(5 / 10_001, 6);
    expect(reponse({ ...base, condensateur: null }).condensateur).toBe("absent");
  });
  it("une boucle ouverte : le condensateur ne se charge qu'à travers des fuites", () => {
    const ouvert = reponse({ ...base, liens: [["g+", "r1"], ["c2", "g-"], ["voie", "c1"], ["masse", "c2"]] });
    expect(ouvert.Rth).toBeGreaterThan(1e8);
    // deux résistances en série s'ajoutent ; en dérivation sur le condensateur, elles forment un pont diviseur
    const deux = reponse({ ...base, liens: [["g+", "r1"], ["r2", "s1"], ["s2", "c1"], ["c2", "g-"]], resistances: [...base.resistances, { a: "s1", b: "s2", R: 1_000 }] });
    expect(deux.Rth).toBeCloseTo(11_001, 0);
    const pont = reponse({ ...base, liens: [...base.liens, ["s1", "c1"], ["s2", "c2"]], resistances: [...base.resistances, { a: "s1", b: "s2", R: 10_000 }] });
    expect(pont.uInf).toBeCloseTo(2.5, 2);
    expect(pont.Rth).toBeCloseTo(5_000, -1);
    // sans source, tout est au repos
    expect(reponse({ ...base, sources: [] }).uInf).toBeCloseTo(0, 9);
    // deux sources : leurs effets s'ajoutent, et le courant retenu est le plus grand des deux
    const deuxSources = reponse({ ...base, liens: [...base.liens, ["h+", "g+"]], sources: [...base.sources, { plus: "h+", moins: "g-", E: 3, r: R_INTERNE }] });
    expect(deuxSources.uInf).toBeCloseTo(4, 2);
    expect(deuxSources.courant).toBeCloseTo(1, 2);
  });
});

describe("la plaque, la boîte et les fils", () => {
  it("un composant se pose sur un emplacement libre, se déplace, se range", () => {
    let etat = joue(poser());
    expect(etat.plaque).toEqual(["inter", "rc", "condo"]);
    expect([placeDe(etat, "rc"), placeDe(etat, "ra")]).toEqual([1, -1]);
    // un emplacement pris ne reçoit rien d'autre
    expect(regles.geste(r, etat, { g: "poser", quoi: "ra", ou: 1 })).toBe(etat);
    etat = regles.geste(r, etat, { g: "ranger", quoi: "rc" });
    etat = regles.geste(r, etat, { g: "poser", quoi: "condo", ou: 1 });
    expect(etat.plaque).toEqual(["inter", "condo", null]);
    expect(regles.geste(r, etat, { g: "ranger", quoi: "rc" })).toBe(etat);
  });
  it("on ne pose pas deux fois le même fil, ni un fil sur une borne inconnue, ni plus de fils qu'il n'y en a", () => {
    let etat = joue(relier(BOUCLE));
    expect(etat.fils).toHaveLength(4);
    expect(regles.geste(r, etat, { g: "relier", a: "a1", b: "g+" })).toBe(etat);
    expect(regles.geste(r, etat, { g: "relier", a: "g+", b: "plafond" })).toBe(etat);
    expect(regles.geste(r, etat, { g: "relier", a: "g+", b: "g+" })).toBe(etat);
    etat = regles.geste(r, etat, { g: "retirer", a: "a1", b: "g+" });
    expect(etat.fils).toHaveLength(3);
    expect(regles.geste(r, etat, { g: "retirer", a: "a1", b: "g+" })).toBe(etat);
    const tous = BORNES.flatMap((a, i) => BORNES.slice(i + 1).map((b): [string, string] => [a, b]));
    expect(joue(relier(tous)).fils).toHaveLength(FILS_MAX);
    expect(bornesDe(1)).toEqual(["b1", "b2"]);
  });
  it("un geste inconnu, mal formé ou hors bornes ne change rien", () => {
    const etat = joue(monter());
    const bizarres: GesteBrut[] = [
      { g: "exploser" }, { g: "poser", quoi: "lampe", ou: 0 }, { g: "poser", quoi: "ra", ou: 7 }, { g: "poser", quoi: "ra", ou: 0.5 }, { g: "poser", quoi: "ra" },
      { g: "tension", v: 40 }, { g: "tension", v: 5.3 }, { g: "tension", v: "fort" }, { g: "tension", v: 5 }, { g: "duree", v: 3 }, { g: "duree", v: 2 },
      { g: "relier", a: "g+" }, { g: "retirer", a: 3, b: "g-" }, { g: "noter", v: 3.3 }, { g: "noter", v: -1 }, { g: "arreter" },
    ];
    for (const g of bizarres) expect(regles.geste(r, etat, g), JSON.stringify(g)).toBe(etat);
    // sans interrupteur sur la plaque, rien à basculer
    expect(joue([{ g: "basculer" }])).toEqual(regles.depart(r));
  });
});

describe("le générateur", () => {
  it("sa molette règle la tension, par crans d'un demi-volt, de 0 à 12 V", () => {
    expect(joue([{ g: "tension", v: 4.5 }]).E).toBe(4.5);
    expect(joue([{ g: "tension", v: 12 }, { g: "tension", v: 12.5 }]).E).toBe(12);
  });
  it("un fil entre ses deux bornes le met en sécurité ; il repart quand le fil est retiré", () => {
    let etat = joue([{ g: "tension", v: 5 }, { g: "relier", a: "g+", b: "g-" }]);
    expect([etat.securite, etat.courts]).toEqual([true, 1]);
    etat = regles.geste(r, etat, { g: "retirer", a: "g+", b: "g-" });
    expect([etat.securite, etat.courts]).toEqual([false, 1]);
    // à 0 V, il ne débite rien : pas de sécurité
    expect(joue([{ g: "relier", a: "g+", b: "g-" }]).securite).toBe(false);
    // un court-circuit par l'interrupteur seul : il se déclare quand on le ferme
    const parK: GesteBrut[] = [{ g: "poser", quoi: "inter", ou: 0 }, { g: "tension", v: 5 }, ...relier([["g+", "a1"], ["a2", "g-"]])];
    expect(joue(parK).securite).toBe(false);
    expect(joue([...parK, { g: "basculer" }]).securite).toBe(true);
    // à travers un conducteur ohmique, le courant reste faible
    expect(joue([{ g: "poser", quoi: "ra", ou: 0 }, { g: "tension", v: 12 }, ...relier([["g+", "a1"], ["a2", "g-"]])]).securite).toBe(false);
    expect(regime(r, joue(monter())).securite).toBe(false);
  });
});

describe("le condensateur", () => {
  it("sort de la boîte avec un reste de charge, et le garde tant que rien ne le décharge", () => {
    expect(regles.depart(r).uC).toBe(1.8);
    expect(joue([...poser(), { g: "tension", v: 5 }, ...relier(BOUCLE), ...relier(CARTE)]).uC).toBe(1.8);
    expect(joue([...poser(), { g: "ranger", quoi: "condo" }]).uC).toBe(1.8);
  });
  it("un fil entre ses deux bornes le décharge ; un circuit fermé le charge", () => {
    expect(joue(monter()).uC).toBe(0);
    const charge = joue([...monter(), { g: "basculer" }]);
    expect(charge.uC).toBeCloseTo(5, 3);
    // interrupteur ouvert, il garde sa charge ; générateur à 0 V et interrupteur fermé, il se décharge dans le conducteur ohmique
    expect(joue([...monter(), { g: "basculer" }, { g: "basculer" }]).uC).toBeCloseTo(5, 3);
    expect(joue([...monter(), { g: "basculer" }, { g: "tension", v: 0 }]).uC).toBeCloseTo(0, 6);
    // sa tension du moment : au repos, celle du dernier geste ; pendant un enregistrement, celle de l'instant donné
    const lancee = joue([...monter(), ...acquerir()]);
    expect(tensionActuelle(joue(poser()), null)).toBe(1.8);
    expect(tensionActuelle(lancee, 3.3) / 5).toBeCloseTo(0.632, 2);
    expect(tensionActuelle(lancee, null)).toBeGreaterThan(4.98);
  });
});

describe("la carte d'acquisition", () => {
  it("lancée, elle attend ; elle se déclenche quand la tension bouge", () => {
    const prete = joue([...monter(), { g: "duree", v: 20 }, { g: "lancer" }]);
    expect([prete.carte, prete.acquisition, prete.lancees]).toEqual(["prete", null, 1]);
    const lancee = regles.geste(r, prete, { g: "basculer" });
    expect(lancee.carte).toBe("enregistre");
    const acq = courbe(lancee);
    expect([acq.duree, acq.arret, acq.E, acq.securite, acq.condensateur, acq.morceaux.length]).toEqual([20, null, 5, false, "branche", 1]);
    expect(acq.morceaux[0].tau).toBeCloseTo(3.3, 2);
    expect([pasDe(acq), finDe(acq)]).toEqual([20 / POINTS, 20]);
    // la courbe : elle part de zéro, vaut 63 % de E à t = τ, puis atteint son palier
    expect(tensionMesuree(acq, 0)).toBeCloseTo(0, 6);
    expect(tensionMesuree(acq, 3.3) / 5).toBeCloseTo(0.632, 2);
    expect(tensionMesuree(acq, 20)).toBeGreaterThan(4.98);
  });
  it("un circuit qui ne fait pas bouger la tension ne la déclenche pas", () => {
    // boucle ouverte : il manque le fil de retour
    const ouvert = joue([...poser(), { g: "tension", v: 5 }, ...relier(BOUCLE.slice(0, 3)), ...relier(CARTE), ...decharger, ...acquerir()]);
    expect([ouvert.carte, ouvert.acquisition]).toEqual(["prete", null]);
    // condensateur déjà chargé : l'interrupteur était fermé avant le lancement
    const charge = joue([...monter(), { g: "basculer" }, { g: "lancer" }, { g: "basculer" }, { g: "basculer" }]);
    expect([charge.carte, charge.acquisition]).toEqual(["prete", null]);
    // la décharge, elle, fait bouger la tension : la carte part à ce moment-là
    expect(regles.geste(r, charge, { g: "relier", a: "c1", b: "c2" }).carte).toBe("enregistre");
    expect(regles.geste(r, charge, { g: "arreter" }).carte).toBe("repos");
  });
  it("sans instant, un geste arrive après la fin de l'enregistrement ; avec son instant, il change la courbe", () => {
    const lancee = joue([...monter(), ...acquerir()]);
    // l'interrupteur rouvert à 2 s : le condensateur garde sa tension, la courbe devient une droite
    const coupee = regles.geste(r, lancee, { g: "basculer", t: 2 });
    expect(coupee.carte).toBe("enregistre");
    const acq = courbe(coupee);
    expect(acq.morceaux.map((m) => m.de)).toEqual([0, 2]);
    expect(tensionMesuree(acq, 1)).toBeCloseTo(5 * (1 - Math.exp(-1 / 3.3003)), 3);
    expect(tensionMesuree(acq, 15)).toBeCloseTo(tensionMesuree(acq, 2), 3);
    // refermé à 6 s, il reprend sa charge là où il en était
    const reprise = courbe(regles.geste(r, coupee, { g: "basculer", t: 6 }));
    expect(reprise.morceaux).toHaveLength(3);
    expect(tensionMesuree(reprise, 6 + 3.3)).toBeGreaterThan(tensionMesuree(reprise, 6) + 1);
    // un instant d'avant le dernier geste, ou d'après la fin, ne vaut pas : l'acquisition est allée au bout
    const apres = regles.geste(r, coupee, { g: "basculer", t: 1 });
    expect([apres.carte, courbe(apres).morceaux.length]).toEqual(["repos", 2]);
    // un geste qui ne change pas le circuit ne coupe pas la courbe
    expect(courbe(regles.geste(r, lancee, { g: "relier", a: "voie", b: "b2", t: 3 })).morceaux).toHaveLength(1);
    // sans instant : l'enregistrement est fini, le condensateur est chargé, la courbe reste entière
    const finie = regles.geste(r, lancee, { g: "basculer" });
    expect([finie.carte, finie.ferme, courbe(finie).arret]).toEqual(["repos", false, null]);
    expect(finie.uC).toBeCloseTo(5, 2);
  });
  it("arrêtée en route, la courbe s'arrête là ; relancée, elle efface la précédente et la note", () => {
    const lancee = joue([...monter(), ...acquerir()]);
    const arretee = regles.geste(r, lancee, { g: "arreter", t: 4.26 });
    expect([arretee.carte, courbe(arretee).arret, finDe(courbe(arretee))]).toEqual(["repos", 4.26, 4.2]);
    // hors enregistrement, le condensateur finit de se charger
    expect(arretee.uC).toBeCloseTo(5, 3);
    const notee = regles.geste(r, arretee, { g: "noter", v: 3.3 });
    expect(notee.note).toBe(3.3);
    const relancee = regles.geste(r, notee, { g: "lancer" });
    expect([relancee.carte, relancee.acquisition, relancee.note, relancee.lancees]).toEqual(["prete", null, null, 2]);
    // pendant un enregistrement, lancer ne fait rien ; la durée se règle pour la fois suivante
    expect(regles.geste(r, lancee, { g: "lancer", t: 3 })).toBe(lancee);
    const reglee = regles.geste(r, lancee, { g: "duree", v: 50, t: 3 });
    expect([reglee.duree, courbe(reglee).duree, reglee.carte]).toEqual([50, 20, "enregistre"]);
    expect(DUREES).toContain(reglee.duree);
  });
  it("au-delà de son calibre, la carte écrête", () => {
    const fort = courbe(joue([...monter("rc", 12), ...acquerir()]));
    expect(tensionMesuree(fort, 20)).toBe(CALIBRE);
  });
});

describe("le bilan", () => {
  it("une manipulation soignée n'a aucune faute", () => {
    const b = regles.bilan(r, joue(soignee));
    expect(b.fautes).toEqual([]);
    expect(b.score).toBe(1);
    expect(b.mesures).toEqual({ tau: 3.3, R: 10_000 });
    expect(b.lignes[0]).toContain("3,30 s");
    expect([capacite(r), tauAttendu(r)]).toEqual([330e-6, expect.closeTo(3.3, 9)]);
  });
  it("les composants peuvent se suivre dans un autre ordre, et la courbe se lire au point voisin", () => {
    // le condensateur d'abord, puis le conducteur ohmique et l'interrupteur : la voie va du côté de la borne +
    const autre: GesteBrut[] = [
      { g: "poser", quoi: "condo", ou: 0 }, { g: "poser", quoi: "rc", ou: 1 }, { g: "poser", quoi: "inter", ou: 2 }, { g: "tension", v: 5 },
      ...relier([["g+", "a1"], ["a2", "b1"], ["b2", "c1"], ["c2", "g-"], ["voie", "a1"], ["masse", "a2"]]),
      { g: "relier", a: "a1", b: "a2" }, { g: "retirer", a: "a1", b: "a2" }, ...acquerir(), { g: "noter", v: 3.4 },
    ];
    expect(fautes(autre)).toEqual([]);
    // le condensateur retourné sur son emplacement : la voie suit la borne qui est du côté du +
    const retourne: GesteBrut[] = [...poser(), { g: "tension", v: 5 }, ...relier([["g+", "a1"], ["a2", "b1"], ["b2", "c2"], ["c1", "g-"], ["voie", "c2"], ["masse", "c1"]]), ...decharger, ...acquerir(), { g: "noter", v: 3.3 }];
    expect(fautes(retourne)).toEqual([]);
  });
  it("sans rien faire, la manipulation vaut zéro, et le professeur donne ses valeurs", () => {
    const b = regles.bilan(r, joue([]));
    expect(b.score).toBe(0);
    expect(b.fautes.map((f) => f.code)).toEqual(["acquisition"]);
    expect(b.mesures).toEqual({ tau: 3.3, R: 10_000 });
    expect(regles.bilan(r, joue(monter())).score).toBe(0);
  });
  it("une carte lancée qui n'a rien enregistré : le professeur dit pourquoi", () => {
    const pourquoi = (gestes: GesteBrut[]) => regles.bilan(r, joue(gestes)).fautes[0].texte;
    expect(pourquoi([...poser(), { g: "tension", v: 5 }, ...relier(BOUCLE.slice(0, 3)), ...relier(CARTE), ...acquerir()])).toMatch(/boucle ne se ferme pas/);
    expect(pourquoi([...monter(), { g: "relier", a: "g+", b: "g-" }, ...acquerir()])).toMatch(/en sécurité/);
    expect(pourquoi([...poser().slice(0, 2), { g: "tension", v: 5 }, ...relier(BOUCLE), ...acquerir()])).toMatch(/n'est pas sur la plaque/);
    expect(pourquoi([...monter(), { g: "relier", a: "c1", b: "c2" }, ...acquerir()])).toMatch(/relie encore les deux bornes/);
    expect(pourquoi([...monter("rc", 0), ...acquerir()])).toMatch(/resté à 0 V/);
    expect(pourquoi([...poser(), { g: "tension", v: 5 }, ...relier(BOUCLE), ...decharger, ...acquerir()])).toMatch(/ne sont pas aux bornes du condensateur/);
    expect(pourquoi([...monter(), { g: "lancer" }])).toMatch(/restait à fermer l'interrupteur/);
    expect(pourquoi([...monter(), { g: "basculer" }, { g: "lancer" }])).toMatch(/déjà chargé/);
  });
  it("la voie mal branchée : sur le conducteur ohmique la courbe descend, inversée elle est négative", () => {
    const avec = (carte: [string, string][], note = 3.3): GesteBrut[] => [...poser(), { g: "tension", v: 5 }, ...relier(BOUCLE), ...relier(carte), ...decharger, ...acquerir(), { g: "noter", v: note }];
    const surR = joue(avec([["voie", "b1"], ["masse", "b2"]]));
    expect(tensionMesuree(courbe(surR), 0)).toBeCloseTo(5, 2);
    expect(tensionMesuree(courbe(surR), 20)).toBeLessThan(0.02);
    expect(fautes(avec([["voie", "b1"], ["masse", "b2"]]))).toEqual(["montage!"]);
    const inverse = joue(avec([["voie", "c2"], ["masse", "c1"]]));
    expect(tensionMesuree(courbe(inverse), 20)).toBeLessThan(-4.98);
    expect(fautes(avec([["voie", "c2"], ["masse", "c1"]]))).toEqual(["montage"]);
    // la voie aux bornes du générateur : la tension ne bouge jamais, la carte ne se déclenche pas
    expect(fautes(avec([["voie", "g+"], ["masse", "g-"]]))).toEqual(["acquisition!"]);
    expect(regles.bilan(r, joue(avec([["voie", "g+"], ["masse", "g-"]]))).fautes[0].texte).toMatch(/ne sont pas aux bornes du condensateur/);
    // la carte dans la boucle, à la place d'un fil : le condensateur ne se charge plus
    const enSerie: GesteBrut[] = [...poser(), { g: "tension", v: 5 }, ...relier([["g+", "a1"], ["a2", "b1"], ["b2", "voie"], ["masse", "c1"], ["c2", "g-"]]), ...decharger, ...acquerir(), { g: "noter", v: 3.3 }];
    expect(tensionMesuree(courbe(joue(enSerie)), 10)).toBeGreaterThan(4.9);
    expect(fautes(enSerie)).toEqual(["montage!", "lecture!"]);
  });
  it("une courbe qui n'est pas celle de la charge : condensateur absent, déchargé trop tard, voie branchée ailleurs", () => {
    // la carte lancée avant la décharge : c'est le fil de décharge qui la déclenche
    const tropTard: GesteBrut[] = [...poser(), { g: "tension", v: 5 }, ...relier(BOUCLE), ...relier(CARTE), { g: "duree", v: 20 }, { g: "lancer" }, ...decharger, { g: "basculer" }, { g: "noter", v: 3.3 }];
    expect(courbe(joue(tropTard)).condensateur).toBe("shunte");
    expect(fautes(tropTard)).toEqual(["montage!", "lecture!"]);
    expect(regles.bilan(r, joue(tropTard)).fautes[0].texte).toMatch(/enregistré sa décharge/);
    // le fil de décharge oublié, la voie sur le conducteur ohmique : la tension saute à la fermeture, puis ne bouge plus
    const oublie: GesteBrut[] = [...poser(), { g: "tension", v: 5 }, ...relier(BOUCLE), ...relier([["voie", "b1"], ["masse", "b2"], ["c1", "c2"]]), ...acquerir(), { g: "noter", v: 3.3 }];
    expect(tensionMesuree(courbe(joue(oublie)), 10)).toBeCloseTo(5, 2);
    expect(regles.bilan(r, joue(oublie)).fautes[0].texte).toMatch(/Ce fil sert à le décharger/);
    // sans condensateur sur la plaque, la voie sur le conducteur ohmique : un fil ferme la boucle à sa place
    const absent: GesteBrut[] = [{ g: "poser", quoi: "inter", ou: 0 }, { g: "poser", quoi: "rc", ou: 1 }, { g: "tension", v: 5 }, ...relier(BOUCLE), ...relier([["voie", "b1"], ["masse", "b2"], ["c1", "c2"]]), ...acquerir(), { g: "noter", v: 3.3 }];
    expect(courbe(joue(absent)).condensateur).toBe("absent");
    expect(regles.bilan(r, joue(absent)).fautes[0].texte).toMatch(/n'était pas dans le circuit/);
    // la voie entre la borne + et le milieu de deux conducteurs ohmiques en série : ni la tension du condensateur, ni celle du reste
    const milieu: GesteBrut[] = [{ g: "poser", quoi: "rc", ou: 0 }, { g: "poser", quoi: "rb", ou: 1 }, { g: "poser", quoi: "condo", ou: 2 }, { g: "tension", v: 5 }, ...relier([["a2", "b1"], ["b2", "c1"], ["c2", "g-"], ["voie", "a1"], ["masse", "a2"]]), ...decharger, { g: "duree", v: 50 }, { g: "lancer" }, { g: "relier", a: "g+", b: "a1" }, { g: "noter", v: 36 }];
    expect(regles.bilan(r, joue(milieu)).fautes.map((f) => f.code)).toEqual(["montage"]);
    expect(regles.bilan(r, joue(milieu)).fautes[0].texte).toMatch(/n'étaient pas aux deux bornes du condensateur/);
    // la voie entre la borne + et la borne − à travers l'interrupteur ouvert : une droite, qui saute quand on le ferme
    const droite: GesteBrut[] = [...poser(), { g: "tension", v: 5 }, ...relier(BOUCLE), ...relier([["voie", "a1"], ["masse", "a2"]]), ...decharger, ...acquerir(), { g: "noter", v: 3.3 }];
    expect(regles.bilan(r, joue(droite)).fautes[0].texte).toMatch(/courbe est une droite/);
  });
  it("le condensateur non déchargé : la courbe ne part pas de zéro", () => {
    const sans: GesteBrut[] = [...poser(), { g: "tension", v: 5 }, ...relier(BOUCLE), ...relier(CARTE), ...acquerir()];
    expect(tensionMesuree(courbe(joue(sans)), 0)).toBeCloseTo(1.8, 6);
    // l'élève place le repère à 63 % de 5 V : il lit un temps trop court, et la faute dite est la décharge oubliée
    const lu = -3.3 * Math.log((Math.exp(-1) * 5) / 3.2);
    expect(lu).toBeLessThan(2);
    expect(fautes([...sans, { g: "noter", v: lu }])).toEqual(["decharge!"]);
    // s'il lit autre chose, sa lecture est fausse en plus
    expect(fautes([...sans, { g: "noter", v: 1 }])).toEqual(["decharge!", "lecture!"]);
    expect(regles.bilan(r, joue([...sans, { g: "noter", v: lu }])).fautes[0].texte).toMatch(/part de 1,80 V/);
    // un petit reste de charge : une faute légère
    expect(fautes([...sans, { g: "noter", v: 3.3 }], { ...r, reste: 0.3 })).toEqual(["decharge"]);
    // après une première charge, relancer sans décharger : la carte ne voit rien bouger
    expect(joue([...soignee, { g: "basculer" }, ...acquerir()]).carte).toBe("prete");
  });
  it("le mauvais conducteur ohmique, aucun, ou deux", () => {
    // dix fois trop petit : la charge est dix fois plus rapide, et la mesure suit l'élève
    const petit: GesteBrut[] = [...monter("ra"), ...acquerir(2), { g: "noter", v: 0.33 }];
    expect(fautes(petit)).toEqual(["resistance"]);
    expect(regles.bilan(r, joue(petit)).mesures).toEqual({ tau: 0.33, R: 1_000 });
    // dix fois trop grand : même la plus longue durée ne montre pas le palier
    expect(fautes([...monter("rb"), ...acquerir(50), { g: "noter", v: 33 }])).toEqual(["resistance", "duree"]);
    // aucun : un fil à la place du conducteur ohmique, la courbe est une marche
    const sans: GesteBrut[] = [{ g: "poser", quoi: "inter", ou: 0 }, { g: "poser", quoi: "condo", ou: 2 }, { g: "tension", v: 5 }, ...relier([["g+", "a1"], ["a2", "c1"], ["c2", "g-"]]), ...relier(CARTE), ...decharger, ...acquerir(), { g: "noter", v: 0.1 }];
    expect(tensionMesuree(courbe(joue(sans)), 0.1)).toBeCloseTo(5, 3);
    expect(fautes(sans)).toEqual(["resistance!", "lecture!"]);
    // deux en série, sans interrupteur : le dernier fil ferme le circuit
    const deux: GesteBrut[] = [{ g: "poser", quoi: "ra", ou: 0 }, { g: "poser", quoi: "rc", ou: 1 }, { g: "poser", quoi: "condo", ou: 2 }, { g: "tension", v: 5 }, ...relier(BOUCLE.slice(0, 3)), ...relier(CARTE), ...decharger, { g: "duree", v: 20 }, { g: "lancer" }, { g: "relier", a: "c2", b: "g-" }, { g: "noter", v: 3.63 }];
    expect(fautes(deux)).toEqual(["resistance!"]);
    expect(regles.bilan(r, joue(deux)).fautes[0].texte).toMatch(/11 kΩ/);
  });
  it("une dérivation : le condensateur ne se charge pas jusqu'à la tension du générateur", () => {
    // un second conducteur ohmique branché aux bornes du condensateur
    const pont: GesteBrut[] = [{ g: "poser", quoi: "rc", ou: 0 }, { g: "poser", quoi: "ra", ou: 1 }, { g: "poser", quoi: "condo", ou: 2 }, { g: "tension", v: 5 }, ...relier([["a2", "c1"], ["c2", "g-"], ["b1", "c1"], ["b2", "c2"]]), ...relier(CARTE), { g: "lancer" }];
    // sans générateur, le condensateur s'est vidé dans le conducteur ohmique branché à ses bornes
    expect([joue(pont).carte, joue(pont).uC]).toEqual(["prete", 0]);
    const etat = joue([...pont, { g: "relier", a: "g+", b: "a1" }, { g: "noter", v: 0.3 }]);
    expect(courbe(etat).morceaux[0].tau).toBeCloseTo(0.3, 3);
    expect(regles.bilan(r, etat).fautes.map((f) => f.code)).toEqual(["montage"]);
    expect(regles.bilan(r, etat).fautes[0].texte).toMatch(/0,45 V/);
  });
  it("la tension du générateur : une autre que celle du protocole, trop forte pour la carte, ou nulle", () => {
    expect(fautes([...monter("rc", 6), ...acquerir(), { g: "noter", v: 3.3 }])).toEqual(["tension"]);
    expect(fautes([...monter("rc", 12), ...acquerir(), { g: "noter", v: 3.3 }])).toEqual(["tension!"]);
    // à 0 V, le condensateur chargé se vide dans le conducteur ohmique : la courbe descend
    const nulle: GesteBrut[] = [...poser(), ...relier(BOUCLE), ...relier(CARTE), ...acquerir(), { g: "noter", v: 3.3 }];
    expect(tensionMesuree(courbe(joue(nulle)), 3.3)).toBeCloseTo(1.8 * Math.exp(-1), 2);
    expect(fautes(nulle)).toEqual(["tension!"]);
  });
  it("la durée : trop courte, le palier ne se voit pas ; trop longue, la montée est écrasée", () => {
    expect(fautes([...monter(), ...acquerir(10), { g: "noter", v: 3.3 }])).toEqual(["duree"]);
    expect(fautes([...monter(), ...acquerir(50), { g: "noter", v: 3.25 }])).toEqual(["duree"]);
    expect(regles.bilan(r, joue([...monter(), ...acquerir(10), { g: "noter", v: 3.3 }])).fautes[0].texte).toMatch(/95 %/);
    // arrêtée trop tôt, c'est pareil
    expect(fautes([...monter(), ...acquerir(), { g: "arreter", t: 6 }, { g: "noter", v: 3.3 }])).toEqual(["duree"]);
    expect(fautes([...monter(), ...acquerir(), { g: "arreter", t: 15 }, { g: "noter", v: 3.3 }])).toEqual([]);
  });
  it("toucher au circuit pendant l'enregistrement, mettre le générateur en sécurité, mal lire, ne rien noter", () => {
    expect(fautes([...monter(), ...acquerir(), { g: "basculer", t: 2 }, { g: "basculer", t: 6 }, { g: "noter", v: 3.3 }])).toEqual(["touche"]);
    // une fois le palier atteint, rouvrir l'interrupteur ne gêne plus
    expect(fautes([...monter(), ...acquerir(), { g: "basculer", t: 18 }, { g: "noter", v: 3.3 }])).toEqual([]);
    expect(fautes([...poser(), { g: "tension", v: 5 }, { g: "relier", a: "g+", b: "g-" }, { g: "retirer", a: "g+", b: "g-" }, ...relier(BOUCLE), ...relier(CARTE), ...decharger, ...acquerir(), { g: "noter", v: 3.3 }])).toEqual(["court"]);
    // le repère va de point en point : à 6 % près, plus un point de la courbe, la lecture est juste
    expect(fautes([...monter(), ...acquerir(), { g: "noter", v: 3.5 }])).toEqual([]);
    expect(fautes([...monter(), ...acquerir(), { g: "noter", v: 3.1 }])).toEqual([]);
    expect(fautes([...monter(), ...acquerir(), { g: "noter", v: 3.7 }])).toEqual(["lecture"]);
    expect(fautes([...monter(), ...acquerir(), { g: "noter", v: 2.9 }])).toEqual(["lecture"]);
    expect(fautes([...monter(), ...acquerir(), { g: "noter", v: 5 }])).toEqual(["lecture!"]);
    expect(fautes([...monter(), ...acquerir()])).toEqual(["note!"]);
    // le générateur en sécurité pendant l'acquisition : le fil de court-circuit a vidé le condensateur
    const enSecurite: GesteBrut[] = [...poser(), { g: "tension", v: 5 }, ...relier(BOUCLE), ...relier(CARTE), { g: "basculer" }, { g: "lancer" }, { g: "relier", a: "g+", b: "g-" }, { g: "noter", v: 3.3 }];
    expect(fautes(enSecurite)).toEqual(["montage!"]);
  });
  it("les résistances se disent simplement", () => {
    expect([680, 1_000, 6_800, 15_000, 150_000, 1_000_000, 2_250].map(ohms)).toEqual(["680 Ω", "1 kΩ", "6,8 kΩ", "15 kΩ", "150 kΩ", "1 MΩ", "2,25 kΩ"]);
  });
});

describe("le niveau d'une compétence", () => {
  it("A au-dessus de 0,9 ; B à partir de 0,6 ; C à partir de 0,3 ; D en dessous", () => {
    expect([1, 0.9, 0.75, 0.6, 0.5, 0.3, 0.25, 0].map(niveauPour)).toEqual(["A", "A", "B", "B", "C", "C", "D", "D"]);
  });
});
