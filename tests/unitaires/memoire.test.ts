import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { FAMILLES_MEMOIRE, JEUX_MEMOIRE, jeuMemoire } from "@/lib/commun/memoire";
import { cartesSymboles, casesAllumees, cheminCases, COTE_CHEMIN, COTE_PLACES, coteCases, NIVEAUX_CASES, NIVEAUX_CHEMIN, NIVEAUX_PLACES, NIVEAUX_SYMBOLES, nomCase, placesPictos, ratesPermis } from "@/lib/commun/memoire/espace";
import { ditFormeColoree, FORMES, FORMES_COLOREES, forme, nomForme, teinte, TEINTES, TOUCHES } from "@/lib/commun/memoire/formes";
import {
  avanceHistoire, DEPART_HISTOIRE, histoire, histoireFinie, histoiresDePartie, MODELES_HISTOIRE, PHRASES_HISTOIRE, QUESTIONS_HISTOIRE, QUESTIONS_PAR_HISTOIRE,
  type EtatHistoire,
} from "@/lib/commun/memoire/histoire";
import {
  CHIFFRES_FLASH, codeFlash, formesDuos, LETTRES_FLASH, NIVEAUX_CHANGE, NIVEAUX_DUOS, NIVEAUX_FLASH, NIVEAUX_INTRUS, NIVEAUX_MANQUANT,
  objetManquant, plancheChange, plancheIntrus, QUESTIONS_DUOS, SIGNES_FLASH,
} from "@/lib/commun/memoire/images";
import { enPaquets, NIVEAUX_PALAIS, NIVEAUX_PAQUETS, nombreLong, palais, pieceDuPalais, PIECES, taillesPaquets } from "@/lib/commun/memoire/methodes";
import {
  ACCESSOIRES, COIFFURES, corrigeMots, ditPersonnage, fileMots, listeMots, MOTS, motsAssocies, NIVEAUX_ASSOCIES, NIVEAUX_FILE, NIVEAUX_MOTS,
  NIVEAUX_PRENOMS, personnagesPrenoms, PRENOMS, sansRapport, themeDuMot, THEMES_MOTS,
} from "@/lib/commun/memoire/mots";
import { duPicto, ID_PICTOS, nomPicto, picto, PICTOS, titrePicto } from "@/lib/commun/memoire/pictos";
import { avance, bilanNiveaux, DEPART, ERREURS_MAX, partieFinie, scoreSur, type EtatManches } from "@/lib/commun/memoire/regles";
import {
  aLEnvers, calcule, CALCUL_MAX, CALCUL_MIN, chaineCalcul, defileRetour, ditOperation, estRetour, NIVEAUX_CALCUL, NIVEAUX_CHIFFRES, NIVEAUX_COULEURS,
  NIVEAUX_ENVERS, NIVEAUX_RETOUR, NIVEAUX_TRI, nombresATrier, suiteChiffres, suiteTouches, tries,
} from "@/lib/commun/memoire/suites";
import { alea, graineManche, memeSuite, plage } from "@/lib/commun/memoire/tirage";

const graines = fc.integer({ min: 1, max: 2 ** 31 - 1 });
const sansDoublon = <T>(liste: readonly T[]) => new Set(liste).size === liste.length;
/** Vrai si la fonction donne le même résultat deux fois avec la même graine, et un autre résultat pour au moins une graine voisine. */
function reproductible<T>(tirage: (graine: number) => T, graine: number): void {
  expect(tirage(graine)).toEqual(tirage(graine));
  const voisines = [1, 2, 3, 4, 5, 6].map((ecart) => JSON.stringify(tirage(graine + ecart)));
  expect(voisines.some((v) => v !== JSON.stringify(tirage(graine)))).toBe(true);
}

describe("tirages à partir d'une graine", () => {
  it("la même graine redonne la même suite, une autre graine en donne une autre", () => {
    fc.assert(fc.property(graines, (graine) => {
      const a = alea(graine);
      const b = alea(graine);
      const suite = Array.from({ length: 20 }, () => a.suivant());
      expect(Array.from({ length: 20 }, () => b.suivant())).toEqual(suite);
      expect(suite.every((x) => x >= 0 && x < 1)).toBe(true);
      const c = alea(graine + 1);
      expect(Array.from({ length: 20 }, () => c.suivant())).not.toEqual(suite);
    }));
  });
  it("un entier reste entre ses bornes, et toutes les valeurs sortent", () => {
    fc.assert(fc.property(graines, fc.integer({ min: -50, max: 50 }), fc.integer({ min: 0, max: 30 }), (graine, min, ecart) => {
      const a = alea(graine);
      for (let i = 0; i < 30; i++) {
        const n = a.entier(min, min + ecart);
        expect(Number.isInteger(n) && n >= min && n <= min + ecart).toBe(true);
      }
    }));
    const a = alea(2027);
    const vus = new Set(Array.from({ length: 400 }, () => a.entier(0, 9)));
    expect(vus.size).toBe(10);
  });
  it("le mélange garde tous les éléments, ne modifie pas la liste, et donne tous les ordres d'une petite liste", () => {
    fc.assert(fc.property(fc.array(fc.integer(), { maxLength: 30 }), graines, (liste, graine) => {
      const copie = liste.slice();
      const melangee = alea(graine).melange(liste);
      expect(liste).toEqual(copie);
      expect(melangee.slice().sort((x, y) => x - y)).toEqual(copie.sort((x, y) => x - y));
    }));
    const ordres = new Set(plage(1, 600).map((graine) => alea(graine).melange([1, 2, 3, 4]).join("")));
    expect(ordres.size).toBe(24);
  });
  it("tire au plus n éléments à des places différentes, et choisit un élément de la liste", () => {
    fc.assert(fc.property(graines, fc.integer({ min: -2, max: 12 }), (graine, n) => {
      const tires = alea(graine).tire(plage(0, 9), n);
      expect(tires).toHaveLength(Math.max(0, Math.min(10, n)));
      expect(sansDoublon(tires)).toBe(true);
      expect(plage(0, 9)).toContain(alea(graine).parmi(plage(0, 9)));
    }));
  });
  it("chaque manche d'une partie a sa graine", () => {
    expect(sansDoublon(plage(0, 30).map((rang) => graineManche(123456, rang)))).toBe(true);
    expect(graineManche(2 ** 31 - 1, 40)).toBeGreaterThanOrEqual(0);
    expect(plage(3, 6)).toEqual([3, 4, 5, 6]);
    expect(plage(5, 4)).toEqual([]);
    expect(memeSuite([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(memeSuite([1, 2, 3], [1, 3, 2])).toBe(false);
    expect(memeSuite([1, 2], [1, 2, 3])).toBe(false);
  });
});

describe("règles des manches", () => {
  const joue = (verdicts: boolean[], niveaux: number): EtatManches => {
    let etat = DEPART;
    for (const juste of verdicts) {
      if (partieFinie(etat, niveaux)) break;
      if (etat.phase === "verdict") etat = avance(etat, { type: "suite", rang: etat.rang });
      etat = avance(etat, { type: "rappel", rang: etat.rang });
      etat = avance(etat, { type: "verdict", rang: etat.rang, juste });
    }
    return etat;
  };
  it("une manche se joue en trois temps, et une réussite fait monter d'un niveau", () => {
    let etat = DEPART;
    expect(etat).toMatchObject({ phase: "memorise", rang: 0, niveau: 0, erreurs: 0, reussis: 0, juste: null });
    etat = avance(etat, { type: "rappel", rang: 0 });
    expect(etat.phase).toBe("rappel");
    etat = avance(etat, { type: "verdict", rang: 0, juste: true });
    expect(etat).toMatchObject({ phase: "verdict", juste: true, reussis: 1, erreurs: 0 });
    etat = avance(etat, { type: "suite", rang: 0 });
    expect(etat).toMatchObject({ phase: "memorise", rang: 1, niveau: 1, juste: null });
  });
  it("une manche ratée se rejoue au même niveau, et la deuxième erreur arrête la partie", () => {
    let etat = joue([true, false], 10);
    expect(etat).toMatchObject({ phase: "verdict", juste: false, niveau: 1, reussis: 1, erreurs: 1 });
    expect(partieFinie(etat, 10)).toBe(false);
    etat = avance(etat, { type: "suite", rang: etat.rang });
    expect(etat).toMatchObject({ phase: "memorise", rang: 2, niveau: 1 });
    etat = joue([true, false, false], 10);
    expect(etat.erreurs).toBe(ERREURS_MAX);
    expect(partieFinie(etat, 10)).toBe(true);
    // la partie est finie : plus rien n'avance
    expect(avance(etat, { type: "suite", rang: etat.rang })).toBe(etat);
  });
  it("la partie s'arrête quand le niveau le plus haut est réussi", () => {
    const etat = joue([true, true, true], 3);
    expect(etat).toMatchObject({ reussis: 3, niveau: 2, erreurs: 0 });
    expect(partieFinie(etat, 3)).toBe(true);
    expect(partieFinie(joue([true, true], 3), 3)).toBe(false);
  });
  it("ignore une action qui vise une autre manche ou qui arrive au mauvais moment", () => {
    const rappel = avance(DEPART, { type: "rappel", rang: 0 });
    expect(avance(DEPART, { type: "verdict", rang: 0, juste: true })).toBe(DEPART);
    expect(avance(DEPART, { type: "suite", rang: 0 })).toBe(DEPART);
    expect(avance(DEPART, { type: "rappel", rang: 1 })).toBe(DEPART);
    expect(avance(rappel, { type: "rappel", rang: 0 })).toBe(rappel);
    const verdict = avance(rappel, { type: "verdict", rang: 0, juste: false });
    // un second verdict pour la même manche ne compte pas une seconde erreur
    expect(avance(verdict, { type: "verdict", rang: 0, juste: false })).toBe(verdict);
    expect(verdict.erreurs).toBe(1);
  });
  it("quels que soient les verdicts, le score reste entre 0 et 100 et les compteurs restent cohérents", () => {
    fc.assert(fc.property(fc.array(fc.boolean(), { maxLength: 40 }), fc.integer({ min: 1, max: 15 }), (verdicts, niveaux) => {
      const etat = joue(verdicts, niveaux);
      const score = scoreSur(etat.reussis, niveaux);
      expect(Number.isInteger(score) && score >= 0 && score <= 100).toBe(true);
      expect(etat.erreurs).toBeLessThanOrEqual(ERREURS_MAX);
      expect(etat.reussis).toBeLessThanOrEqual(niveaux);
      expect(etat.niveau).toBeLessThan(niveaux);
      expect(etat.reussis).toBeGreaterThanOrEqual(etat.niveau);
    }));
  });
  it("le score monte avec le plus haut niveau réussi", () => {
    expect(scoreSur(0, 10)).toBe(0);
    expect(scoreSur(7, 10)).toBe(70);
    expect(scoreSur(10, 10)).toBe(100);
    expect(scoreSur(12, 10)).toBe(100);
    expect(scoreSur(-1, 10)).toBe(0);
    expect(scoreSur(3, 0)).toBe(0);
    expect(scoreSur(Number.NaN, 10)).toBe(0);
    fc.assert(fc.property(fc.integer({ min: 1, max: 20 }), (niveaux) => {
      const scores = plage(0, niveaux).map((reussis) => scoreSur(reussis, niveaux));
      expect(scores.every((s, i) => i === 0 || s > scores[i - 1])).toBe(true);
      expect(scores[niveaux]).toBe(100);
    }));
  });
  it("écrit la phrase de bilan du plus haut niveau réussi", () => {
    const phrase = (n: number) => `Tu as retenu une suite de ${n} chiffres.`;
    expect(bilanNiveaux([3, 4, 5], 0, phrase, "Aucune suite retenue cette fois.")).toBe("Aucune suite retenue cette fois.");
    expect(bilanNiveaux([3, 4, 5], 2, phrase, "rien")).toBe("Tu as retenu une suite de 4 chiffres.");
    expect(bilanNiveaux([3, 4, 5], 3, phrase, "rien")).toBe("Tu as retenu une suite de 5 chiffres\u00a0: c'est le niveau le plus haut.");
    expect(bilanNiveaux([3, 4, 5], 9, phrase, "rien")).toContain("5 chiffres");
    expect(bilanNiveaux([], 2, phrase, "rien")).toBe("rien");
  });
});

describe("retenir une suite", () => {
  it("tire des chiffres sans répétition immédiate ni trois chiffres qui se suivent", () => {
    fc.assert(fc.property(graines, fc.constantFrom(...NIVEAUX_CHIFFRES), (graine, longueur) => {
      const suite = suiteChiffres(graine, longueur);
      expect(suite).toHaveLength(longueur);
      expect(suite.every((c) => Number.isInteger(c) && c >= 0 && c <= 9)).toBe(true);
      expect(suite.every((c, i) => i === 0 || c !== suite[i - 1])).toBe(true);
      expect(suite.some((c, i) => i >= 2 && Math.abs(c - suite[i - 1]) === 1 && c - suite[i - 1] === suite[i - 1] - suite[i - 2])).toBe(false);
      reproductible((g) => suiteChiffres(g, longueur), graine);
    }));
    expect(NIVEAUX_CHIFFRES).toEqual(plage(3, 12));
    expect(NIVEAUX_ENVERS).toEqual(plage(2, 10));
  });
  it("retourne une suite sans la modifier", () => {
    const suite = [4, 7, 2];
    expect(aLEnvers(suite)).toEqual([2, 7, 4]);
    expect(suite).toEqual([4, 7, 2]);
    expect(memeSuite(aLEnvers(aLEnvers(suite)), suite)).toBe(true);
  });
  it("la suite de couleurs s'allonge sans changer son début", () => {
    fc.assert(fc.property(graines, (graine) => {
      const longue = suiteTouches(graine, 12);
      expect(longue).toHaveLength(12);
      expect(longue.every((t) => t >= 0 && t < TOUCHES.length)).toBe(true);
      expect(longue.some((t, i) => i >= 2 && t === longue[i - 1] && t === longue[i - 2])).toBe(false);
      for (const longueur of NIVEAUX_COULEURS) expect(suiteTouches(graine, longueur)).toEqual(longue.slice(0, longueur));
      reproductible((g) => suiteTouches(g, 12), graine);
    }));
  });
  it("une chaîne de calcul garde tous ses totaux entre 0 et 99", () => {
    fc.assert(fc.property(graines, fc.constantFrom(...NIVEAUX_CALCUL), (graine, longueur) => {
      const chaine = chaineCalcul(graine, longueur);
      expect(chaine.operations).toHaveLength(longueur);
      let total = chaine.depart;
      chaine.operations.forEach((o, i) => {
        total = calcule(total, o.signe, o.valeur);
        expect(o.total).toBe(total);
        expect(total >= CALCUL_MIN && total <= CALCUL_MAX).toBe(true);
        expect(o.valeur >= 2 && o.valeur <= 9).toBe(true);
        if (o.signe === "×") {
          expect([2, 3]).toContain(o.valeur);
          expect(chaine.operations[i - 1]?.signe).not.toBe("×");
        }
      });
      expect(chaine.resultat).toBe(total);
      reproductible((g) => chaineCalcul(g, longueur), graine);
    }));
  });
  it("calcule et écrit une opération", () => {
    expect(calcule(7, "+", 3)).toBe(10);
    expect(calcule(10, "×", 2)).toBe(20);
    expect(calcule(20, "−", 4)).toBe(16);
    expect(ditOperation({ signe: "−", valeur: 4 })).toBe("−\u00a04");
    const signes = new Set(plage(1, 200).flatMap((graine) => chaineCalcul(graine, 8).operations.map((o) => o.signe)));
    expect([...signes].sort()).toEqual(["+", "×", "−"].sort());
  });
  it("tire des nombres à trier tous différents", () => {
    fc.assert(fc.property(graines, fc.constantFrom(...NIVEAUX_TRI), (graine, nombre) => {
      const nombres = nombresATrier(graine, nombre);
      expect(nombres).toHaveLength(nombre);
      expect(sansDoublon(nombres)).toBe(true);
      expect(nombres.every((n) => n >= 10 && n <= 99)).toBe(true);
      const ranges = tries(nombres);
      expect(ranges.every((n, i) => i === 0 || n > ranges[i - 1])).toBe(true);
      expect(ranges.slice().sort((x, y) => x - y)).toEqual(nombres.slice().sort((x, y) => x - y));
      reproductible((g) => nombresATrier(g, nombre), graine);
    }));
  });
  it("le défilé d'un tour en arrière a des retours, mais pas que des retours", () => {
    fc.assert(fc.property(graines, fc.constantFrom(...NIVEAUX_RETOUR), (graine, niveau) => {
      const suite = defileRetour(graine, niveau, 6);
      expect(suite).toHaveLength(niveau.longueur);
      expect(suite.every((s) => s >= 0 && s < 6)).toBe(true);
      expect(plage(0, niveau.recul - 1).some((i) => estRetour(suite, i, niveau.recul))).toBe(false);
      reproductible((g) => defileRetour(g, niveau, 6), graine);
    }));
    const retours = plage(1, 300).map((graine) => {
      const suite = defileRetour(graine, NIVEAUX_RETOUR[3], 6);
      return suite.filter((_, i) => estRetour(suite, i, 2)).length;
    });
    const moyenne = retours.reduce((s, n) => s + n, 0) / retours.length;
    expect(moyenne).toBeGreaterThan(3);
    expect(moyenne).toBeLessThan(6);
    expect(estRetour([1, 2, 1], 2, 2)).toBe(true);
    expect(estRetour([1, 2, 3], 2, 2)).toBe(false);
  });
});

describe("retenir des places", () => {
  it("allume le bon nombre de cases, toutes différentes, dans la grille", () => {
    fc.assert(fc.property(graines, fc.constantFrom(...NIVEAUX_CASES), (graine, nombre) => {
      const { cote, cases } = casesAllumees(graine, nombre);
      expect(cote).toBe(coteCases(nombre));
      expect(cases).toHaveLength(nombre);
      expect(sansDoublon(cases)).toBe(true);
      expect(cases.every((c, i) => c >= 0 && c < cote * cote && (i === 0 || c > cases[i - 1]))).toBe(true);
      reproductible((g) => casesAllumees(g, nombre), graine);
    }));
    expect(coteCases(6)).toBe(4);
    expect(coteCases(7)).toBe(5);
  });
  it("trace un chemin qui ne repasse jamais par la même case", () => {
    fc.assert(fc.property(graines, fc.constantFrom(...NIVEAUX_CHEMIN), (graine, longueur) => {
      const chemin = cheminCases(graine, longueur);
      expect(chemin).toHaveLength(longueur);
      expect(sansDoublon(chemin)).toBe(true);
      expect(chemin.every((c) => c >= 0 && c < COTE_CHEMIN ** 2)).toBe(true);
      reproductible((g) => cheminCases(g, longueur), graine);
    }));
  });
  it("pose chaque objet sur sa case et demande tous les objets", () => {
    fc.assert(fc.property(graines, fc.constantFrom(...NIVEAUX_PLACES), (graine, nombre) => {
      const { objets, demandes } = placesPictos(graine, nombre);
      expect(objets).toHaveLength(nombre);
      expect(sansDoublon(objets.map((o) => o.picto))).toBe(true);
      expect(sansDoublon(objets.map((o) => o.place))).toBe(true);
      expect(objets.every((o) => o.place >= 0 && o.place < COTE_PLACES ** 2 && ID_PICTOS.includes(o.picto))).toBe(true);
      expect(demandes.slice().sort()).toEqual(objets.map((o) => o.picto).sort());
      reproductible((g) => placesPictos(g, nombre), graine);
    }));
  });
  it("distribue chaque symbole deux fois", () => {
    fc.assert(fc.property(graines, fc.constantFrom(...NIVEAUX_SYMBOLES), (graine, nombre) => {
      const cartes = cartesSymboles(graine, nombre);
      expect(cartes).toHaveLength(nombre);
      const compte = new Map<string, number>();
      for (const c of cartes) compte.set(c, (compte.get(c) ?? 0) + 1);
      expect(compte.size).toBe(nombre / 2);
      expect([...compte.values()].every((n) => n === 2)).toBe(true);
      expect(ratesPermis(nombre)).toBe(nombre / 2);
      reproductible((g) => cartesSymboles(g, nombre), graine);
    }));
  });
  it("nomme une case par sa ligne et sa colonne", () => {
    expect(nomCase(0, 4)).toBe("ligne 1, colonne 1");
    expect(nomCase(6, 4)).toBe("ligne 2, colonne 3");
    expect(nomCase(24, 5)).toBe("ligne 5, colonne 5");
  });
});

describe("retenir ce qu'on a vu", () => {
  it("retire un seul objet et propose quatre réponses dont une seule a été montrée", () => {
    fc.assert(fc.property(graines, fc.constantFrom(...NIVEAUX_MANQUANT), (graine, nombre) => {
      const m = objetManquant(graine, nombre);
      expect(m.montres).toHaveLength(nombre);
      expect(sansDoublon(m.montres)).toBe(true);
      expect(m.montres).toContain(m.manquant);
      expect(m.restants.slice().sort()).toEqual(m.montres.filter((p) => p !== m.manquant).sort());
      expect(m.choix).toHaveLength(4);
      expect(sansDoublon(m.choix)).toBe(true);
      expect(m.choix.filter((p) => m.montres.includes(p))).toEqual([m.manquant]);
      reproductible((g) => objetManquant(g, nombre), graine);
    }));
  });
  it("change une seule forme de la planche, comme le niveau le demande", () => {
    fc.assert(fc.property(graines, fc.constantFrom(...NIVEAUX_CHANGE), (graine, niveau) => {
      const p = plancheChange(graine, niveau);
      expect(p.avant).toHaveLength(niveau.formes);
      expect(p.apres).toHaveLength(niveau.formes);
      expect(p.colonnes).toBe(niveau.colonnes);
      expect(sansDoublon(p.avant.map((f) => `${f.forme}-${f.teinte}`))).toBe(true);
      const changees = p.avant.map((_, i) => i).filter((i) => p.avant[i].forme !== p.apres[i].forme || p.avant[i].teinte !== p.apres[i].teinte);
      expect(changees).toEqual([p.change]);
      const differences = Number(p.avant[p.change].forme !== p.apres[p.change].forme) + Number(p.avant[p.change].teinte !== p.apres[p.change].teinte);
      expect(differences).toBe(niveau.discret ? 1 : 2);
      reproductible((g) => plancheChange(g, niveau), graine);
    }));
    expect(NIVEAUX_CHANGE.every((n) => n.formes % n.colonnes === 0 && n.formes <= FORMES_COLOREES.length)).toBe(true);
  });
  it("écrit un code de lettres et de chiffres", () => {
    fc.assert(fc.property(graines, fc.constantFrom(...NIVEAUX_FLASH), (graine, longueur) => {
      const code = codeFlash(graine, longueur);
      expect(code).toHaveLength(longueur);
      expect(code.every((s) => SIGNES_FLASH.includes(s))).toBe(true);
      expect(code.some((s) => LETTRES_FLASH.includes(s))).toBe(true);
      expect(code.some((s) => CHIFFRES_FLASH.includes(s))).toBe(true);
      reproductible((g) => codeFlash(g, longueur), graine);
    }));
    expect(sansDoublon(SIGNES_FLASH)).toBe(true);
    expect(SIGNES_FLASH).toHaveLength(24);
    for (const interdit of ["O", "0", "I", "1", "S", "B", "G", "Z"]) expect(SIGNES_FLASH).not.toContain(interdit);
  });
  it("remplace un seul objet par l'intrus", () => {
    fc.assert(fc.property(graines, fc.constantFrom(...NIVEAUX_INTRUS), (graine, nombre) => {
      const p = plancheIntrus(graine, nombre);
      expect(p.avant).toHaveLength(nombre);
      expect(p.apres).toHaveLength(nombre);
      expect(sansDoublon(p.avant) && sansDoublon(p.apres)).toBe(true);
      expect(p.avant).not.toContain(p.intrus);
      expect(p.apres.filter((x) => !p.avant.includes(x))).toEqual([p.intrus]);
      expect(p.avant.filter((x) => !p.apres.includes(x))).toEqual([p.parti]);
      reproductible((g) => plancheIntrus(g, nombre), graine);
    }));
  });
  it("donne une couleur à chaque forme et demande trois formes différentes", () => {
    fc.assert(fc.property(graines, fc.constantFrom(...NIVEAUX_DUOS), (graine, nombre) => {
      const d = formesDuos(graine, nombre);
      expect(d.formes).toHaveLength(nombre);
      expect(sansDoublon(d.formes.map((f) => f.forme))).toBe(true);
      expect(d.formes.every((f) => FORMES.some((x) => x.id === f.forme) && TEINTES.some((t) => t.id === f.teinte))).toBe(true);
      expect(d.demandes).toHaveLength(QUESTIONS_DUOS);
      expect(sansDoublon(d.demandes)).toBe(true);
      expect(d.demandes.every((i) => i >= 0 && i < nombre)).toBe(true);
      reproductible((g) => formesDuos(g, nombre), graine);
    }));
  });
});

describe("retenir des mots", () => {
  it("les listes n'ont pas de doublon : au moins 100 noms communs et 40 prénoms", () => {
    expect(MOTS.length).toBeGreaterThanOrEqual(100);
    expect(sansDoublon(MOTS.map((m) => m.toLocaleLowerCase("fr-FR")))).toBe(true);
    expect(PRENOMS.length).toBeGreaterThanOrEqual(40);
    expect(sansDoublon(PRENOMS.map((p) => p.toLocaleLowerCase("fr-FR")))).toBe(true);
    expect(sansDoublon(THEMES_MOTS.map((t) => t.theme))).toBe(true);
  });
  it("chaque mot est un nom simple, en minuscules, de dix lettres au plus ; chaque prénom commence par une majuscule", () => {
    for (const mot of MOTS) {
      expect(mot).toMatch(/^[a-zàâçéèêëîïôöùûüœ]{2,10}$/);
      expect(themeDuMot(mot)).not.toBe("");
    }
    for (const prenom of PRENOMS) expect(prenom).toMatch(/^[A-ZÉ][a-zàâçéèêëîïôöùûü]{1,9}$/);
    expect(themeDuMot("inconnu")).toBe("");
  });
  it("propose deux fois plus de mots que la liste, sans doublon", () => {
    fc.assert(fc.property(graines, fc.constantFrom(...NIVEAUX_MOTS), (graine, nombre) => {
      const { liste, proposes } = listeMots(graine, nombre);
      expect(liste).toHaveLength(nombre);
      expect(proposes).toHaveLength(2 * nombre);
      expect(sansDoublon(proposes)).toBe(true);
      expect(liste.every((mot) => proposes.includes(mot))).toBe(true);
      expect(corrigeMots(liste, liste).juste).toBe(true);
      expect(corrigeMots(liste, aLEnvers(liste)).juste).toBe(true);
      reproductible((g) => listeMots(g, nombre), graine);
    }));
  });
  it("corrige une liste : mots oubliés et mots en trop", () => {
    const liste = ["chat", "table", "pomme"];
    expect(corrigeMots(liste, ["chat", "table"])).toEqual({ oublies: ["pomme"], enTrop: [], juste: false });
    expect(corrigeMots(liste, ["chat", "table", "pomme", "vélo"])).toEqual({ oublies: [], enTrop: ["vélo"], juste: false });
    expect(corrigeMots(liste, [])).toEqual({ oublies: liste, enTrop: [], juste: false });
    expect(corrigeMots(liste, ["pomme", "chat", "table"])).toEqual({ oublies: [], enTrop: [], juste: true });
  });
  it("forme des paires de mots sans rapport, et quatre réponses par question", () => {
    fc.assert(fc.property(graines, fc.constantFrom(...NIVEAUX_ASSOCIES), (graine, nombre) => {
      const { paires, questions } = motsAssocies(graine, nombre);
      expect(paires).toHaveLength(nombre);
      expect(sansDoublon(paires.flat())).toBe(true);
      for (const [premier, second] of paires) expect(sansRapport(premier, second)).toBe(true);
      expect(questions).toHaveLength(nombre);
      expect(questions.map((q) => q.premier).sort()).toEqual(paires.map(([premier]) => premier).sort());
      for (const q of questions) {
        expect(paires).toContainEqual([q.premier, q.second]);
        expect(q.choix).toHaveLength(4);
        expect(sansDoublon(q.choix)).toBe(true);
        expect(q.choix).toContain(q.second);
        expect(q.choix.every((mot) => paires.some(([, second]) => second === mot))).toBe(true);
      }
      reproductible((g) => motsAssocies(g, nombre), graine);
    }));
  });
  it("deux mots du même thème, de thèmes proches ou de métier ne sont pas sans rapport", () => {
    expect(sansRapport("chat", "chien")).toBe(false);
    expect(sansRapport("train", "gare")).toBe(false);
    expect(sansRapport("gare", "train")).toBe(false);
    expect(sansRapport("pilote", "table")).toBe(false);
    expect(sansRapport("chat", "piano")).toBe(true);
    expect(sansRapport("chat", "inconnu")).toBe(false);
  });
  it("mélange les mots à remettre dans l'ordre sans jamais redonner l'ordre", () => {
    fc.assert(fc.property(graines, fc.constantFrom(...NIVEAUX_FILE), (graine, nombre) => {
      const { ordre, melanges } = fileMots(graine, nombre);
      expect(ordre).toHaveLength(nombre);
      expect(sansDoublon(ordre)).toBe(true);
      expect(melanges.slice().sort()).toEqual(ordre.slice().sort());
      expect(memeSuite(melanges, ordre)).toBe(false);
      reproductible((g) => fileMots(g, nombre), graine);
    }));
  });
  it("dessine des personnages qui ne se ressemblent pas, chacun avec son prénom", () => {
    fc.assert(fc.property(graines, fc.constantFrom(...NIVEAUX_PRENOMS), (graine, nombre) => {
      const { personnages, questions } = personnagesPrenoms(graine, nombre);
      expect(personnages).toHaveLength(nombre);
      expect(sansDoublon(personnages.map((p) => p.prenom))).toBe(true);
      expect(sansDoublon(personnages.map((p) => p.coiffure))).toBe(true);
      expect(personnages.every((p) => p.coiffure >= 0 && p.coiffure < COIFFURES.length && p.accessoire >= 0 && p.accessoire < ACCESSOIRES.length && p.teinte >= 0 && p.teinte < 4)).toBe(true);
      expect(questions.map((q) => q.personnage).sort()).toEqual(plage(0, nombre - 1));
      for (const q of questions) {
        expect(q.choix).toHaveLength(4);
        expect(sansDoublon(q.choix)).toBe(true);
        expect(q.choix).toContain(personnages[q.personnage].prenom);
      }
      reproductible((g) => personnagesPrenoms(g, nombre), graine);
    }));
    expect(ditPersonnage({ coiffure: 2, accessoire: 0 })).toBe("cheveux bouclés");
    expect(ditPersonnage({ coiffure: 2, accessoire: 1 })).toBe("cheveux bouclés, lunettes");
    expect(COIFFURES.length).toBeGreaterThanOrEqual(Math.max(...NIVEAUX_PRENOMS));
  });
});

describe("l'histoire", () => {
  it("écrit des phrases complètes et pose cinq questions sur les phrases montrées", () => {
    fc.assert(fc.property(graines, fc.integer({ min: 0, max: MODELES_HISTOIRE - 1 }), fc.constantFrom(...PHRASES_HISTOIRE), (graine, modele, phrases) => {
      const h = histoire(graine, modele, phrases);
      expect(h.phrases).toHaveLength(phrases);
      for (const phrase of h.phrases) {
        expect(phrase).toMatch(/^[A-ZÀÉ].*\.$/);
        expect(phrase).not.toMatch(/undefined|NaN|\s{2}|—|–/);
      }
      expect(h.questions).toHaveLength(QUESTIONS_PAR_HISTOIRE);
      expect(sansDoublon(h.questions.map((q) => q.question))).toBe(true);
      for (const q of h.questions) {
        expect(q.question.endsWith("\u00a0?")).toBe(true);
        expect(q.choix).toHaveLength(4);
        expect(sansDoublon(q.choix)).toBe(true);
        expect(q.choix).toContain(q.bonne);
        // la bonne réponse se lit dans le texte montré
        const texte = h.phrases.join(" ").toLocaleLowerCase("fr-FR");
        expect(texte).toContain(q.bonne.replace(/\u00a0h$/, " heures").toLocaleLowerCase("fr-FR"));
      }
      reproductible((g) => histoire(g, modele, phrases), graine);
    }));
  });
  it("les réponses en nombre sont rangées de la plus petite à la plus grande", () => {
    for (const graine of plage(1, 60)) {
      for (const modele of plage(0, MODELES_HISTOIRE - 1)) {
        for (const q of histoire(graine, modele, 6).questions) {
          const nombres = q.choix.map((c) => Number.parseInt(c, 10));
          if (nombres.every((n) => !Number.isNaN(n))) expect(nombres.every((n, i) => i === 0 || n > nombres[i - 1])).toBe(true);
        }
      }
    }
  });
  it("une partie compte trois histoires de modèles différents, de 4, 5 puis 6 phrases", () => {
    fc.assert(fc.property(graines, (graine) => {
      const histoires = histoiresDePartie(graine);
      expect(histoires.map((h) => h.phrases.length)).toEqual(PHRASES_HISTOIRE);
      expect(histoires.reduce((n, h) => n + h.questions.length, 0)).toBe(QUESTIONS_HISTOIRE);
      // trois modèles différents : trois premières phrases qui ne se ressemblent pas
      expect(sansDoublon(histoires.map((h) => h.phrases[h.phrases.length - 1].split(" ").slice(-2).join(" ")))).toBe(true);
      expect(histoiresDePartie(graine)).toEqual(histoires);
    }));
  });
});

describe("le déroulé d'une partie d'histoires", () => {
  /** Joue les réponses données (vrai : juste) et rend l'état au dernier verdict. */
  const joue = (reponses: boolean[]): EtatHistoire => {
    let etat = DEPART_HISTOIRE;
    for (const juste of reponses) {
      if (histoireFinie(etat)) break;
      if (etat.choisie !== null) etat = avanceHistoire(etat, { type: "suite", histoire: etat.histoire, question: etat.question });
      if (etat.phase === "lecture") etat = avanceHistoire(etat, { type: "questions", histoire: etat.histoire });
      etat = avanceHistoire(etat, { type: "reponse", histoire: etat.histoire, question: etat.question, choix: juste ? "oui" : "non", juste });
    }
    return etat;
  };
  it("une histoire se lit, puis ses cinq questions s'enchaînent, puis l'histoire suivante arrive", () => {
    let etat = avanceHistoire(DEPART_HISTOIRE, { type: "questions", histoire: 0 });
    expect(etat).toMatchObject({ phase: "question", question: 0, choisie: null });
    etat = joue([true, true, true, true, true]);
    expect(etat).toMatchObject({ histoire: 0, question: 4, bonnes: 5, erreurs: 0, choisie: "oui" });
    expect(histoireFinie(etat)).toBe(false);
    etat = avanceHistoire(etat, { type: "suite", histoire: 0, question: 4 });
    expect(etat).toMatchObject({ histoire: 1, phase: "lecture", question: 0, choisie: null, bonnes: 5 });
  });
  it("la deuxième erreur arrête la partie, la quinzième question aussi", () => {
    const deuxErreurs = joue([true, false, true, false, true]);
    expect(deuxErreurs).toMatchObject({ bonnes: 2, erreurs: 2, question: 3 });
    expect(histoireFinie(deuxErreurs)).toBe(true);
    expect(avanceHistoire(deuxErreurs, { type: "suite", histoire: 0, question: 3 })).toBe(deuxErreurs);
    const tout = joue(Array.from({ length: 20 }, () => true));
    expect(tout).toMatchObject({ histoire: 2, question: 4, bonnes: QUESTIONS_HISTOIRE, erreurs: 0 });
    expect(histoireFinie(tout)).toBe(true);
    expect(scoreSur(tout.bonnes, QUESTIONS_HISTOIRE)).toBe(100);
    expect(histoireFinie(joue([true, false, true]))).toBe(false);
  });
  it("ignore une action qui ne vise pas la question en cours, et ne compte pas deux fois une réponse", () => {
    const question = avanceHistoire(DEPART_HISTOIRE, { type: "questions", histoire: 0 });
    expect(avanceHistoire(DEPART_HISTOIRE, { type: "reponse", histoire: 0, question: 0, choix: "a", juste: true })).toBe(DEPART_HISTOIRE);
    expect(avanceHistoire(question, { type: "questions", histoire: 0 })).toBe(question);
    expect(avanceHistoire(question, { type: "suite", histoire: 0, question: 0 })).toBe(question);
    expect(avanceHistoire(question, { type: "reponse", histoire: 1, question: 0, choix: "a", juste: true })).toBe(question);
    expect(avanceHistoire(question, { type: "reponse", histoire: 0, question: 2, choix: "a", juste: true })).toBe(question);
    const repondu = avanceHistoire(question, { type: "reponse", histoire: 0, question: 0, choix: "a", juste: false });
    expect(avanceHistoire(repondu, { type: "reponse", histoire: 0, question: 0, choix: "b", juste: false })).toBe(repondu);
    expect(repondu.erreurs).toBe(1);
  });
  it("quelles que soient les réponses, les compteurs restent dans leurs bornes", () => {
    fc.assert(fc.property(fc.array(fc.boolean(), { maxLength: 30 }), (reponses) => {
      const etat = joue(reponses);
      expect(etat.erreurs).toBeLessThanOrEqual(ERREURS_MAX);
      expect(etat.bonnes + etat.erreurs).toBeLessThanOrEqual(QUESTIONS_HISTOIRE);
      expect(etat.histoire).toBeLessThan(PHRASES_HISTOIRE.length);
      expect(etat.question).toBeLessThan(QUESTIONS_PAR_HISTOIRE);
      const score = scoreSur(etat.bonnes, QUESTIONS_HISTOIRE);
      expect(score >= 0 && score <= 100).toBe(true);
    }));
  });
});

describe("apprendre une méthode", () => {
  it("découpe un nombre en paquets de deux ou trois chiffres", () => {
    expect(taillesPaquets(8)).toEqual([3, 3, 2]);
    expect(taillesPaquets(9)).toEqual([3, 3, 3]);
    expect(taillesPaquets(10)).toEqual([3, 3, 2, 2]);
    expect(taillesPaquets(14)).toEqual([3, 3, 3, 3, 2]);
    expect(taillesPaquets(1)).toEqual([1]);
    expect(taillesPaquets(0)).toEqual([]);
    for (const longueur of plage(2, 30)) {
      const tailles = taillesPaquets(longueur);
      expect(tailles.reduce((s, t) => s + t, 0)).toBe(longueur);
      expect(tailles.every((t) => t === 2 || t === 3)).toBe(true);
    }
    expect(enPaquets([4, 9, 2, 7, 1, 8, 3, 6])).toEqual([[4, 9, 2], [7, 1, 8], [3, 6]]);
    expect(enPaquets([1, 2, 3, 4], [1, 3])).toEqual([[1], [2, 3, 4]]);
  });
  it("écrit un nombre long qui ne commence pas par zéro", () => {
    fc.assert(fc.property(graines, fc.constantFrom(...NIVEAUX_PAQUETS), (graine, longueur) => {
      const chiffres = nombreLong(graine, longueur);
      expect(chiffres).toHaveLength(longueur);
      expect(chiffres[0]).not.toBe(0);
      expect(chiffres.every((c) => Number.isInteger(c) && c >= 0 && c <= 9)).toBe(true);
      expect(chiffres.some((c, i) => i >= 2 && c === chiffres[i - 1] && c === chiffres[i - 2])).toBe(false);
      expect(enPaquets(chiffres).flat()).toEqual(chiffres);
      reproductible((g) => nombreLong(g, longueur), graine);
    }));
  });
  it("range un objet par pièce et demande chaque pièce occupée", () => {
    fc.assert(fc.property(graines, fc.constantFrom(...NIVEAUX_PALAIS), (graine, nombre) => {
      const p = palais(graine, nombre);
      expect(p.rangement).toHaveLength(nombre);
      expect(sansDoublon(p.rangement.map((r) => r.piece))).toBe(true);
      expect(sansDoublon(p.rangement.map((r) => r.picto))).toBe(true);
      expect(p.rangement.every((r) => PIECES.some((x) => x.id === r.piece) && ID_PICTOS.includes(r.picto))).toBe(true);
      expect(p.questions.map((q) => q.piece).sort()).toEqual(p.rangement.map((r) => r.piece).sort());
      for (const q of p.questions) {
        expect(p.rangement).toContainEqual({ piece: q.piece, picto: q.bonne });
        expect(q.choix).toHaveLength(4);
        expect(sansDoublon(q.choix)).toBe(true);
        expect(q.choix).toContain(q.bonne);
      }
      reproductible((g) => palais(g, nombre), graine);
    }));
    expect(sansDoublon(PIECES.map((p) => p.id))).toBe(true);
    expect(sansDoublon(PIECES.map((p) => p.titre))).toBe(true);
    expect(PIECES.length).toBeGreaterThanOrEqual(Math.max(...NIVEAUX_PALAIS));
    expect(PIECES.length % 2).toBe(0);
    expect(pieceDuPalais("cuisine")).toMatchObject({ titre: "Cuisine", dans: "dans la cuisine" });
    expect(() => pieceDuPalais("cave")).toThrow();
  });
});

describe("pictogrammes et formes", () => {
  it("compte au moins 24 pictogrammes aux identifiants et aux noms uniques", () => {
    expect(PICTOS.length).toBeGreaterThanOrEqual(24);
    expect(sansDoublon(ID_PICTOS)).toBe(true);
    expect(sansDoublon(PICTOS.map((p) => p.mot))).toBe(true);
    for (const p of PICTOS) expect(p.id).toMatch(/^[a-z]{2,12}$/);
    // assez d'objets pour la manche la plus chargée de chaque jeu
    expect(PICTOS.length).toBeGreaterThanOrEqual(Math.max(...NIVEAUX_MANQUANT) + 3);
    expect(PICTOS.length).toBeGreaterThanOrEqual(Math.max(...NIVEAUX_INTRUS) + 1);
  });
  it("chaque tracé ne contient que des morceaux bien écrits, dans la grille de 24", () => {
    const nombre = "-?\\d*\\.?\\d+";
    const cercle = new RegExp(`^c:${nombre},${nombre},${nombre}$`);
    const rectangle = new RegExp(`^r:${nombre},${nombre},${nombre},${nombre},${nombre}$`);
    for (const dessin of [...PICTOS, ...FORMES]) {
      const morceaux = dessin.trace.split("|");
      expect(morceaux.length).toBeGreaterThan(0);
      for (const brut of morceaux) {
        const m = brut.replace(/^[*~#]/, "");
        if (m.startsWith("c:")) expect(m).toMatch(cercle);
        else if (m.startsWith("r:")) expect(m).toMatch(rectangle);
        else expect(m).toMatch(/^M[\d\s.,\-a-zA-Z]+$/);
      }
    }
  });
  it("nomme un pictogramme avec son article, et refuse un identifiant inconnu", () => {
    expect(nomPicto("maison")).toBe("la maison");
    expect(nomPicto("arbre")).toBe("l'arbre");
    expect(nomPicto("velo")).toBe("le vélo");
    expect(titrePicto("etoile")).toBe("Étoile");
    expect(duPicto("livre")).toBe("du livre");
    expect(duPicto("cle")).toBe("de la clé");
    expect(duPicto("arbre")).toBe("de l'arbre");
    expect(picto("cle").mot).toBe("clé");
    expect(() => picto("licorne")).toThrow();
  });
  it("chaque forme existe dans chaque teinte, et chaque teinte a son remplissage", () => {
    expect(sansDoublon(FORMES.map((f) => f.id))).toBe(true);
    expect(sansDoublon(TEINTES.map((t) => t.id))).toBe(true);
    expect(sansDoublon(TEINTES.map((t) => t.motif))).toBe(true);
    expect(FORMES_COLOREES).toHaveLength(FORMES.length * TEINTES.length);
    expect(nomForme("etoile")).toBe("l'étoile");
    expect(nomForme("croix")).toBe("la croix");
    expect(ditFormeColoree({ forme: "triangle", teinte: "vert" })).toBe("triangle vert, rayé");
    expect(() => forme("pentagone")).toThrow();
    expect(() => teinte("rose")).toThrow();
    expect(TOUCHES).toHaveLength(4);
    expect(sansDoublon(TOUCHES.map((t) => t.forme)) && sansDoublon(TOUCHES.map((t) => t.teinte))).toBe(true);
    expect(FORMES.length).toBeGreaterThanOrEqual(Math.max(...NIVEAUX_DUOS));
  });
});

describe("registre des jeux de mémoire", () => {
  const ICONES = ["ampoule", "oeil", "cle", "cible", "flamme", "horloge", "eclair", "medaille", "paires", "cartes", "pluie", "relie", "indices", "chapitre", "notion", "vraifaux", "ordre", "papier", "plan", "drapeau"];
  it("compte vingt-deux jeux aux identifiants uniques, chacun dans une famille connue", () => {
    expect(JEUX_MEMOIRE).toHaveLength(22);
    expect(sansDoublon(JEUX_MEMOIRE.map((j) => j.id))).toBe(true);
    expect(sansDoublon(JEUX_MEMOIRE.map((j) => j.nom))).toBe(true);
    for (const jeu of JEUX_MEMOIRE) {
      expect(jeu.id).toMatch(/^[a-z]{2,20}$/);
      expect(FAMILLES_MEMOIRE.some((f) => f.id === jeu.famille)).toBe(true);
      expect(ICONES).toContain(jeu.icone);
    }
    for (const famille of FAMILLES_MEMOIRE) expect(JEUX_MEMOIRE.some((j) => j.famille === famille.id)).toBe(true);
  });
  it("les textes suivent les règles de rédaction : une phrase, ni tiret long, ni mot interdit", () => {
    for (const jeu of JEUX_MEMOIRE) {
      expect(jeu.resume).toMatch(/^[A-ZÀÉ].*\.$/);
      expect(`${jeu.nom} ${jeu.resume}`).not.toMatch(/—|–|découvr|prochainement|leçon/i);
      expect(jeu.resume.length).toBeLessThanOrEqual(90);
    }
  });
  it("retrouve un jeu par son identifiant", () => {
    expect(jeuMemoire("chiffres")?.nom).toBe("Suite de chiffres");
    expect(jeuMemoire("inconnu")).toBeNull();
  });
});
