// Nettoyage du HTML des fiches selon la liste fermée de docs/07-contenu.md, section 4.
// Le HTML n'est pas « filtré » : il est relu balise par balise puis réécrit. Rien de ce qui
// n'est pas dans la liste ne peut sortir, même si l'entrée est malformée.
import katex from "katex";

const BALISES = new Set([
  "p", "div", "span", "strong", "em", "sub", "sup", "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td",
  "colgroup", "col", "h3", "img", "code", "pre",
]);
const SANS_FERMETURE = new Set(["img", "col"]);
// le contenu de ces balises est retiré avec elles
const A_VIDER = new Set(["script", "style", "iframe", "object", "embed", "template", "svg", "math", "noscript", "textarea", "title"]);

const CLASSES = new Set([
  "math", "inline", "display", "fig", "header", "odd", "even",
  "cs-enonce", "cs-enoncedonnees", "cs-qrappel", "cs-retenir", "cs-remarque", "cs-methode", "cs-piege", "cs-redaction",
  "cs-figure", "cs-legende", "cs-intertitre", "cs-niv10", "cs-niv14", "cs-niv18",
]);
const classePermise = (c: string) => CLASSES.has(c) || /^cs-etiq[a-z]+$/.test(c);

const LARGEUR = /^width:\s*(\d{1,3}(?:\.\d+)?)%;?$/;
// l'alignement d'une colonne de tableau (les tableaux d'avancement centrent leurs colonnes), rien d'autre
const ALIGNEMENT = /^text-align:\s*(left|center|right);?$/;
const LARGEUR_IMAGE = /^--w:\s*(\d{1,3}(?:\.\d+)?)%;?$/;
const FIGURE = /^figs\/([a-z0-9-]+)\/([A-Za-z0-9_.-]+\.webp)$/;
const TYPES_LISTE = new Set(["1", "a", "A", "i", "I"]);

// les macros de l'application : couleurs et repère d'équation
const MACROS = {
  "\\cR": "\\htmlClass{c-r}{#1}",
  "\\cV": "\\htmlClass{c-v}{#1}",
  "\\cO": "\\htmlClass{c-o}{#1}",
  "\\cB": "\\htmlClass{c-b}{#1}",
  "\\lbl": "\\qquad(\\text{#1})",
};
const CLASSES_FORMULE = new Set(["c-r", "c-v", "c-o", "c-b"]);

export interface Nettoyage {
  html: string;
  /** ce qui a été retiré ou refusé ; vide quand le contenu respecte la liste fermée */
  problemes: string[];
  /** les figures citées, sous la forme <fiche>/<nom>.webp */
  figures: string[];
  formules: number;
}

export interface Options {
  /** transforme l'adresse d'une figure ; par défaut l'adresse de l'export est gardée */
  adresseFigure?: (fiche: string, nom: string) => string;
  /** faux pour vérifier sans rendre les formules */
  rendreFormules?: boolean;
}

const echappe = (s: string) => s.replace(/&(?![a-zA-Z]+;|#\d+;|#x[0-9a-fA-F]+;)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const echappeAttribut = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const decode = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, "\u00a0").replace(/&amp;/g, "&");

const RE_BALISE = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[a-zA-Z_:][-a-zA-Z0-9_:.]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/y;
const RE_ATTRIBUT = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

export function rendFormule(tex: string, display: boolean): string {
  return katex.renderToString(tex, {
    displayMode: display,
    throwOnError: true,
    strict: "ignore",
    macros: { ...MACROS },
    trust: (ctx) => ctx.command === "\\htmlClass" && CLASSES_FORMULE.has(String((ctx as { class?: string }).class)),
    output: "html",
  });
}

/** Retire les délimiteurs \( \) ou \[ \] que l'export place autour d'une formule. */
export function texDe(texte: string): string {
  const t = decode(texte).trim();
  const m = t.match(/^\\\(([\s\S]*)\\\)$/) || t.match(/^\\\[([\s\S]*)\\\]$/);
  return m ? m[1] : t;
}

export function nettoie(source: string, options: Options = {}): Nettoyage {
  const { adresseFigure, rendreFormules = true } = options;
  const problemes: string[] = [];
  const figures: string[] = [];
  const sortie: string[] = [];
  const pile: string[] = [];
  let formules = 0;
  let i = 0;

  const attributs = (nom: string, brut: string): string => {
    let out = "";
    for (const m of brut.matchAll(RE_ATTRIBUT)) {
      const a = m[1].toLowerCase();
      const v = decode(m[2] ?? m[3] ?? m[4] ?? "");
      let garde: string | null = null;
      if (a === "class") {
        const classes = v.split(/\s+/).filter(Boolean);
        const refusees = classes.filter((c) => !classePermise(c));
        if (refusees.length) problemes.push(`classe refusée : ${refusees.join(" ")}`);
        const bonnes = classes.filter(classePermise);
        if (bonnes.length) garde = bonnes.join(" ");
        else continue;
      } else if (a === "id" && nom === "h3" && /^[\p{L}\p{N}_-]{1,120}$/u.test(v)) garde = v;
      else if (nom === "img" && a === "src") {
        const f = v.match(FIGURE);
        if (f) {
          figures.push(`${f[1]}/${f[2]}`);
          garde = adresseFigure ? adresseFigure(f[1], f[2]) : v;
        }
      } else if (nom === "img" && a === "alt" && v.length <= 600) garde = v;
      else if (nom === "img" && a === "loading" && (v === "lazy" || v === "eager")) garde = v;
      else if (nom === "ol" && a === "start" && /^\d{1,3}$/.test(v)) garde = v;
      else if (nom === "ol" && a === "type" && TYPES_LISTE.has(v)) garde = v;
      else if (a === "style" && (nom === "col" || nom === "table")) {
        const l = v.trim().match(LARGEUR);
        if (l && Number(l[1]) <= 100) garde = `width: ${l[1]}%`;
      } else if (a === "style" && (nom === "th" || nom === "td")) {
        const al = v.trim().match(ALIGNEMENT);
        if (al) garde = `text-align: ${al[1]}`;
      } else if (a === "style" && nom === "img") {
        const l = v.trim().match(LARGEUR_IMAGE);
        if (l && Number(l[1]) <= 100) garde = `--w:${l[1]}%`;
      }
      if (garde === null) problemes.push(`attribut refusé : ${a} sur ${nom}`);
      else out += ` ${a}="${echappeAttribut(garde)}"`;
    }
    return out;
  };

  while (i < source.length) {
    const lt = source.indexOf("<", i);
    if (lt === -1) { sortie.push(echappe(source.slice(i))); break; }
    if (lt > i) sortie.push(echappe(source.slice(i, lt)));
    if (source.startsWith("<!--", lt)) {
      const fin = source.indexOf("-->", lt + 4);
      problemes.push("commentaire retiré");
      i = fin === -1 ? source.length : fin + 3;
      continue;
    }
    RE_BALISE.lastIndex = lt;
    const m = RE_BALISE.exec(source);
    if (!m) { problemes.push("chevron isolé ou balise illisible"); sortie.push("&lt;"); i = lt + 1; continue; }
    const [tout, fermante, nomBrut, attrsBruts] = m;
    const nom = nomBrut.toLowerCase();
    i = lt + tout.length;

    if (!BALISES.has(nom)) {
      problemes.push(`balise refusée : ${nom}`);
      if (!fermante && A_VIDER.has(nom)) {
        const fin = source.toLowerCase().indexOf(`</${nom}`, i);
        i = fin === -1 ? source.length : source.indexOf(">", fin) === -1 ? source.length : source.indexOf(">", fin) + 1;
      }
      continue;
    }
    if (fermante) {
      if (SANS_FERMETURE.has(nom)) continue;
      if (pile[pile.length - 1] !== nom) { problemes.push(`fermeture inattendue : ${nom}`); continue; }
      pile.pop();
      sortie.push(`</${nom}>`);
      continue;
    }
    const attrs = attributs(nom, attrsBruts);
    if (nom === "img") {
      if (!/ src="/.test(attrs)) { problemes.push("image sans adresse permise"); continue; }
      sortie.push(`<img${attrs}>`);
      continue;
    }
    if (nom === "span" && /class="[^"]*\bmath\b/.test(attrs)) {
      const fin = source.indexOf("</span>", i);
      const texte = fin === -1 ? "" : source.slice(i, fin);
      if (fin === -1 || texte.includes("<")) { problemes.push("formule mal formée"); continue; }
      i = fin + "</span>".length;
      formules += 1;
      const display = /\bdisplay\b/.test(attrs);
      if (!rendreFormules) { sortie.push(`<span${attrs}>${echappe(texte)}</span>`); continue; }
      try {
        sortie.push(`<span${attrs}>${rendFormule(texDe(texte), display)}</span>`);
      } catch (e) {
        problemes.push(`formule refusée par KaTeX : ${texDe(texte).slice(0, 60)} (${e instanceof Error ? e.message.slice(0, 80) : "erreur"})`);
        sortie.push(`<span${attrs}>${echappe(texte)}</span>`);
      }
      continue;
    }
    sortie.push(`<${nom}${attrs}>`);
    if (!SANS_FERMETURE.has(nom)) pile.push(nom);
  }
  // une balise restée ouverte est refermée : la sortie est toujours bien formée
  while (pile.length) {
    const nom = pile.pop() as string;
    problemes.push(`balise non fermée : ${nom}`);
    sortie.push(`</${nom}>`);
  }
  return { html: sortie.join(""), problemes, figures, formules };
}
