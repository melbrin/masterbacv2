// La paillasse « reflux » (lib/commun/tp/paillasses/reflux.ts) et le TP « synthese », qui enchaîne le chauffage à reflux
// et la chromatographie. Les manipulations sont jouées ici sans le navigateur, geste par geste.
import { describe, expect, it } from "vitest";
import { frontActuel, regles as reglesCcm, type ReglagesCcm } from "@/lib/commun/tp/paillasses/ccm";
import { HAUT, M, RHO, affichage, avancementEquilibre, ballonOuvert, circulation, decante, esterForme, masseExacte, masseRecoltee, phases, regime, regles, type EtatReflux, type ReglagesReflux } from "@/lib/commun/tp/paillasses/reflux";
import { rejoue, type GesteBrut, type ReglesPaillasse } from "@/lib/commun/tp/types";
import synthese from "@/lib/serveur/contenu/tp/synthese";
import { GRAINES, controlesCommuns, joueJuste, type EtapeDePaillasse } from "../../outils/tp";

const r: ReglagesReflux = { Va: 10, Vc: 20, duree: 30, recuperation: 0.9, becher: 52.37, noms: { alcool: "alcool benzylique", acide: "acide éthanoïque", ester: "éthanoate de benzyle" } };
const joue = (gestes: GesteBrut[], s: ReglagesReflux = r): EtatReflux => rejoue(regles, s, gestes);
const fautes = (gestes: GesteBrut[], s: ReglagesReflux = r) => regles.bilan(s, joue(gestes, s)).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);
const fois = (n: number, g: GesteBrut): GesteBrut[] => Array.from({ length: n }, () => g);

// ---------- les gestes d'un élève soigneux ----------
const equipement: GesteBrut[] = ["blouse", "lunettes", "gants"].map((quoi) => ({ g: "equiper", quoi, porte: true }));
const alcool = (s: ReglagesReflux): GesteBrut[] => [{ g: "pipette", ou: "flacon" }, { g: "aspirer", v: s.Va + 0.4 }, { g: "vider", v: 0.4 }, { g: "pipette", ou: "ballon" }, { g: "vider", v: s.Va }, { g: "pipette", ou: "repos" }];
const acide = (s: ReglagesReflux): GesteBrut[] => [{ g: "mesurer", v: s.Vc }, { g: "verser", vers: "ballon" }];
const ajouts: GesteBrut[] = [{ g: "ponce" }, { g: "ponce" }, ...fois(5, { g: "goutte" })];
const montage: GesteBrut[] = [{ g: "placer", quoi: "support" }, { g: "placer", quoi: "chauffe" }, { g: "placer", quoi: "pinceb" }, { g: "ballon", ou: "montage" }, { g: "monter", v: 3 }, { g: "placer", quoi: "refrigerant" }, { g: "placer", quoi: "pincer" }];
const eau: GesteBrut[] = [{ g: "tuyau", a: "robinet", b: "bas", pose: true }, { g: "tuyau", a: "haut", b: "evier", pose: true }, { g: "eau", v: 1 }];
const chauffage = (minutes: number, thermostat = 4): GesteBrut[] => [{ g: "thermostat", v: thermostat }, { g: "attendre", v: minutes }, { g: "thermostat", v: 0 }];
const refroidissement: GesteBrut[] = [{ g: "monter", v: 0 }, { g: "attendre", v: 5 }, { g: "eau", v: 0 }, { g: "ballon", ou: "valet" }];
const lavage: GesteBrut[] = [{ g: "transvaser" }, { g: "bouchon", pose: true }, ...fois(3, { g: "agiter" }).flatMap((a) => [a, { g: "degazer" }]), { g: "attendre", v: 3 }, { g: "bouchon", pose: false }];
/** Laisse partir la phase aqueuse dans le bécher poubelle, à la limite près, recueille la phase organique dans le bécher taré, puis note la masse affichée. */
function pesee(s: ReglagesReflux, avant: GesteBrut[], limite = 0, decalage = 0, tare = true): GesteBrut[] {
  const { aqueux, organique } = joue(avant, s);
  const recueil: GesteBrut[] = [{ g: "poubelle", sous: true }, { g: "couler", v: aqueux + limite }, { g: "becher", ou: "balance" }, ...(tare ? [{ g: "tarer" }] : []), { g: "becher", ou: "sous" }, { g: "couler", v: organique + 5 }, { g: "becher", ou: "balance" }];
  return [...recueil, { g: "noter", v: affichage(s, joue([...avant, ...recueil], s)) + decalage }];
}
interface Change { equipement?: GesteBrut[]; alcool?: GesteBrut[]; acide?: GesteBrut[]; ajouts?: GesteBrut[]; montage?: GesteBrut[]; eau?: GesteBrut[]; chauffage?: GesteBrut[]; refroidissement?: GesteBrut[]; lavage?: GesteBrut[] }
/** Les gestes d'avant la pesée. `change` remplace une partie des gestes pour y glisser une faute. */
const avantPesee = (s: ReglagesReflux, c: Change = {}): GesteBrut[] => [
  ...(c.equipement ?? equipement), ...(c.alcool ?? alcool(s)), ...(c.acide ?? acide(s)), ...(c.ajouts ?? ajouts), ...(c.montage ?? montage), ...(c.eau ?? eau),
  ...(c.chauffage ?? chauffage(s.duree)), ...(c.refroidissement ?? refroidissement), ...(c.lavage ?? lavage),
];
/** La synthèse soignée d'une situation. */
function soignee(s: ReglagesReflux = r, c: Change = {}): GesteBrut[] {
  const avant = avantPesee(s, c);
  return [...avant, ...pesee(s, avant)];
}

describe("la chimie de l'estérification", () => {
  it("l'avancement à l'équilibre vaut deux tiers à parts égales, et monte avec l'excès d'un réactif", () => {
    expect(avancementEquilibre(1)).toBeCloseTo(2 / 3, 9);
    expect(avancementEquilibre(2)).toBeCloseTo(0.845, 3);
    for (let x = 1; x < 8; x += 0.5) expect(avancementEquilibre(x + 0.5)).toBeGreaterThan(avancementEquilibre(x));
    expect(avancementEquilibre(8)).toBeLessThan(1);
  });
  it("l'ester se forme avec le temps de chauffage, et le réactif en défaut le limite", () => {
    const base = { ...regles.depart(r), alcool: 10, acide: 20 };
    expect(esterForme(base)).toBe(0);
    expect(esterForme({ ...base, efficace: 10 })).toBeLessThan(esterForme({ ...base, efficace: 30 }));
    const limite = (RHO.alcool * 10) / M.alcool;
    expect(esterForme({ ...base, efficace: 300 })).toBeCloseTo(limite * avancementEquilibre(((RHO.acide * 20) / M.acide) / limite), 6);
    expect(esterForme({ ...base, efficace: 300 })).toBeLessThan(limite);
    // trop peu d'acide : c'est lui qui limite
    expect(esterForme({ ...base, acide: 2, efficace: 300 })).toBeLessThan((RHO.acide * 2) / M.acide);
    expect(esterForme({ ...base, alcool: 0, efficace: 300 })).toBe(0);
    expect(masseExacte(r)).toBeCloseTo(11.7, 1);
  });
});

describe("la préparation du ballon", () => {
  it("ce qui manque quand on manipule un produit est relevé, même si on s'équipe ensuite", () => {
    expect(joue([...equipement, ...alcool(r)]).expose).toEqual({ blouse: false, lunettes: false, gants: false });
    const tard = joue([{ g: "equiper", quoi: "blouse", porte: true }, ...alcool(r), { g: "equiper", quoi: "lunettes", porte: true }, { g: "equiper", quoi: "gants", porte: true }, ...acide(r)]);
    expect(tard.expose).toEqual({ blouse: false, lunettes: true, gants: true });
    expect(joue([...equipement, { g: "equiper", quoi: "gants", porte: false }, { g: "goutte" }]).expose.gants).toBe(true);
    // monter l'appareil ne demande pas d'équipement
    expect(joue(montage).expose).toEqual({ blouse: false, lunettes: false, gants: false });
  });
  it("la pipette n'aspire que dans le flacon, et se vide là où elle est", () => {
    expect(joue([{ g: "aspirer", v: 5 }]).dansPipette).toBe(0);
    expect(joue(alcool(r)).alcool).toBe(10);
    const perdue = joue([{ g: "pipette", ou: "flacon" }, { g: "aspirer", v: 10 }, { g: "pipette", ou: "repos" }, { g: "vider", v: 10 }]);
    expect([perdue.alcool, perdue.renverse]).toEqual([0, 10]);
    const trop = joue([{ g: "pipette", ou: "flacon" }, { g: "aspirer", v: 14 }]);
    expect([trop.dansPipette, trop.aspireTrop]).toEqual([12, true]);
    // deux morceaux d'une aspiration valent leur somme
    expect(joue([{ g: "pipette", ou: "flacon" }, { g: "aspirer", v: 4.2 }, { g: "aspirer", v: 3.3 }])).toEqual(joue([{ g: "pipette", ou: "flacon" }, { g: "aspirer", v: 7.5 }]));
  });
  it("l'éprouvette se remplit, déborde au-delà de sa capacité, se vide dans le ballon ou retourne au flacon", () => {
    expect(joue([{ g: "mesurer", v: 12 }, { g: "mesurer", v: 8 }])).toEqual(joue([{ g: "mesurer", v: 20 }]));
    expect(joue(acide(r)).acide).toBe(20);
    const debord = joue([{ g: "mesurer", v: 30 }]);
    expect([debord.eprouvette, debord.renverse]).toEqual([26, 4]);
    const repris = joue([{ g: "mesurer", v: 23 }, { g: "verser", vers: "flacon" }, { g: "mesurer", v: 20 }, { g: "verser", vers: "ballon" }]);
    expect([repris.eprouvette, repris.acide]).toEqual([0, 20]);
  });
  it("une fois le ballon parti au montage, on n'y verse plus rien", () => {
    const ferme = joue([...montage, { g: "ponce" }, { g: "goutte" }, { g: "mesurer", v: 20 }, { g: "verser", vers: "ballon" }]);
    expect(ballonOuvert(ferme)).toBe(false);
    expect([ferme.ponce, ferme.gouttes, ferme.acide, ferme.renverse]).toEqual([0, 0, 0, 20]);
    // le mélange qui a chauffé ne reçoit plus rien non plus, même revenu sur son valet
    const apres = joue([...avantPesee(r, { lavage: [] }), { g: "goutte" }, { g: "ponce" }]);
    expect([apres.ballon, ballonOuvert(apres), apres.gouttes, apres.ponce]).toEqual(["valet", false, 5, 2]);
  });
});

describe("le montage", () => {
  it("chaque pièce se pose sur celle qui la porte", () => {
    expect(joue([{ g: "placer", quoi: "chauffe" }]).pieces.chauffe).toBe(false);
    expect(joue([{ g: "placer", quoi: "refrigerant" }]).pieces.refrigerant).toBe(false);
    expect(joue([{ g: "ballon", ou: "montage" }]).ballon).toBe("valet");
    expect(joue([{ g: "monter", v: 3 }]).hauteur).toBe(0);
    expect(joue(montage).pieces).toEqual({ support: true, chauffe: true, pinceb: true, refrigerant: true, pincer: true });
    // sans pince, le ballon repose dans le chauffe-ballon monté
    const pose = joue([{ g: "placer", quoi: "support" }, { g: "placer", quoi: "chauffe" }, { g: "monter", v: 3 }, { g: "ballon", ou: "montage" }]);
    expect(pose.ballon).toBe("montage");
  });
  it("on ne retire pas ce qui porte une autre pièce, et le ballon ne sort que si le réfrigérant tient tout seul", () => {
    expect(joue([...montage, { g: "retirer", quoi: "support" }]).pieces.support).toBe(true);
    const sansPince = [{ g: "placer", quoi: "support" }, { g: "placer", quoi: "chauffe" }, { g: "monter", v: 3 }, { g: "ballon", ou: "montage" }, { g: "placer", quoi: "refrigerant" }] as GesteBrut[];
    expect(joue([...sansPince, { g: "ballon", ou: "valet" }]).ballon).toBe("montage");
    expect(joue([...sansPince, { g: "retirer", quoi: "chauffe" }]).pieces.chauffe).toBe(true);
    expect(joue([...montage, { g: "monter", v: 0 }, { g: "retirer", quoi: "pinceb" }]).pieces.pinceb).toBe(true);
    expect(joue([...montage, { g: "ballon", ou: "valet" }]).ballon).toBe("valet");
    expect(joue([...montage, { g: "retirer", quoi: "pincer" }, { g: "retirer", quoi: "refrigerant" }, { g: "monter", v: 0 }, { g: "ballon", ou: "valet" }, { g: "retirer", quoi: "chauffe" }, { g: "retirer", quoi: "support" }]).pieces).toEqual({ support: false, chauffe: false, pinceb: true, refrigerant: false, pincer: false });
  });
  it("les tuyaux : un par bout, et les tubulures viennent avec le réfrigérant", () => {
    expect(joue([{ g: "tuyau", a: "robinet", b: "bas", pose: true }]).tuyaux).toEqual([]);
    expect(joue([...montage, ...eau]).tuyaux).toEqual([["robinet", "bas"], ["haut", "evier"]]);
    expect(joue([...montage, ...eau, { g: "tuyau", a: "robinet", b: "haut", pose: true }]).tuyaux).toHaveLength(2);
    expect(joue([...montage, ...eau, { g: "tuyau", a: "bas", b: "robinet", pose: false }]).tuyaux).toEqual([["haut", "evier"]]);
    expect(joue([...montage, ...eau, { g: "retirer", quoi: "pincer" }, { g: "retirer", quoi: "refrigerant" }]).tuyaux).toEqual([]);
  });
  it("l'eau circule dans le bon sens, à l'envers, fuit, ou ne circule pas", () => {
    expect(circulation(joue([...montage, ...eau]))).toBe("bonne");
    expect(circulation(joue([...montage, ...eau.slice(0, 2)]))).toBe("aucune");
    expect(circulation(joue([...montage, { g: "tuyau", a: "robinet", b: "haut", pose: true }, { g: "tuyau", a: "bas", b: "evier", pose: true }, { g: "eau", v: 2 }]))).toBe("inverse");
    expect(circulation(joue([...montage, { g: "tuyau", a: "robinet", b: "bas", pose: true }, { g: "eau", v: 1 }]))).toBe("fuite");
    expect(circulation(joue([...montage, { g: "tuyau", a: "haut", b: "evier", pose: true }, { g: "eau", v: 1 }]))).toBe("aucune");
    expect(circulation(joue(eau))).toBe("aucune");
  });
});

describe("le chauffage", () => {
  const pret = [...equipement, ...alcool(r), ...acide(r), ...ajouts, ...montage, ...eau];
  it("le mélange ne chauffe que dans le chauffe-ballon monté : il tiédit, bout doucement, ou bout trop fort", () => {
    expect(regime(joue([...pret, { g: "thermostat", v: 0 }]))).toBe("arret");
    expect(regime(joue([...pret, { g: "thermostat", v: 2 }]))).toBe("tiede");
    expect(regime(joue([...pret, { g: "thermostat", v: 4 }]))).toBe("reflux");
    expect(regime(joue([...pret, { g: "thermostat", v: 6 }]))).toBe("fort");
    expect(regime(joue([...pret, { g: "thermostat", v: 4 }, { g: "monter", v: 2 }]))).toBe("arret");
    // un ballon vide ne bout pas
    expect(regime(joue([...montage, { g: "thermostat", v: 4 }]))).toBe("arret");
  });
  it("deux attentes valent leur somme : à l'ébullition, au tiède, au refroidissement", () => {
    for (const debut of [[...pret, { g: "thermostat", v: 4 }], [...pret, { g: "thermostat", v: 1 }], [...pret, ...chauffage(10)], [...pret.slice(0, -1), { g: "thermostat", v: 6 }], [...pret, ...chauffage(10), { g: "monter", v: 0 }]] as GesteBrut[][]) {
      expect(joue([...debut, { g: "attendre", v: 3.37 }, { g: "attendre", v: 8.19 }, { g: "attendre", v: 0.01 }])).toEqual(joue([...debut, { g: "attendre", v: 11.57 }]));
    }
  });
  it("à l'ébullition avec catalyseur, le temps compte en entier ; au tiède ou sans catalyseur, bien moins", () => {
    expect(joue([...pret, ...chauffage(30)]).efficace).toBe(30);
    expect(joue([...pret, ...chauffage(30, 2)]).efficace).toBe(6);
    const sansCatalyseur = joue([...equipement, ...alcool(r), ...acide(r), { g: "ponce" }, ...montage, ...eau, ...chauffage(30)]);
    expect([sansCatalyseur.ebullition, sansCatalyseur.efficace]).toEqual([30, 1.5]);
  });
  it("sans eau, à l'envers ou sans réfrigérant, des vapeurs s'échappent ; sans pierre ponce, le mélange est projeté", () => {
    const bout = (c: Change) => joue([...avantPesee(r, { ...c, refroidissement: [], lavage: [] })]);
    expect(bout({}).pertes).toBe(0);
    expect(bout({ eau: eau.slice(0, 2) }).pertes).toBeCloseTo(0.6, 9);
    expect(bout({ eau: [{ g: "tuyau", a: "robinet", b: "haut", pose: true }, { g: "tuyau", a: "bas", b: "evier", pose: true }, { g: "eau", v: 1 }] }).pertes).toBeCloseTo(0.24, 9);
    expect(bout({ chauffage: chauffage(30, 6) }).pertes).toBeCloseTo(0.12, 9);
    const nu = bout({ montage: montage.slice(0, 5), eau: [] });
    expect([nu.sansRefrigerant, nu.pertes]).toEqual([30, 0.95 + 0.55]);
    expect(esterForme(nu)).toBeCloseTo(esterForme(bout({})) * 0.05, 9);
    expect(bout({ ajouts: fois(5, { g: "goutte" }) }).projections).toBe(true);
    expect(esterForme(bout({ ajouts: fois(5, { g: "goutte" }) }))).toBeCloseTo(esterForme(bout({})) * 0.9, 9);
  });
  it("un ballon non tenu suit le chauffe-ballon quand on descend le support", () => {
    const sansPince = montage.filter((g) => g.quoi !== "pinceb");
    const etat = joue([...equipement, ...alcool(r), ...acide(r), ...ajouts, { g: "placer", quoi: "support" }, { g: "placer", quoi: "chauffe" }, { g: "monter", v: 3 }, { g: "ballon", ou: "montage" }, { g: "placer", quoi: "refrigerant" }, { g: "placer", quoi: "pincer" }, ...eau, ...chauffage(30), { g: "monter", v: 0 }]);
    expect(sansPince).toHaveLength(6);
    expect([etat.tombe, etat.descendu]).toEqual([true, true]);
    expect(joue([...avantPesee(r, { lavage: [] })]).tombe).toBe(false);
  });
  it("le mélange refroidit plus vite quand le support est descendu", () => {
    const pretChaud = [...pret, ...chauffage(30)];
    expect(joue([...pretChaud, { g: "attendre", v: 4 }]).froid).toBe(2);
    expect(joue([...pretChaud, { g: "monter", v: 0 }, { g: "attendre", v: 4 }]).froid).toBe(4);
    // rallumer le chauffage remet le compteur à zéro
    expect(joue([...pretChaud, { g: "attendre", v: 4 }, ...chauffage(2)]).froid).toBe(0);
  });
});

describe("la séparation et la pesée", () => {
  const avant = avantPesee(r);
  it("le ballon se vide dans l'ampoule ouverte, depuis le poste de séparation", () => {
    expect(joue([...avantPesee(r, { refroidissement: [], lavage: [{ g: "transvaser" }] })]).ampoule).toBe(false);
    expect(joue([...avantPesee(r, { lavage: [{ g: "bouchon", pose: true }, { g: "transvaser" }] })]).ampoule).toBe(false);
    const etat = joue(avant);
    expect([etat.ampoule, etat.chaud, etat.aqueux, etat.organique]).toEqual([true, false, 48, 11.04]);
    expect(masseExacte(r)).toBe(Math.round(RHO.ester * 11.04 * 100) / 100);
    // un ballon démonté sans attendre est encore chaud
    expect(joue(avantPesee(r, { refroidissement: [{ g: "monter", v: 0 }, { g: "ballon", ou: "valet" }] })).chaud).toBe(true);
  });
  it("agiter fait monter la pression : sans dégazer, le bouchon saute ; sans bouchon, le mélange gicle", () => {
    const pleine = avantPesee(r, { lavage: [{ g: "transvaser" }, { g: "bouchon", pose: true }] });
    const saute = joue([...pleine, ...fois(3, { g: "agiter" })]);
    expect([saute.saute, saute.bouchon, saute.agite, saute.organique]).toEqual([true, false, 3, Math.round(11.04 * 0.9 * 100) / 100]);
    const ouverte = joue([...pleine, { g: "bouchon", pose: false }, { g: "agiter" }]);
    expect([ouverte.sansBouchon, ouverte.organique, ouverte.aqueux]).toEqual([true, 8.83, 38.4]);
    expect(joue([...pleine, { g: "agiter" }, { g: "agiter" }, { g: "degazer" }, { g: "agiter" }]).saute).toBe(false);
    // les phases ne sont séparées qu'après trois minutes de repos
    expect(decante(joue([...pleine, { g: "agiter" }, { g: "attendre", v: 2 }]))).toBe(false);
    expect(decante(joue(avant))).toBe(true);
  });
  it("rien ne coule tant que le bouchon est en place ; la phase aqueuse sort la première", () => {
    expect(joue([...avant, { g: "bouchon", pose: true }, { g: "couler", v: 10 }]).ecoule).toBe(0);
    const debut = joue([...avant, { g: "poubelle", sous: true }, { g: "couler", v: 40 }]);
    expect(phases(debut)).toEqual({ aqueux: 8, organique: 11.04 });
    const limite = joue([...avant, { g: "poubelle", sous: true }, { g: "couler", v: 50 }]);
    expect([phases(limite), limite.perduOrg]).toEqual([{ aqueux: 0, organique: 9.04 }, 2]);
    // deux morceaux valent leur somme, et l'ampoule ne donne pas plus que ce qu'elle contient
    expect(joue([...avant, { g: "poubelle", sous: true }, { g: "couler", v: 47.3 }, { g: "couler", v: 2.7 }])).toEqual(limite);
    expect(joue([...avant, { g: "couler", v: 100 }]).ecoule).toBe(59.04);
    expect(joue([...avant, { g: "couler", v: 100 }]).flaque).toBe(59.04);
  });
  it("un seul récipient sous l'ampoule ; la balance affiche ce qui est posé dessus, moins la tare", () => {
    expect(joue([{ g: "poubelle", sous: true }, { g: "becher", ou: "sous" }]).poubelle).toBe(false);
    expect(joue([{ g: "becher", ou: "sous" }, { g: "poubelle", sous: true }]).becher).toBe("paillasse");
    expect(affichage(r, joue([]))).toBe(0);
    expect(affichage(r, joue([{ g: "becher", ou: "balance" }]))).toBe(52.37);
    expect(affichage(r, joue([{ g: "becher", ou: "balance" }, { g: "tarer" }]))).toBe(0);
    expect(affichage(r, joue([{ g: "becher", ou: "balance" }, { g: "tarer" }, { g: "becher", ou: "paillasse" }]))).toBe(-52.37);
    const pesee1 = joue(soignee());
    expect([masseRecoltee(pesee1), affichage(r, pesee1), pesee1.note]).toEqual([11.7, 11.7, 11.7]);
  });
});

describe("le bilan d'une synthèse", () => {
  it("une manipulation soignée n'a aucune faute, et rend la masse pesée", () => {
    const b = regles.bilan(r, joue(soignee()));
    expect(b.fautes).toEqual([]);
    expect(b.score).toBe(1);
    expect(b.mesures).toEqual({ m: masseExacte(r) });
    expect(b.lignes[0]).toContain("m = 11,70 g");
  });
  it("sans chauffage, la manipulation vaut zéro, et le professeur donne sa masse", () => {
    for (const gestes of [[], [...equipement, ...alcool(r), ...acide(r), ...ajouts, ...montage, ...eau]] as GesteBrut[][]) {
      const b = regles.bilan(r, joue(gestes));
      expect(b.score).toBe(0);
      expect(b.fautes.map((f) => f.code)).toEqual(["synthese"]);
      expect(b.mesures).toEqual({ m: 11.7 });
      expect(b.lignes[0]).toContain("valeur du professeur");
    }
  });
  it("la sécurité : sans lunettes, la faute est importante ; sans gants ou sans blouse, légère", () => {
    expect(fautes(soignee(r, { equipement: [] }))).toEqual(["securite!"]);
    expect(fautes(soignee(r, { equipement: equipement.slice(0, 2) }))).toEqual(["securite"]);
    expect(regles.bilan(r, joue(soignee(r, { equipement: [] }))).fautes[0].texte).toContain("sans blouse, lunettes ni gants");
  });
  it("les réactifs : une prise mal ajustée, l'acide en défaut, un volume d'acide à côté, pas de catalyseur, pas de pierre ponce", () => {
    const large: GesteBrut[] = [{ g: "pipette", ou: "flacon" }, { g: "aspirer", v: 10.3 }, { g: "pipette", ou: "ballon" }, { g: "vider", v: 10.3 }];
    expect(fautes(soignee(r, { alcool: large }))).toEqual(["alcool"]);
    expect(fautes(soignee(r, { alcool: [{ g: "pipette", ou: "flacon" }, { g: "aspirer", v: 12 }, { g: "aspirer", v: 1 }, { g: "pipette", ou: "ballon" }, { g: "vider", v: 12 }] }))).toEqual(["alcool!", "propipette"]);
    expect(fautes(soignee(r, { alcool: [] }))).toContain("alcool!");
    expect(fautes(soignee(r, { acide: [{ g: "mesurer", v: 4 }, { g: "verser", vers: "ballon" }] }))).toEqual(["exces!"]);
    expect(fautes(soignee(r, { acide: [{ g: "mesurer", v: 23 }, { g: "verser", vers: "ballon" }] }))).toEqual(["acide"]);
    expect(fautes(soignee(r, { ajouts: [{ g: "ponce" }] }))).toEqual(["catalyseur!"]);
    expect(fautes(soignee(r, { ajouts: fois(5, { g: "goutte" }) }))).toEqual(["ponce"]);
    expect(fautes(soignee(r, { acide: [{ g: "mesurer", v: 30 }, { g: "verser", vers: "flacon" }, ...acide(r)] }))).toEqual(["renverse"]);
    // l'acide en défaut, ou le mélange projeté : la masse pesée s'en ressent
    expect(regles.bilan(r, joue(soignee(r, { acide: [{ g: "mesurer", v: 4 }, { g: "verser", vers: "ballon" }] }))).mesures.m).toBeLessThan(8);
    expect(regles.bilan(r, joue(soignee(r, { ajouts: fois(5, { g: "goutte" }) }))).mesures.m).toBeCloseTo(11.7 * 0.9, 1);
  });
  it("le montage : les pinces, le réfrigérant", () => {
    const sansPinces: GesteBrut[] = [{ g: "placer", quoi: "support" }, { g: "placer", quoi: "chauffe" }, { g: "monter", v: 3 }, { g: "ballon", ou: "montage" }, { g: "placer", quoi: "refrigerant" }];
    const fin = [{ g: "retirer", quoi: "refrigerant" }, { g: "ballon", ou: "valet" }] as GesteBrut[];
    expect(fautes(soignee(r, { montage: sansPinces, refroidissement: [{ g: "attendre", v: 10 }, { g: "eau", v: 0 }, ...fin] }))).toEqual(["pince", "refroidir"]);
    expect(fautes(soignee(r, { montage: [...sansPinces, { g: "placer", quoi: "pincer" }], refroidissement: [{ g: "attendre", v: 10 }, { g: "ballon", ou: "valet" }] }))).toEqual(["pince", "refroidir"]);
    // un réfrigérant non tenu se retire avant le ballon
    expect(fautes(soignee(r, { montage: montage.slice(0, 6) }))).toEqual(["pince", "separation!"]);
    expect(fautes(soignee(r, { montage: montage.slice(0, 6), refroidissement: [{ g: "monter", v: 0 }, { g: "attendre", v: 5 }, { g: "eau", v: 0 }, ...fin] }))).toEqual(["pince"]);
    // le ballon non tenu tombe quand on descend le support : faute importante, et un quart du mélange perdu
    const tombe = soignee(r, { montage: [...sansPinces, { g: "placer", quoi: "pincer" }] });
    expect(fautes(tombe)).toEqual(["pince!"]);
    expect(regles.bilan(r, joue(tombe)).mesures.m).toBeCloseTo(11.7 * 0.75, 1);
    expect(fautes(soignee(r, { montage: montage.slice(0, 5), eau: [] }))).toEqual(["refrigerant!"]);
  });
  it("l'eau : fermée, à l'envers, un tuyau qui fuit ; le chauffage : trop fort, trop court, jamais à l'ébullition", () => {
    expect(fautes(soignee(r, { eau: eau.slice(0, 2) }))).toEqual(["eau!"]);
    expect(fautes(soignee(r, { eau: [] }))).toEqual(["eau!"]);
    expect(fautes(soignee(r, { eau: [eau[0], eau[2]] }))).toEqual(["eau!"]);
    expect(fautes(soignee(r, { eau: [{ g: "tuyau", a: "robinet", b: "haut", pose: true }, { g: "tuyau", a: "bas", b: "evier", pose: true }, { g: "eau", v: 1 }] }))).toEqual(["sens"]);
    expect(regles.bilan(r, joue(soignee(r, { eau: [] }))).mesures.m).toBeCloseTo(11.7 * 0.4, 1);
    expect(fautes(soignee(r, { chauffage: chauffage(30, 6) }))).toEqual(["chauffage"]);
    expect(fautes(soignee(r, { chauffage: chauffage(20) }))).toEqual(["court"]);
    expect(fautes(soignee(r, { chauffage: chauffage(10) }))).toEqual(["court!"]);
    expect(fautes(soignee(r, { chauffage: chauffage(30, 2) }))).toEqual(["court!"]);
    expect(regles.bilan(r, joue(soignee(r, { chauffage: chauffage(10) }))).mesures.m).toBeLessThan(9);
  });
  it("la fin du chauffage : le support descendu, le ballon refroidi", () => {
    expect(fautes(soignee(r, { refroidissement: [{ g: "monter", v: 0 }, { g: "ballon", ou: "valet" }] }))).toEqual(["refroidir"]);
    expect(fautes(soignee(r, { refroidissement: [{ g: "attendre", v: 12 }, { g: "ballon", ou: "valet" }] }))).toEqual(["refroidir"]);
    expect(fautes(avantPesee(r, { lavage: [] }))).toEqual(["separation!"]);
  });
  it("le lavage : sans bouchon, sans dégazer, trop peu d'agitations, pas de repos", () => {
    const avec = (lavages: GesteBrut[]) => fautes(soignee(r, { lavage: [{ g: "transvaser" }, ...lavages] }));
    expect(avec([...fois(3, { g: "agiter" }), { g: "attendre", v: 3 }])).toEqual(["bouchon!"]);
    expect(avec([{ g: "bouchon", pose: true }, ...fois(3, { g: "agiter" }), { g: "attendre", v: 3 }])).toEqual(["degazage"]);
    expect(avec([{ g: "bouchon", pose: true }, { g: "agiter" }, { g: "degazer" }, { g: "attendre", v: 3 }, { g: "bouchon", pose: false }])).toEqual(["lavage"]);
    expect(avec([])).toEqual(["lavage"]);
    expect(avec([{ g: "bouchon", pose: true }, ...fois(3, { g: "agiter" }).flatMap((a) => [a, { g: "degazer" }]), { g: "bouchon", pose: false }])).toEqual(["repos"]);
  });
  it("la limite entre les deux phases : robinet fermé trop tôt, trop tard ; rien sous l'ampoule", () => {
    const avant = avantPesee(r);
    expect(fautes([...avant, ...pesee(r, avant, -1.5)])).toEqual(["limite"]);
    expect(fautes([...avant, ...pesee(r, avant, -4)])).toEqual(["limite!"]);
    expect(fautes([...avant, ...pesee(r, avant, 1.5)])).toEqual(["limite"]);
    expect(fautes([...avant, ...pesee(r, avant, 4)])).toEqual(["limite!"]);
    expect(fautes([...avant, ...pesee(r, avant, 0.3)])).toEqual([]);
    // de l'eau salée dans le bécher : le produit pèse plus lourd
    expect(regles.bilan(r, joue([...avant, ...pesee(r, avant, -4)])).mesures.m).toBe(Math.round((11.7 + 4 * 1.15) * 100) / 100);
    expect(fautes([...avant, { g: "couler", v: 48 }, ...pesee(r, avant).slice(2)])).toEqual(["flaque"]);
    expect(fautes([...avant, { g: "poubelle", sous: true }, { g: "couler", v: 48 }, { g: "becher", ou: "sous" }, { g: "couler", v: 6 }, { g: "becher", ou: "balance" }, { g: "noter", v: 6.36 }])).toEqual(["oubli"]);
    expect(fautes([...avant, { g: "poubelle", sous: true }, { g: "couler", v: 48 }])).toEqual(["recolte!", "note!"]);
  });
  it("la pesée : masse non notée, bécher non taré, lecture fausse", () => {
    const avant = avantPesee(r);
    expect(fautes([...avant, ...pesee(r, avant).slice(0, -1)])).toEqual(["note!"]);
    const sansTare = pesee(r, avant, 0, 0, false);
    expect(fautes([...avant, ...sansTare])).toEqual(["tare!"]);
    expect(regles.bilan(r, joue([...avant, ...sansTare])).fautes[0].texte).toContain("64,07 g");
    // sans tare, l'élève peut retrancher lui-même la masse du bécher
    expect(fautes([...avant, ...sansTare.slice(0, -1), { g: "noter", v: 11.7 }])).toEqual([]);
    expect(fautes([...avant, ...pesee(r, avant, 0, 0.2)])).toEqual(["lecture"]);
    expect(fautes([...avant, ...pesee(r, avant, 0, 3)])).toEqual(["lecture!"]);
  });
  it("un geste inconnu, mal formé ou hors bornes ne change rien", () => {
    const bizarres: GesteBrut[] = [{ g: "exploser" }, { g: "equiper", quoi: "casque", porte: true }, { g: "equiper", quoi: "gants" }, { g: "pipette", ou: "poche" }, { g: "aspirer" }, { g: "aspirer", v: -2 }, { g: "vider", v: 3 },
      { g: "mesurer", v: 500 }, { g: "mesurer", v: "beaucoup" }, { g: "verser", vers: "ballon" }, { g: "verser", vers: "evier" }, { g: "placer", quoi: "tabouret" }, { g: "retirer", quoi: "support" }, { g: "ballon", ou: "plafond" },
      { g: "monter", v: 9 }, { g: "tuyau", a: "robinet", b: "robinet", pose: true }, { g: "tuyau", a: "robinet", b: "lavabo", pose: true }, { g: "tuyau", a: "robinet", b: "evier" }, { g: "eau", v: 1.5 }, { g: "eau", v: 7 },
      { g: "thermostat", v: 12 }, { g: "thermostat", v: 2.5 }, { g: "attendre", v: 0 }, { g: "transvaser" }, { g: "bouchon" }, { g: "agiter" }, { g: "degazer" }, { g: "becher", ou: "evier" }, { g: "poubelle" }, { g: "couler", v: 5 }, { g: "tarer" }, { g: "noter", v: -1 }, { g: "noter", v: 900 }];
    expect(joue(bizarres)).toEqual(joue([]));
    // le temps qui passe sans rien sur la paillasse ne fait qu'avancer le chronomètre
    expect(joue([{ g: "attendre", v: 5 }])).toEqual({ ...joue([]), temps: 5 });
  });
});

// ---------- le TP : la synthèse, puis la chromatographie ----------

/** La chromatographie soignée d'une situation (les mêmes gestes que dans ccm.test.ts). */
function chromatographie(c: ReglagesCcm): GesteBrut[] {
  const vingtieme = (x: number) => Math.round(x * 20) / 20;
  const depot = (s: string): GesteBrut[] => [{ g: "capillaire", de: "pot", vers: s }, { g: "deposer", de: s, ou: s, v: 1.5 }];
  const avant: GesteBrut[] = [{ g: "eluant", v: 0.5 }, { g: "couvercle", pose: true }, { g: "trait", h: 1, outil: "crayon" }, ...depot("a"), ...depot("p"), ...depot("r"),
    { g: "couvercle", pose: false }, { g: "plonger" }, { g: "couvercle", pose: true }, { g: "attendre", v: 12 }, { g: "couvercle", pose: false }, { g: "sortir" }];
  const front = frontActuel(rejoue(reglesCcm, c, avant));
  return [...avant, { g: "trait", h: vingtieme(front), outil: "crayon" }, { g: "uv", marche: true },
    { g: "noter", quoi: "front", v: vingtieme(front - 1) }, { g: "noter", quoi: "a", v: vingtieme(c.rfReactif * (front - 1)) }, { g: "noter", quoi: "r", v: vingtieme(c.rfProduit * (front - 1)) }];
}

describe("le TP « synthese »", () => {
  const lesRegles = { reflux: regles as ReglesPaillasse<unknown, unknown>, ccm: reglesCcm as ReglesPaillasse<unknown, unknown> };
  const manipulation = (etape: EtapeDePaillasse): GesteBrut[] =>
    (etape.paillasse.genre === "reflux" ? soignee(etape.paillasse.reglages as ReglagesReflux) : chromatographie(etape.paillasse.reglages as ReglagesCcm));

  it("les contrôles communs : la forme des étapes, rien de la réponse dans le navigateur, D partout sans rien faire", async () => {
    await controlesCommuns(synthese, lesRegles);
    expect(synthese.fiche).toBe(13);
    const etapes = synthese.etapes(1);
    expect(etapes.length).toBeGreaterThanOrEqual(8);
    expect(etapes.length).toBeLessThanOrEqual(11);
    expect(etapes.filter((e) => e.genre === "paillasse").map((e) => (e.genre === "paillasse" ? e.paillasse.genre : ""))).toEqual(["reflux", "ccm"]);
  });
  it("fait avec soin, le TP donne A partout, quelle que soit la situation tirée", async () => {
    const masses = new Set<number>();
    const conclusions = new Set<number>();
    for (const graine of GRAINES) {
      const partie = await joueJuste(synthese, graine, manipulation, lesRegles);
      expect(partie.scores.every((x) => x === 1), `graine ${graine} : ${partie.scores.join(" ")}`).toBe(true);
      expect(partie.bilan).toEqual({ APP: "A", ANA: "A", REA: "A", VAL: "A" });
      expect(partie.fautes).toEqual([[], []]);
      expect(Object.keys(partie.mesures).sort()).toEqual(["H", "hA", "hR", "m"]);
      masses.add(partie.mesures.m);
      const derniere = partie.retours[partie.retours.length - 1].correction;
      if (derniere.genre === "choix") conclusions.add(derniere.bonne);
    }
    // la graine change les quantités et le rendement ; dans deux situations sur quatre, il reste du réactif dans le produit
    expect(masses.size).toBe(4);
    expect(conclusions).toEqual(new Set([0, 1]));
  });
  it("l'exploitation se calcule avec les mesures de l'élève : sa masse pesée, ses distances", async () => {
    const etapes = synthese.etapes(1);
    const valeurs = etapes.flatMap((e) => (e.genre === "valeur" ? [e] : []));
    expect(valeurs).toHaveLength(4);
    const [maximale, rendement, rfProduit, rfReactif] = valeurs;
    expect(maximale.attendu({})).toBeCloseTo(14.44, 2);
    expect(rendement.attendu({ m: 7.22 })).toBeCloseTo(50, 1);
    expect(rendement.detail({ m: 7.22 })).toContain("7,22 g / 14,4 g = 50,0 %");
    expect(rfProduit.attendu({ H: 5, hA: 1.3, hR: 3.1 })).toBeCloseTo(0.62, 9);
    expect(rfReactif.attendu({ H: 5, hA: 1.3, hR: 3.1 })).toBeCloseTo(0.26, 9);
    expect(rfProduit.detail({ H: 5, hA: 1.3, hR: 3.1 })).toContain("3,10 cm / 5,00 cm = 0,62");
    // un rendement réaliste pour chaque situation
    for (const graine of [1, 2, 3, 4]) {
      const reglages = synthese.etapes(graine).flatMap((e) => (e.genre === "paillasse" && e.paillasse.genre === "reflux" ? [e.paillasse.reglages as ReglagesReflux] : []))[0];
      const eta = masseExacte(reglages) / (((RHO.alcool * reglages.Va) / M.alcool) * M.ester);
      expect(eta).toBeGreaterThan(0.7);
      expect(eta).toBeLessThan(0.85);
      expect(reglages.Vc).toBeLessThanOrEqual(25);
      expect(HAUT).toBe(3);
    }
  });
});
