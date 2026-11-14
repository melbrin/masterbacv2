// Les pictogrammes des jeux de mémoire : des objets simples, dessinés pour l'application, lisibles en petit.
// Aucune image, aucun émoji, rien chargé de l'extérieur. Le composant qui les affiche est dans components/memoire/.
//
// Un tracé tient dans une grille de 24 sur 24. Ses morceaux sont séparés par « | » :
//   « c:cx,cy,r » un cercle, « r:x,y,largeur,hauteur,rayon » un rectangle, sinon le chemin d'un trait.
// Un morceau peut commencer par un signe : « * » trait et fond léger, « ~ » fond léger seul, « # » plein.

export interface Picto {
  /** identifiant en minuscules, sans accent */
  id: string;
  /** le nom de l'objet, sans article : « maison » */
  mot: string;
  article: "le" | "la" | "l'";
  trace: string;
}

export const PICTOS: Picto[] = [
  { id: "maison", mot: "maison", article: "la", trace: "~M5 9.8 12 3.9l7 5.9V20H5z|M5 9.8V20h14V9.8|M2.8 11.6 12 3.9l9.2 7.7|M10 20v-5.5h4V20" },
  { id: "arbre", mot: "arbre", article: "l'", trace: "*c:12,9,6.2|M12 10.5V21|M12 15.5l3-3|M12 13.5l-2.6-2.6|M8 21h8" },
  { id: "cle", mot: "clé", article: "la", trace: "*c:7.5,8,4|M10.4 10.9 20 20.5|M15.6 16.1l2.4-2.4|M18.4 18.9l2.2-2.2" },
  { id: "etoile", mot: "étoile", article: "l'", trace: "*M12 3l2.29 6.14 6.56.29-5.14 4.08 1.76 6.31L12 16.2l-5.47 3.62 1.76-6.31-5.14-4.08 6.56-.29z" },
  { id: "lune", mot: "lune", article: "la", trace: "*M20.5 13.6A8.7 8.7 0 1 1 10.4 3.5a7.4 7.4 0 0 0 10.1 10.1z" },
  { id: "poisson", mot: "poisson", article: "le", trace: "*M3 12c2.6-4.2 8.6-6 13-2.5l4.5-3v11l-4.5-3c-4.4 3.5-10.4 1.7-13-2.5z|#c:7.4,11.2,.8|M11 9.3c.9 1.6.9 3.8 0 5.4" },
  { id: "bateau", mot: "bateau", article: "le", trace: "*M3 15.5h18l-2.6 5H5.6z|M12 2.5v13|*M12 4.2l6.2 8.6H12z|M12 6.5l-4.6 6.3H12" },
  { id: "tasse", mot: "tasse", article: "la", trace: "*M5 9h11v6.5a4.5 4.5 0 0 1-4.5 4.5h-2A4.5 4.5 0 0 1 5 15.5z|M16 10.6h1.5a2.6 2.6 0 0 1 0 5.2H16|M8.6 3c-.9 1.3.9 2.2 0 3.5|M12.4 3c-.9 1.3.9 2.2 0 3.5" },
  { id: "velo", mot: "vélo", article: "le", trace: "*c:6,16,4|*c:18,16,4|M6 16 9.5 9h6L18 16|M11.5 16 9.5 9|M11.5 16l4-7|M6 16h5.5|M8 9h3|M15.5 9l-.8-2.6h2.3" },
  { id: "livre", mot: "livre", article: "le", trace: "*M3 5.6c3-1.1 6-.9 9 .9 3-1.8 6-2 9-.9v13c-3-1.1-6-.9-9 .9-3-1.8-6-2-9-.9z|M12 6.5v13" },
  { id: "soleil", mot: "soleil", article: "le", trace: "*c:12,12,4.3|M12 2.5V5|M12 19v2.5|M2.5 12H5|M19 12h2.5|M5.3 5.3 7 7|M17 17l1.7 1.7|M5.3 18.7 7 17|M17 7l1.7-1.7" },
  { id: "nuage", mot: "nuage", article: "le", trace: "*M7 18.5a4.3 4.3 0 0 1-.6-8.5A5.6 5.6 0 0 1 17.2 9a4.8 4.8 0 0 1 .3 9.5z" },
  { id: "fleur", mot: "fleur", article: "la", trace: "*c:12,4.8,2.5|*c:16.2,7.8,2.5|*c:14.6,12.7,2.5|*c:9.4,12.7,2.5|*c:7.8,7.8,2.5|c:12,9.2,1.9|M12 15.2v6.3|M12 19.5c2.4 0 4-1.2 4.5-3.2-2.4 0-4 1.2-4.5 3.2z" },
  { id: "coeur", mot: "cœur", article: "le", trace: "*M12 20.5S3.5 15.5 3.5 9.3A4.6 4.6 0 0 1 12 6.9a4.6 4.6 0 0 1 8.5 2.4c0 6.2-8.5 11.2-8.5 11.2z" },
  { id: "parapluie", mot: "parapluie", article: "le", trace: "*M3 12a9 9 0 0 1 18 0c-1.5-1.5-4.5-1.5-6 0-1.5-1.5-4.5-1.5-6 0-1.5-1.5-4.5-1.5-6 0z|M12 12v7.3a2.2 2.2 0 0 1-4.4 0|M12 3V1.9" },
  { id: "ballon", mot: "ballon", article: "le", trace: "*M12 2.8c3.4 0 6 2.9 6 6.5s-2.6 6.9-6 6.9-6-3.3-6-6.9 2.6-6.5 6-6.5z|M10.8 16.2l-.6 1.7h3.6l-.6-1.7|M12 17.9c-1.5 1.3 1.5 2.4 0 3.8" },
  { id: "cloche", mot: "cloche", article: "la", trace: "*M6 16.5V11a6 6 0 0 1 12 0v5.5l1.8 2.2H4.2z|M10.2 20.7a1.9 1.9 0 0 0 3.6 0|M12 5V3.2" },
  { id: "chapeau", mot: "chapeau", article: "le", trace: "*M7.5 16.2V7.6a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v8.6|M7.5 12.8h9|*r:3.5,16.2,17,2.8,1.2" },
  { id: "bougie", mot: "bougie", article: "la", trace: "*r:8.5,10.5,7,10,1|M12 10.5V8.6|*M12 2.6c1.6 1.7 2.3 2.9 2.3 4a2.3 2.3 0 0 1-4.6 0c0-1.1.7-2.3 2.3-4z|M8.5 14c1.2 1 2.3 1 3.5 0s2.3-1 3.5 0|M6 20.5h12" },
  { id: "feuille", mot: "feuille", article: "la", trace: "*M5 19C4 11 9 4.5 19.5 4.5 19.5 14 13 19.5 5 19z|M5 19 15.5 8.5|M8.3 15.7v-3.6|M11.6 12.4h3.6" },
  { id: "pomme", mot: "pomme", article: "la", trace: "*M12 7.5c-1.8-1.4-4.6-1.2-6 .6-1.8 2.3-1.3 6.5.6 9.4 1.2 1.8 2.8 2.9 4.2 2.4.8-.3 1.6-.3 2.4 0 1.4.5 3-.6 4.2-2.4 1.9-2.9 2.4-7.1.6-9.4-1.4-1.8-4.2-2-6-.6z|M12 7.5c0-1.7.6-3.1 1.8-4.2|*M13.4 5.2c1.7.4 3.3-.4 3.9-2-1.7-.4-3.3.4-3.9 2z" },
  { id: "champignon", mot: "champignon", article: "le", trace: "*M3.5 12.5a8.5 8 0 0 1 17 0c0 1-.8 1.5-1.8 1.5H5.3c-1 0-1.8-.5-1.8-1.5z|M9.5 14v4.5a2.5 2.5 0 0 0 5 0V14|c:9,9.3,1|c:14.6,8.3,1.3" },
  { id: "ancre", mot: "ancre", article: "l'", trace: "*c:12,4.8,1.9|M12 6.7v13.6|M8.3 10.2h7.4|M4.6 13.4c.6 4 3.6 6.9 7.4 6.9s6.8-2.9 7.4-6.9|M3 15.8l1.6-2.4 2.4 1.2|M21 15.8l-1.6-2.4-2.4 1.2" },
  { id: "fusee", mot: "fusée", article: "la", trace: "*M12 2.5c3 2.6 4.2 6 4.2 9.5v4.5H7.8V12c0-3.5 1.2-6.9 4.2-9.5z|c:12,9.6,1.8|M7.8 12.6 5 15.6v3.8l2.8-2|M16.2 12.6l2.8 3v3.8l-2.8-2|M10.4 18.8c.3 1.2.8 2.1 1.6 2.9.8-.8 1.3-1.7 1.6-2.9" },
  { id: "enveloppe", mot: "enveloppe", article: "l'", trace: "*r:3,5.5,18,13,2|M3.6 7.4 12 13.4l8.4-6" },
  { id: "note", mot: "note", article: "la", trace: "M10 17.5V5.8l9-2.2v11.7|*c:7.3,17.5,2.7|*c:16.3,15.3,2.7|M10 9.6l9-2.2" },
  { id: "ampoule", mot: "ampoule", article: "l'", trace: "*M12 2.8a6.2 6.2 0 0 0-3.7 11.2c.7.5 1.1 1.3 1.1 2.1v.6h5.2v-.6c0-.8.4-1.6 1.1-2.1A6.2 6.2 0 0 0 12 2.8z|M9.8 19.2h4.4|M10.7 21.5h2.6" },
  { id: "cadenas", mot: "cadenas", article: "le", trace: "*r:5,10.5,14,10.5,2.2|M8 10.5V8a4 4 0 0 1 8 0v2.5|M12 14.5v2.6" },
  { id: "crayon", mot: "crayon", article: "le", trace: "*M4 20l1.2-4.8L16.5 3.9a1.6 1.6 0 0 1 2.3 0l1.3 1.3a1.6 1.6 0 0 1 0 2.3L8.8 18.8z|M14.9 5.5l3.6 3.6|M5.2 15.2l3.6 3.6" },
  { id: "voiture", mot: "voiture", article: "la", trace: "~M2.5 16.5v-3.2c0-.8.5-1.4 1.3-1.6l2.2-.5 1.8-3.4c.4-.8 1.1-1.3 2-1.3h4.6c.8 0 1.5.4 1.9 1l2.4 3.6 1.6.4c.7.2 1.2.8 1.2 1.6v3.4z|M4.8 16.5H2.5v-3.2c0-.8.5-1.4 1.3-1.6l2.2-.5 1.8-3.4c.4-.8 1.1-1.3 2-1.3h4.6c.8 0 1.5.4 1.9 1l2.4 3.6 1.6.4c.7.2 1.2.8 1.2 1.6v3.4h-2.3|M9.2 16.5h4.6|c:7,16.9,2.1|c:16,16.9,2.1|M6.1 11.2h11.7" },
  { id: "avion", mot: "avion", article: "l'", trace: "*M21.5 2.5 2.5 10l7 3 3 7z|M9.5 13l12-10.5" },
  { id: "montagne", mot: "montagne", article: "la", trace: "*M2.5 19.5 9 7l4 7.2 2.6-3.7 5.9 9z|M7.1 10.7l1.9 1.5 1.8-1.7|c:17.8,5.8,1.8" },
  { id: "goutte", mot: "goutte", article: "la", trace: "*M12 3c3.2 4 6 7.4 6 11a6 6 0 0 1-12 0c0-3.6 2.8-7 6-11z|M9.2 14.6c.2 1.4 1 2.4 2.2 2.8" },
  { id: "flocon", mot: "flocon", article: "le", trace: "M12 2.5v19|M3.8 7.25l16.4 9.5|M20.2 7.25 3.8 16.75|M9.8 4.3 12 6.3l2.2-2|M9.8 19.7l2.2-2 2.2 2" },
  { id: "eclair", mot: "éclair", article: "l'", trace: "*M13.5 2.5 5 13.5h6l-1.5 8L19 10h-6.5z" },
  { id: "diamant", mot: "diamant", article: "le", trace: "*M7 4h10l4.5 5.5L12 21 2.5 9.5z|M2.5 9.5h19|M9 9.5 12 21l3-11.5|M7 4l2 5.5L12 4l3 5.5L17 4" },
  { id: "couronne", mot: "couronne", article: "la", trace: "*M3.6 18.5 2.6 7.5l5 4.2L12 5l4.4 6.7 5-4.2-1 11z|M4 21.5h16" },
  { id: "drapeau", mot: "drapeau", article: "le", trace: "M5 21.5V3|*M5 4.5c2.5-1.5 5-1.5 7.5 0s5 1.5 7.5 0v8c-2.5 1.5-5 1.5-7.5 0s-5-1.5-7.5 0z" },
  { id: "chat", mot: "chat", article: "le", trace: "*M4.5 4.5 8.5 8h7l4-3.5v9a7.5 7.5 0 0 1-15 0z|#c:9.3,12.4,.9|#c:14.7,12.4,.9|M12 15v1.2|M10.3 17.3c.6.5 1.3.4 1.7-.3.4.7 1.1.8 1.7.3" },
  { id: "papillon", mot: "papillon", article: "le", trace: "*M12 9.5C10.5 6 7.5 4 4.5 5c-1.5 3.5 0 7 3.5 8-2 1.5-2.5 4.5-.5 6.5 2.5-.5 4-3 4.5-6z|*M12 9.5c1.5-3.5 4.5-5.5 7.5-4.5 1.5 3.5 0 7-3.5 8 2 1.5 2.5 4.5.5 6.5-2.5-.5-4-3-4.5-6z|M12 8.5v11|M12 8.5l-1.6-3|M12 8.5l1.6-3" },
  { id: "glace", mot: "glace", article: "la", trace: "*M7.2 11.5 12 21.5l4.8-10z|*M6.6 11.5a5.4 5.4 0 0 1 10.8 0z|M9.4 15.6l3.9 3.2|M14.6 15.6l-3.9 3.2" },
  { id: "cerise", mot: "cerise", article: "la", trace: "*c:11,15.5,5|M11 10.5c.6-3 2.4-5.4 5.4-7|*M16.4 3.5c2-.9 4-.3 5 1.4-2 .9-4 .3-5-1.4z" },
  { id: "de", mot: "dé", article: "le", trace: "*r:4,4,16,16,3.2|#c:8.6,8.6,1.2|#c:15.4,8.6,1.2|#c:12,12,1.2|#c:8.6,15.4,1.2|#c:15.4,15.4,1.2" },
  { id: "cadeau", mot: "cadeau", article: "le", trace: "*r:4.5,10,15,10.5,1.2|*r:3.2,6.5,17.6,3.5,1|M12 6.5v14|M12 6.5c-1.2-2.6-3.3-3.8-4.7-3-1.3.8-.6 3 4.7 3z|M12 6.5c1.2-2.6 3.3-3.8 4.7-3 1.3.8.6 3-4.7 3z" },
  { id: "reveil", mot: "réveil", article: "le", trace: "*c:12,13.2,7|M12 9.6v3.6l2.6 1.6|M5.6 5.4 3.4 7.6|M18.4 5.4l2.2 2.2|M7.2 19.2l-1.4 2|M16.8 19.2l1.4 2|M12 6.2V4.4" },
  { id: "valise", mot: "valise", article: "la", trace: "*r:3.5,8,17,12.5,2|M9 8V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v2|M8 8v12.5|M16 8v12.5" },
  { id: "tente", mot: "tente", article: "la", trace: "*M12 4.5 3 19.5h18z|M12 11l-3.4 8.5|M12 11l3.4 8.5|M12 4.5V2.6|M1.8 19.5h20.4" },
  { id: "cactus", mot: "cactus", article: "le", trace: "*M9.5 21V6.5a2.5 2.5 0 0 1 5 0V21z|M9.5 14.5H7.6a2.1 2.1 0 0 1-2.1-2.1V10|M14.5 12.5h1.9a2.1 2.1 0 0 0 2.1-2.1V8.4|M6 21h12" },
  { id: "sablier", mot: "sablier", article: "le", trace: "*M6.5 3.5h11v3.2c0 2-1.4 3.6-3.4 5.3 2 1.7 3.4 3.3 3.4 5.3v3.2h-11v-3.2c0-2 1.4-3.6 3.4-5.3-2-1.7-3.4-3.3-3.4-5.3z|M5 3.5h14|M5 20.5h14" },
  { id: "phare", mot: "phare", article: "le", trace: "*M9.4 21.5l1-12.5h3.2l1 12.5z|*r:9.6,5.2,4.8,3.8,.7|M9.3 5.2 12 2.8l2.7 2.4|M7.4 6.3l-3-1|M7.4 7.9l-3 1|M16.6 6.3l3-1|M16.6 7.9l3 1|M10.1 13.3h3.8|M9.8 17.3h4.4" },
  { id: "lampe", mot: "lampe", article: "la", trace: "*M8.2 3.5h7.6l3 8H5.2z|M12 11.5V20|M8 20.5h8" },
  { id: "coupe", mot: "coupe", article: "la", trace: "*M7.5 4h9v5.6a4.5 4.5 0 0 1-9 0z|M7.5 5.6H5.2c0 2.2 1 3.6 2.6 3.9|M16.5 5.6h2.3c0 2.2-1 3.6-2.6 3.9|M12 14.1v4|M8.6 20.6h6.8|M9.8 18.1h4.4" },
  { id: "aimant", mot: "aimant", article: "l'", trace: "*M5 4h4.2v8a2.8 2.8 0 0 0 5.6 0V4H19v8a7 7 0 0 1-14 0z|M5 7.6h4.2|M14.8 7.6H19" },
  { id: "bouteille", mot: "bouteille", article: "la", trace: "*M10 2.6h4v4l2.2 3.3c.5.8.8 1.7.8 2.7V20a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 20v-7.4c0-1 .3-1.9.8-2.7L10 6.6z|M7 13.6h10|M7 17.6h10" },
  { id: "chaise", mot: "chaise", article: "la", trace: "*M7.5 12.5v-8a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v8|M5.5 12.5h13|M7 12.5V21|M17 12.5V21|M7 17h10" },
  { id: "panier", mot: "panier", article: "le", trace: "*M4 10.5h16l-1.6 9a1.5 1.5 0 0 1-1.5 1.2H7.1a1.5 1.5 0 0 1-1.5-1.2z|M7.5 10.5a4.5 5.5 0 0 1 9 0|M9 13.8v3.8|M12 13.8v3.8|M15 13.8v3.8" },
  { id: "telephone", mot: "téléphone", article: "le", trace: "*r:7,2.5,10,19,2.4|M10.6 18.4h2.8" },
  { id: "robot", mot: "robot", article: "le", trace: "*r:6,7,12,9,2|#c:9.5,11.5,1|#c:14.5,11.5,1|M12 7V4.8|c:12,3.6,1.1|*r:7.5,16,9,5,1.5|M4 10.5v2.5|M20 10.5v2.5" },
  { id: "fantome", mot: "fantôme", article: "le", trace: "*M5.5 20.5v-10a6.5 6.5 0 0 1 13 0v10l-2.2-1.8-2.1 1.8-2.2-1.8-2.2 1.8-2.1-1.8z|#c:9.6,10.6,.9|#c:14.4,10.6,.9" },
  { id: "cerfvolant", mot: "cerf-volant", article: "le", trace: "*M12 2.5l6.5 8L12 17l-6.5-6.5z|M12 2.5V17|M5.5 10.5h13|M12 17c-1.5 1.5 1.5 2.5 0 4.5" },
  { id: "bonbon", mot: "bonbon", article: "le", trace: "*c:12,12,4.5|M7.9 10.2 3.5 7.5v9l4.4-2.7|M16.1 10.2l4.4-2.7v9l-4.4-2.7" },
  { id: "casque", mot: "casque", article: "le", trace: "M4.5 14.5V12a7.5 7.5 0 0 1 15 0v2.5|*r:3.2,13.5,4,6.5,1.6|*r:16.8,13.5,4,6.5,1.6" },
];

const PAR_ID = new Map(PICTOS.map((p) => [p.id, p]));

/** Le pictogramme d'un identifiant ; une erreur si l'identifiant n'existe pas, pour ne jamais afficher une case vide. */
export function picto(id: string): Picto {
  const p = PAR_ID.get(id);
  if (!p) throw new Error(`Pictogramme inconnu : ${id}`);
  return p;
}

/** « la maison », « l'arbre » : le nom d'un pictogramme dans une phrase. */
export const nomPicto = (id: string): string => {
  const p = picto(id);
  return p.article === "l'" ? `l'${p.mot}` : `${p.article} ${p.mot}`;
};

/** « du livre », « de la clé », « de l'arbre » : le nom d'un pictogramme après « de ». */
export const duPicto = (id: string): string => {
  const p = picto(id);
  return p.article === "le" ? `du ${p.mot}` : p.article === "la" ? `de la ${p.mot}` : `de l'${p.mot}`;
};

/** « Maison » : le nom d'un pictogramme seul, sur un bouton. */
export const titrePicto = (id: string): string => {
  const mot = picto(id).mot;
  return mot.charAt(0).toLocaleUpperCase("fr-FR") + mot.slice(1);
};

/** Les identifiants de tous les pictogrammes, pour les tirages. */
export const ID_PICTOS: readonly string[] = PICTOS.map((p) => p.id);
