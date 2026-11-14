// Les outils des tests des TP : jouer un TP du début à la fin sans le navigateur, comme le serveur le fait à chaque étape.
// Chaque TP a son fichier de tests dans tests/unitaires/tp/ : il y joue sa manipulation soignée et des manipulations fautives.
import type { EtapePublique, GesteBrut, ReponseEtape, RetourEtape } from "@/lib/commun/tp/types";
import type { EtapeTp, Mesures, Tp } from "@/lib/serveur/contenu/tp";
import { bilanDuTp, etapePublique, verifie } from "@/lib/serveur/tp";

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
export async function joue(t: Tp, graine: number, reponse: (etape: EtapeTp, publique: EtapePublique, mesures: Mesures, rang: number) => ReponseEtape): Promise<Partie> {
  const etapes = t.etapes(graine);
  let mesures: Mesures = {};
  const retours: RetourEtape[] = [];
  for (const [rang, etape] of etapes.entries()) {
    const verdict = await verifie(etape, reponse(etape, etapePublique(etape, graine), mesures, rang), mesures, graine);
    if (!verdict) throw new Error(`réponse refusée à l'étape ${rang + 1} (« ${etape.genre} ») de ${t.id}`);
    mesures = { ...mesures, ...(verdict.mesures ?? {}) };
    retours.push(verdict.retour);
  }
  const scores = retours.map((r) => r.score);
  const fautes = retours.flatMap((r) => (r.correction.genre === "paillasse" ? [r.correction.fautes.map((f) => f.code)] : []));
  return { etapes, scores, retours, mesures, bilan: bilanDuTp(etapes, scores), fautes };
}

/** Joue un TP en répondant juste partout, avec la manipulation donnée pour chaque étape de paillasse. */
export const joueJuste = (t: Tp, graine: number, gestes: (etape: EtapeDePaillasse) => GesteBrut[]): Promise<Partie> =>
  joue(t, graine, (etape, publique, mesures) => juste(etape, publique, mesures, gestes));
