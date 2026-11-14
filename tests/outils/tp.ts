// Les outils des tests des TP : jouer un TP du début à la fin sans le navigateur, comme le serveur le fait à chaque étape.
// Chaque TP a son fichier de tests dans tests/unitaires/tp/ : il y joue sa manipulation soignée et des manipulations fautives.
// Un TP en construction n'est pas inscrit dans l'application : son test importe son fichier et donne ses règles (`regles`).
import { expect } from "vitest";
import type { EtapePublique, GesteBrut, ReglesPaillasse, ReponseEtape, RetourEtape } from "@/lib/commun/tp/types";
import type { EtapeTp, Mesures, Tp } from "@/lib/serveur/contenu/tp/types";
import { bilanDuTp, etapePublique, reglesDe, verifie } from "@/lib/serveur/tp";

/** Les règles des paillasses d'un TP en construction, par genre : `{ optique: regles }`. Sans elles, celles de l'application. */
export type ReglesDuTest = Record<string, ReglesPaillasse<unknown, unknown>>;
const trouve = (regles?: ReglesDuTest) => async (genre: string) => (regles && Object.hasOwn(regles, genre) ? regles[genre] : reglesDe(genre));

/** Des graines d'essai : assez pour passer par toutes les valeurs possibles d'une situation qui en a jusqu'à six. */
export const GRAINES = [1, 2, 3, 4, 5, 6, 20261114];

export type EtapeDePaillasse = Extract<EtapeTp, { genre: "paillasse" }>;

/** La réponse juste à une étape. `gestes` donne la manipulation pour une étape de paillasse. */
export function juste(etape: EtapeTp, publique: EtapePublique, mesures: Mesures, gestes: (etape: EtapeDePaillasse) => GesteBrut[]): ReponseEtape {
  switch (etape.genre) {
    case "lecture": return { g: "lecture" };
    case "materiel": return { g: "materiel", choisis: etape.objets.filter((o) => o.utile).map((o) => o.id) };
    case "ordre": {
      // l'élève voit les étapes mélangées : il donne, pour chaque rang du bon ordre, la place de l'étape dans ce qu'il voit
      const montrees = (publique as Extract<EtapePublique, { genre: "ordre" }>).etapes;
      return { g: "ordre", ordre: etape.etapes.map((e) => montrees.indexOf(e)) };
    }
    case "choix": return { g: "choix", choix: typeof etape.bonne === "function" ? etape.bonne(mesures) : etape.bonne };
    case "valeur": return { g: "valeur", valeur: etape.attendu(mesures) };
    case "paillasse": return { g: "paillasse", gestes: gestes(etape) };
  }
}

/** Une réponse fausse à une étape ; à la paillasse, aucun geste. */
export function fausse(etape: EtapeTp, publique: EtapePublique, mesures: Mesures): ReponseEtape {
  switch (etape.genre) {
    case "lecture": return { g: "lecture" };
    case "materiel": return { g: "materiel", choisis: etape.objets.filter((o) => !o.utile).map((o) => o.id) };
    case "ordre": {
      // le protocole à l'envers : loin de tout ordre accepté
      const montrees = (publique as Extract<EtapePublique, { genre: "ordre" }>).etapes;
      return { g: "ordre", ordre: [...etape.etapes].reverse().map((e) => montrees.indexOf(e)) };
    }
    case "choix": return { g: "choix", choix: ((typeof etape.bonne === "function" ? etape.bonne(mesures) : etape.bonne) + 1) % etape.options.length };
    case "valeur": return { g: "valeur", valeur: etape.attendu(mesures) * 3 + 7 };
    case "paillasse": return { g: "paillasse", gestes: [] };
  }
}

export interface Partie {
  etapes: EtapeTp[];
  scores: number[];
  retours: RetourEtape[];
  /** les mesures tirées des manipulations, comme le serveur les garde d'une étape à l'autre */
  mesures: Mesures;
  /** le niveau de chaque compétence */
  bilan: ReturnType<typeof bilanDuTp>;
  /** les fautes relevées à chaque étape de paillasse, par leur code */
  fautes: string[][];
}

/** Joue un TP du début à la fin avec la graine donnée. `reponse` choisit ce que l'élève répond à chaque étape. */
export async function joue(t: Tp, graine: number, reponse: (etape: EtapeTp, publique: EtapePublique, mesures: Mesures, rang: number) => ReponseEtape, regles?: ReglesDuTest): Promise<Partie> {
  const etapes = t.etapes(graine);
  let mesures: Mesures = {};
  const retours: RetourEtape[] = [];
  for (const [rang, etape] of etapes.entries()) {
    const verdict = await verifie(etape, reponse(etape, etapePublique(etape, graine), mesures, rang), mesures, graine, trouve(regles));
    if (!verdict) throw new Error(`réponse refusée à l'étape ${rang + 1} (« ${etape.genre} ») de ${t.id}`);
    mesures = { ...mesures, ...(verdict.mesures ?? {}) };
    retours.push(verdict.retour);
  }
  const scores = retours.map((r) => r.score);
  const fautes = retours.flatMap((r) => (r.correction.genre === "paillasse" ? [r.correction.fautes.map((f) => f.code)] : []));
  return { etapes, scores, retours, mesures, bilan: bilanDuTp(etapes, scores), fautes };
}

/** Joue un TP en répondant juste partout, avec la manipulation donnée pour chaque étape de paillasse. */
export const joueJuste = (t: Tp, graine: number, gestes: (etape: EtapeDePaillasse) => GesteBrut[], regles?: ReglesDuTest): Promise<Partie> =>
  joue(t, graine, (etape, publique, mesures) => juste(etape, publique, mesures, gestes), regles);

/**
 * Les contrôles communs à tous les TP, à appeler dans un test : la forme des étapes pour chaque graine, rien de la
 * réponse dans ce que le navigateur reçoit, un protocole toujours présenté mélangé, et un TP qui va au bout même en
 * se trompant partout et sans manipuler.
 */
export async function controlesCommuns(t: Tp, regles?: ReglesDuTest): Promise<void> {
  expect(t.id).toMatch(/^[a-z]{2,20}$/);
  expect(t.etat).toBe("brouillon");
  expect(t.minutes).toBeGreaterThanOrEqual(15);
  const longueurs = new Set<number>();
  for (const graine of GRAINES) {
    const etapes = t.etapes(graine);
    longueurs.add(etapes.length);
    expect(etapes[0].genre).toBe("lecture");
    expect(etapes.filter((e) => e.genre === "paillasse").length).toBeGreaterThanOrEqual(1);
    expect(new Set(etapes.flatMap((e) => (e.genre === "lecture" ? [] : [e.competence])))).toEqual(new Set(["APP", "ANA", "REA", "VAL"]));
    for (const e of etapes) {
      if (e.genre === "materiel") {
        expect(new Set(e.objets.map((o) => o.id)).size).toBe(e.objets.length);
        expect(e.objets.some((o) => o.utile) && e.objets.some((o) => !o.utile)).toBe(true);
      }
      if (e.genre === "ordre") {
        for (const autre of e.autres ?? []) expect([...autre].sort()).toEqual(e.etapes.map((_, i) => i));
        // les étapes arrivent mélangées, jamais dans un bon ordre, et toujours pareil pour la même graine
        const montrees = (etapePublique(e, graine) as Extract<EtapePublique, { genre: "ordre" }>).etapes;
        expect([...montrees].sort()).toEqual([...e.etapes].sort());
        expect([e.etapes.map((_, i) => i), ...(e.autres ?? [])].map((o) => o.join())).not.toContain(montrees.map((x) => e.etapes.indexOf(x)).join());
      }
      if (e.genre === "choix" && typeof e.bonne === "number") expect(e.bonne).toBeLessThan(e.options.length);
      if (e.genre === "paillasse") {
        expect(await trouve(regles)(e.paillasse.genre), `les règles de la paillasse « ${e.paillasse.genre} »`).not.toBeNull();
        expect(e.protocole.length).toBeGreaterThanOrEqual(2);
      }
      // aucune étape ne porte sa réponse
      expect(/"(utile|bonne|pourquoi|explication|autres|attendu|detail)"/.test(JSON.stringify(etapePublique(e, graine))), `${t.id} : ${e.genre}`).toBe(false);
    }
    const publiques = JSON.stringify(etapes.map((e) => etapePublique(e, graine)));
    // ni tiret long ni émoji dans ce que l'élève lit ; la même graine redonne les mêmes étapes
    expect(/[—–\u{1F300}-\u{1FAFF}]/u.test(publiques)).toBe(false);
    expect(JSON.stringify(t.etapes(graine).map((e) => etapePublique(e, graine)))).toBe(publiques);
  }
  // le nombre d'étapes ne dépend pas de la graine : un essai repris retrouve sa place
  expect(longueurs.size).toBe(1);
  // en se trompant partout et sans manipuler : D partout, et l'exploitation reste calculable
  for (const graine of GRAINES.slice(0, 3)) {
    const { etapes, scores, mesures, bilan } = await joue(t, graine, (e, p, m) => fausse(e, p, m), regles);
    expect(scores.filter((_, i) => etapes[i].genre !== "lecture").every((x) => x === 0), `graine ${graine} : ${scores.join(" ")}`).toBe(true);
    expect(bilan).toEqual({ APP: "D", ANA: "D", REA: "D", VAL: "D" });
    expect(Object.values(mesures).every((v) => Number.isFinite(v))).toBe(true);
  }
}
