// Le labo (décision 0011) : des défis où l'élève calcule d'abord, puis entre sa valeur dans une simulation.
// Le défi n'est réussi que si la simulation réussit : le ballon entre dans le panier, la lampe s'allume à la bonne date.
// Les règles sont des fonctions pures : le navigateur s'en sert pour animer, le serveur pour juger et enregistrer.
// Les énoncés des défis, eux, restent sur le serveur (lib/serveur/contenu/defis.ts).

/** Les grandeurs d'une simulation, par leur nom : celles que l'énoncé fixe et celles que l'élève saisit. */
export type Valeurs = Record<string, number>;

/** Une valeur que l'élève calcule, puis saisit. */
export interface Champ {
  id: string;
  nom: string;
  unite: string;
  min: number;
  max: number;
  /** le pas de saisie : 0,01 pour une valeur au centième */
  pas: number;
}

/** Ce que donne la simulation avec les valeurs saisies : réussie ou non, et une phrase qui dit ce qui s'est passé. */
export interface Issue {
  reussi: boolean;
  message: string;
}

export interface Mesure {
  nom: string;
  valeur: string;
}

/** Les règles d'une simulation : ce qui se passe avec des grandeurs données. */
export interface Regles {
  issue: (p: Valeurs) => Issue;
  /** la durée du mouvement à montrer, en secondes de simulation */
  duree: (p: Valeurs) => number;
  /** le nombre de secondes de simulation qui passent en une seconde à l'écran : 1 en temps réel, 0,1 au ralenti dix fois */
  cadence: (p: Valeurs) => number;
  /** les grandeurs affichées sous la scène à l'instant t */
  mesures: (p: Valeurs, t: number) => Mesure[];
}

export interface Defi {
  /** « basket-1 » : la simulation, puis le rang du défi */
  id: string;
  niveau: 10 | 14 | 18;
  titre: string;
  enonce: string;
  /** les données de l'énoncé, déjà écrites avec leur unité */
  donnees: Mesure[];
  champs: Champ[];
  /** les grandeurs fixées par l'énoncé, telles que la simulation les reçoit */
  fixes: Valeurs;
  /** les notions du tableau « À connaître par cœur » de la fiche qui servent à ce défi : leurs relations sont rappelées */
  rappel: string[];
  /** un énoncé écrit par Claude Code reste un brouillon tant que Yane ne l'a pas validé */
  etat: "brouillon" | "valide";
}

/** Une simulation du labo, telle que les pages la présentent. Ses règles sont à part, dans REGLES. */
export interface Simulation {
  id: string;
  nom: string;
  /** le thème, en un ou deux mots : « Chute libre », « Électricité » */
  theme: string;
  fiche: number;
  accroche: string;
  icone: string;
  defis: Defi[];
}

/** Trois étoiles au premier essai, deux jusqu'au troisième, une ensuite. */
export const etoilesPour = (essais: number): 1 | 2 | 3 => (essais <= 1 ? 3 : essais <= 3 ? 2 : 1);
