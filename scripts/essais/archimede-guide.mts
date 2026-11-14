// Essai à la main du guide de la paillasse Archimède, dans un vrai navigateur, à la souris seulement, sur son banc de
// chantier (/app/tp/chantier/thermo). Le robot ne sait rien de la poussée d'Archimède : il fait le geste que la main du
// guide montre (glisser un objet, glisser la potence), il touche la touche du bas mise en avant, il lit les deux loupes
// comme un élève et tape ses lectures au pavé de chiffres, puis il appelle le professeur.
// Si la main montre le mauvais endroit, si une étape manque ou si une consigne tourne en rond, l'essai échoue.
// Il prend une capture à chaque nouvelle consigne : il faut les regarder.
// Avec « maladroit », il commence par deux gestes de travers : le guide doit rattraper la manipulation.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/archimede-guide.mts <dossier des captures> [graine] [largeur] [hauteur] [propre|maladroit]
import type { Locator, Page } from "@playwright/test";
import { BASE, attends, faisLeGeste, glisse, lisGuide, ouvre, pointEcran, type Point } from "./outils.mts";

const [sortie, graine = "1", largeur = "390", hauteur = "844", depart = "propre"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/archimede-guide.mts <dossier des captures> [graine] [largeur] [hauteur] [propre|maladroit]");
const e = await ouvre({ sortie, largeur: Number(largeur), hauteur: Number(hauteur), guide: true });
const page: Page = e.page;
const bilan: Record<string, unknown> = { graine: Number(graine), fenetre: `${largeur} x ${hauteur}` };

await page.goto(`${BASE}/app/tp/chantier/thermo?tp=archimede&graine=${graine}`);
await attends(500);
await e.photo("00-porte");
await page.getByRole("button", { name: "Ouvrir la paillasse" }).click();
await attends(900);
const scene: Locator = page.locator("svg.pl-scene");

/** Un geste de travers, à la souris : glisser d'un point du dessin à un autre. */
const deTravers = async (de: Point, vers: Point) => { await glisse(page, await pointEcran(scene, de), await pointEcran(scene, vers)); await attends(300); };
if (depart === "maladroit") {
  // un autre cylindre que celui du sujet au crochet, et l'éprouvette de liquide X sous le dynamomètre : le guide doit tout remettre en ordre
  const autre = (Number(graine) + 1) % 3;
  await deTravers({ x: [246, 290, 334][autre], y: 296 - [7, 8, 9][autre] * 5 }, { x: 100, y: 228 });
  await deTravers({ x: 250, y: 414 }, { x: 100, y: 408 });
  bilan.depart = await e.texte(".pl-message");
}

/**
 * Ce qu'un élève lit dans une loupe : la graduation en face du repère (l'index du dynamomètre, au centre de la loupe,
 * ou le bas du ménisque), à une demi-graduation près. `grain` : la demi-graduation.
 */
async function lisLaLoupe(nom: string, grain: number): Promise<number> {
  const lu = await page.evaluate((debut) => {
    const loupe = [...document.querySelectorAll(".pl-loupe")].find((l) => (l.getAttribute("aria-label") ?? "").startsWith(debut));
    if (!loupe) return null;
    const menisque = loupe.querySelector("path.pl-menisque")?.getAttribute("d")?.match(/-?\d+(\.\d+)?/g)?.map(Number);
    // le ménisque est une courbe : son bas est à mi-chemin entre ses bords et son point de contrôle ; sans liquide, le repère est au centre
    const repere = menisque ? (menisque[1] + menisque[3]) / 2 : Number(loupe.querySelector("circle.pl-loupe-bord")?.getAttribute("cy"));
    const grands = [...loupe.querySelectorAll(".pl-echelle line")].filter((l) => l.getAttribute("stroke-width") === "1.3").map((l) => Number(l.getAttribute("y1")));
    const chiffres = [...loupe.querySelectorAll("text.pl-loupe-chiffre")].map((t) => ({ v: Number((t.textContent ?? "").replace(",", ".")), y: Number(t.getAttribute("y")) }));
    // chaque chiffre est écrit en face d'un grand trait
    const reperes = chiffres.map((c) => ({ v: c.v, y: grands.reduce((m, y) => (Math.abs(y - c.y) < Math.abs(m - c.y) ? y : m), grands[0]) })).sort((a, b) => a.v - b.v);
    if (reperes.length < 2) return null;
    const [a, b] = [reperes[0], reperes[reperes.length - 1]];
    return a.v + ((repere - a.y) * (b.v - a.v)) / (b.y - a.y);
  }, nom);
  if (lu === null) throw new Error(`la loupe « ${nom} » ne montre pas de quoi lire`);
  return Math.round(lu / grain) * grain;
}
/** Tape une lecture au pavé de chiffres, et la note. */
async function note(valeur: string, photo: string): Promise<void> {
  for (const signe of valeur) await page.locator(".pl-pave").getByRole("button", { name: signe, exact: true }).click();
  await e.photo(photo);
  await page.getByRole("button", { name: "Noter", exact: true }).click();
  await attends(450);
}

const journal: { cle: string; texte: string; ms: number }[] = [];
const lectures: string[] = [];
let depuis = Date.now();
for (let tour = 0; tour < 3000; tour++) {
  const p = await lisGuide(page);
  if (!p) throw new Error("le guide ne dit plus rien");
  const rang = String(journal.length + 1).padStart(2, "0");
  if (journal[journal.length - 1]?.cle !== p.cle) {
    if (journal.length) journal[journal.length - 1].ms = Date.now() - depuis;
    depuis = Date.now();
    journal.push({ cle: p.cle, texte: p.texte, ms: 0 });
    // le temps que la vue se rapproche de la loupe, ou s'en éloigne
    await attends(p.cle.startsWith("lire") ? 500 : 180);
    await e.photo(`${rang}-${p.cle}`);
    continue;
  } else if (Date.now() - depuis > 60000) {
    await e.photo("panne");
    throw new Error(`le guide reste sur « ${p.cle} » : ${p.texte}`);
  }
  if (p.cle === "lire-poids") {
    const lu = await lisLaLoupe("Loupe sur le dynamomètre", 0.005);
    lectures.push(`${lu.toFixed(3)} N`);
    await note(lu.toFixed(3).replace(".", ","), `${String(journal.length).padStart(2, "0")}-lire-poids-saisie`);
    continue;
  }
  if (p.cle === "lire-volume") {
    const lu = await lisLaLoupe("Loupe sur l'éprouvette", 0.5);
    lectures.push(`${lu.toFixed(1)} mL`);
    await note(lu.toFixed(1).replace(".", ","), `${String(journal.length).padStart(2, "0")}-lire-volume-saisie`);
    continue;
  }
  if (await faisLeGeste(page, scene, p)) continue;
  if (p.touche) {
    const appel = p.cle === "fini";
    await page.locator(".pl-pied .pl-vise").first().click();
    await attends(350);
    if (appel) { await e.photo("98-confirmation"); bilan.confirmation = await e.texte(".pl-confirme span"); await page.getByRole("button", { name: "Oui, j'ai fini" }).click(); break; }
    continue;
  }
  await attends(60);
}

await page.waitForSelector("[data-score]", { timeout: 15000 });
await page.getByRole("button", { name: "Quitter la paillasse" }).click().catch(() => {});
await attends(400);
bilan.score = await page.locator("[data-score]").getAttribute("data-score");
bilan.verdict = await e.texte(".tp-correction");
bilan.mesures = await e.texte("[data-mesures]");
bilan.lectures = lectures.join(" · ");
bilan.consignes = journal.map((j) => `${j.cle} (${(j.ms / 1000).toFixed(1)} s)`).join(" · ");
bilan.duree = `${Math.round(journal.reduce((s, j) => s + j.ms, 0) / 1000)} s`;
bilan.largeur = await e.largeur();
bilan.erreurs = e.erreurs;
await e.photo("99-verdict", true);
console.log(JSON.stringify(bilan, null, 1));
await e.ferme();
