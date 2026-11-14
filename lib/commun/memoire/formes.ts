// Les formes et les teintes des jeux de mémoire : les touches de « Suite de couleurs », les planches de
// « Qu'est-ce qui a changé ? » et de « Formes et couleurs ».
// Une couleur ne porte jamais seule une information : chaque teinte a son remplissage (plein, rayé, à pois, vide)
// et son nom. Les couleurs elles-mêmes viennent de la charte, dans la feuille de style.

export interface Forme {
  id: string;
  /** le nom de la forme, sans article : « triangle » */
  mot: string;
  article: "le" | "la" | "l'";
  /** le contour, dans une grille de 24 sur 24 (même écriture que les pictogrammes) */
  trace: string;
}

export const FORMES: Forme[] = [
  { id: "rond", mot: "rond", article: "le", trace: "c:12,12,9" },
  { id: "carre", mot: "carré", article: "le", trace: "r:3.5,3.5,17,17,2.5" },
  { id: "triangle", mot: "triangle", article: "le", trace: "M12 3.4 21.4 19.8H2.6z" },
  { id: "etoile", mot: "étoile", article: "l'", trace: "M12 2.6l2.47 6.6 7.04.31-5.52 4.39 1.89 6.79L12 16.8l-5.88 3.89 1.89-6.79-5.52-4.39 7.04-.31z" },
  { id: "losange", mot: "losange", article: "le", trace: "M12 2.2 20.6 12 12 21.8 3.4 12z" },
  { id: "croix", mot: "croix", article: "la", trace: "M8.8 3h6.4v5.8H21v6.4h-5.8V21H8.8v-5.8H3V8.8h5.8z" },
  { id: "coeur", mot: "cœur", article: "le", trace: "M12 20.8S3 15.4 3 9a4.9 4.9 0 0 1 9-2.6A4.9 4.9 0 0 1 21 9c0 6.4-9 11.8-9 11.8z" },
  { id: "lune", mot: "lune", article: "la", trace: "M20.8 13.8A9 9 0 1 1 10.2 3.2a7.6 7.6 0 0 0 10.6 10.6z" },
];

export interface Teinte {
  id: string;
  /** le nom de la couleur : « bleu » */
  nom: string;
  /** le remplissage qui accompagne la couleur, dit en un mot */
  motif: "plein" | "rayé" | "à pois" | "vide";
}

export const TEINTES: Teinte[] = [
  { id: "bleu", nom: "bleu", motif: "plein" },
  { id: "vert", nom: "vert", motif: "rayé" },
  { id: "rouge", nom: "rouge", motif: "à pois" },
  { id: "sable", nom: "sable", motif: "vide" },
];

/** Une forme d'une teinte : « le triangle vert ». */
export interface FormeColoree { forme: string; teinte: string }

const FORME_PAR_ID = new Map(FORMES.map((f) => [f.id, f]));
const TEINTE_PAR_ID = new Map(TEINTES.map((t) => [t.id, t]));

export function forme(id: string): Forme {
  const f = FORME_PAR_ID.get(id);
  if (!f) throw new Error(`Forme inconnue : ${id}`);
  return f;
}

export function teinte(id: string): Teinte {
  const t = TEINTE_PAR_ID.get(id);
  if (!t) throw new Error(`Teinte inconnue : ${id}`);
  return t;
}

/** « le triangle », « l'étoile » : le nom d'une forme dans une phrase. */
export const nomForme = (id: string): string => {
  const f = forme(id);
  return f.article === "l'" ? `l'${f.mot}` : `${f.article} ${f.mot}`;
};

/** « triangle vert, rayé » : ce que lit un lecteur d'écran sur une forme colorée. */
export const ditFormeColoree = (f: FormeColoree): string => `${forme(f.forme).mot} ${teinte(f.teinte).nom}, ${teinte(f.teinte).motif}`;

/** Toutes les formes colorées possibles : chaque forme dans chaque teinte. */
export const FORMES_COLOREES: FormeColoree[] = FORMES.flatMap((f) => TEINTES.map((t) => ({ forme: f.id, teinte: t.id })));

/** Les quatre touches de « Suite de couleurs » : une teinte et un symbole chacune. */
export const TOUCHES: FormeColoree[] = [
  { forme: "rond", teinte: "bleu" },
  { forme: "triangle", teinte: "vert" },
  { forme: "carre", teinte: "rouge" },
  { forme: "etoile", teinte: "sable" },
];
