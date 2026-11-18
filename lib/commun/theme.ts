// Le thème de l'application : clair, sombre, ou automatique (il suit alors le réglage du téléphone).
// Le choix voyage dans un cookie : la page s'affiche directement dans le bon thème, sans éclair ni script dans la page.
export type ChoixTheme = "auto" | "clair" | "sombre";
export const COOKIE_THEME = "mb-theme";
/** Un an : le choix reste tant que l'élève ne le change pas. */
export const DUREE_COOKIE_THEME = 365 * 86_400;

/** Lit un choix de thème ; toute autre valeur vaut « automatique ». */
export const lisChoixTheme = (v: string | null | undefined): ChoixTheme => (v === "clair" || v === "sombre" ? v : "auto");

/** L'attribut `data-theme` de la page, que lisent les feuilles de style. Absent en automatique : la page suit le téléphone. */
export const attributTheme = (c: ChoixTheme): "light" | "dark" | undefined => (c === "clair" ? "light" : c === "sombre" ? "dark" : undefined);
