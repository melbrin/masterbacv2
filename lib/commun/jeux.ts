// Le socle commun des jeux (décision 0010).
// Les jeux qui tournent dans le navigateur ne reçoivent que ce que l'élève peut déjà lire : les tableaux de l'onglet
// L'essentiel (« À connaître par cœur » et « À savoir retrouver »), les titres des questions, les noms des notions.
// Les jeux sur les questions de quiz passent par le serveur, qui garde les bonnes réponses.

/**
 * Une ligne d'un tableau de L'essentiel d'une fiche. Les trois textes sont du HTML déjà nettoyé.
 * Depuis la relecture de Yane du 18 novembre, L'essentiel a deux tableaux : « À connaître par cœur » (ce qu'il faut
 * savoir réciter) et « À savoir retrouver » (ce qu'on redémontre, dont la troisième colonne dit comment).
 */
export interface LigneEssentiel {
  /** identifiant stable dans la partie : « fiche-rang » */
  id: string;
  fiche: number;
  notion: string;
  relation: string;
  /** la troisième colonne : ce qu'il faut retenir, ou comment retrouver la relation */
  retenir: string;
  nature: "coeur" | "retrouver";
}

/** Une question de cours et le chapitre où elle se range. Le titre est du HTML déjà nettoyé. */
export interface QuestionChapitre {
  id: string;
  fiche: number;
  titre: string;
}

/** Une question de cours, la notion qu'elle fait travailler, et trois autres notions du même chapitre. */
export interface QuestionNotion {
  id: string;
  fiche: number;
  titre: string;
  notion: string;
  leurres: string[];
}

export interface ChapitreJeu {
  num: number;
  titre: string;
}

/**
 * Ce qu'un jeu appelle quand la partie est finie : le score (plus il est haut, mieux c'est) et sa durée en secondes.
 * La réponse donne le record de l'élève à ce jeu, partie comprise, et dit s'il vient d'être battu.
 * Elle vaut null si l'enregistrement a échoué : le jeu affiche alors le score sans record.
 */
export type FinDePartie = (score: number, secondes: number) => Promise<{ record: number; battu: boolean } | null>;

export const JEUX = [
  { id: "paires", nom: "Paires", resume: "Retourne les cartes et retrouve chaque notion avec sa relation.", serveur: false, icone: "paires" },
  { id: "cartes", nom: "Cartes mémoire", resume: "Une notion s'affiche. Retrouve sa relation de tête, puis retourne la carte.", serveur: false, icone: "cartes" },
  { id: "pluie", nom: "Pluie de formules", resume: "Les relations tombent. Touche la bonne notion avant qu'elles n'arrivent en bas.", serveur: false, icone: "pluie" },
  { id: "relie", nom: "Relie", resume: "Relie chaque notion à sa relation, le plus vite possible.", serveur: false, icone: "relie" },
  { id: "indices", nom: "Qui suis-je ?", resume: "Trouve la notion avec le moins d'indices possible.", serveur: false, icone: "indices" },
  { id: "chapitre", nom: "Quel chapitre ?", resume: "Range chaque question dans son chapitre.", serveur: false, icone: "chapitre" },
  { id: "notion", nom: "La bonne notion", resume: "Une question s'affiche. Trouve la notion qu'elle fait travailler.", serveur: false, icone: "notion" },
  { id: "chrono", nom: "Contre la montre", resume: "90 secondes pour répondre au plus de questions de quiz possible.", serveur: true, icone: "horloge" },
  { id: "vraifaux", nom: "Vrai ou faux", resume: "Une affirmation, une seule décision : vrai ou faux ?", serveur: true, icone: "vraifaux" },
  { id: "ordre", nom: "Dans l'ordre", resume: "Remets les étapes d'une méthode dans le bon ordre.", serveur: true, icone: "ordre" },
] as const;

export type IdJeu = (typeof JEUX)[number]["id"];
export const ID_JEUX = JEUX.map((j) => j.id) as [IdJeu, ...IdJeu[]];
export const jeu = (id: string) => JEUX.find((j) => j.id === id) ?? null;

/**
 * Mélange une liste à partir d'une graine : la même graine donne le même ordre. Les jeux s'en servent pour
 * tirer leurs cartes sans appeler le hasard pendant l'affichage (la graine vient du serveur, ou d'un compteur de manches).
 */
export function melangeGraine<T>(liste: readonly T[], graine: number): T[] {
  const a = liste.slice();
  let s = graine >>> 0 || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Les n premiers éléments de la liste mélangée. */
export const tire = <T>(liste: readonly T[], n: number, graine: number): T[] => melangeGraine(liste, graine).slice(0, Math.max(0, n));

const sansBalise = (html: string) => html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();

/**
 * Les lignes des tableaux de relations de L'essentiel d'une fiche, lues dans le HTML nettoyé de l'onglet : ceux dont
 * l'en-tête a une colonne « Relation ». « À connaître par cœur » d'abord, puis « À savoir retrouver » (reconnu à sa
 * troisième colonne, « Comment la retrouver »). Les autres tableaux (le parcours par objectif) sont ignorés.
 * Une ligne par notion, trois cellules ; une ligne incomplète est écartée.
 */
export function lignesEssentiel(html: string, fiche: number): LigneEssentiel[] {
  const lignes: LigneEssentiel[] = [];
  for (let debut = html.indexOf("<table"); debut >= 0; debut = html.indexOf("<table", debut + 6)) {
    const fin = html.indexOf("</table>", debut);
    const tableau = html.slice(debut, fin < 0 ? undefined : fin);
    const tete = tableau.includes("<thead") ? sansBalise(tableau.split(/<\/thead>/)[0]) : "";
    if (fin < 0 && !tete) break;
    if (!/relation/i.test(tete)) continue;
    const nature = /retrouver/i.test(tete) ? "retrouver" : "coeur";
    for (const rangee of tableau.split(/<tr[\s>]/).slice(1)) {
      const cellules = rangee.split(/<td[^>]*>/).slice(1).map((c) => c.split("</td>")[0].trim());
      if (cellules.length !== 3 || cellules.some((c) => !sansBalise(c))) continue;
      lignes.push({ id: `${fiche}-${lignes.length + 1}`, fiche, notion: cellules[0], relation: cellules[1], retenir: cellules[2], nature });
    }
    if (fin < 0) break;
  }
  return lignes;
}

/** Vrai si la cellule contient une formule rendue : les jeux de formules n'utilisent que ces lignes. */
export const aUneFormule = (html: string): boolean => html.includes("katex");
