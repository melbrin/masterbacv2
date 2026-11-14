// Essai à la main du guide de la paillasse Calorimètre, dans un vrai navigateur, à la souris seulement, sur son banc de
// chantier (/app/tp/chantier/thermo). Le robot ne sait rien de la calorimétrie : il fait le geste que la main du guide
// montre (glisser un objet, garder le doigt sur un poussoir tant que la consigne ne change pas, toucher « Tare »), il
// attend quand le guide lui dit de regarder, il touche la touche du bas mise en avant, il lit l'écran de la balance et la
// loupe du thermomètre comme un élève et tape ses lectures au pavé de chiffres, puis il appelle le professeur.
// Si la main montre le mauvais endroit, si une étape manque ou si une consigne tourne en rond, l'essai échoue.
// Il prend une capture à chaque nouvelle consigne : il faut les regarder.
// Avec « maladroit », il commence par deux gestes de travers : le guide doit rattraper la manipulation.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/calorimetre-guide.mts <dossier des captures> [graine] [largeur] [hauteur] [propre|maladroit]
import type { Locator, Page } from "@playwright/test";
import { BASE, attends, faisLeGeste, glisse, lisGuide, ouvre, pointEcran, type Point } from "./outils.mts";

const [sortie, graine = "1", largeur = "390", hauteur = "844", depart = "propre"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/calorimetre-guide.mts <dossier des captures> [graine] [largeur] [hauteur] [propre|maladroit]");
const e = await ouvre({ sortie, largeur: Number(largeur), hauteur: Number(hauteur), guide: true });
const page: Page = e.page;
const bilan: Record<string, unknown> = { graine: Number(graine), fenetre: `${largeur} x ${hauteur}` };

await page.goto(`${BASE}/app/tp/chantier/thermo?tp=calorimetrie&graine=${graine}`);
await attends(500);
await e.photo("00-porte");
await page.getByRole("button", { name: "Ouvrir la paillasse" }).click();
await attends(900);
const scene: Locator = page.locator("svg.pl-scene");

/** Un geste de travers, à la souris : glisser d'un point du dessin à un autre. */
const deTravers = async (de: Point, vers: Point) => { await glisse(page, await pointEcran(scene, de), await pointEcran(scene, vers)); await attends(300); };
if (depart === "maladroit") {
  // le thermomètre plongé et le couvercle posé avant la pesée : le guide doit faire ouvrir, retirer, puis peser
  await deTravers({ x: 236, y: 225 }, { x: 172, y: 386 });
  await deTravers({ x: 152, y: 294 }, { x: 190, y: 399 });
  bilan.depart = await e.texte(".pl-message");
}

/** Ce que la balance affiche, lu sur son écran. */
const lisBalance = async () => ((await scene.getByRole("img", { name: /^Balance/ }).getAttribute("aria-label")) ?? "").replace(/^Balance : /, "").replace(/\s*g$/, "");
/** Ce qu'un élève lit dans la loupe du thermomètre : la graduation en face du haut de la colonne, au centre de la loupe, à une demi-graduation près. */
async function lisLeThermometre(): Promise<number> {
  const lu = await page.evaluate(() => {
    const loupe = [...document.querySelectorAll(".pl-loupe")].find((l) => (l.getAttribute("aria-label") ?? "").startsWith("Loupe sur le thermomètre"));
    if (!loupe) return null;
    const repere = Number(loupe.querySelector("circle.pl-loupe-bord")?.getAttribute("cy"));
    const grands = [...loupe.querySelectorAll(".pl-echelle line")].filter((l) => l.getAttribute("stroke-width") === "1.3").map((l) => Number(l.getAttribute("y1")));
    const chiffres = [...loupe.querySelectorAll("text.pl-loupe-chiffre")].map((t) => ({ v: Number((t.textContent ?? "").replace(",", ".")), y: Number(t.getAttribute("y")) }));
    // chaque chiffre est écrit en face d'un grand trait
    const reperes = chiffres.map((c) => ({ v: c.v, y: grands.reduce((m, y) => (Math.abs(y - c.y) < Math.abs(m - c.y) ? y : m), grands[0]) })).sort((a, b) => a.v - b.v);
    if (reperes.length < 2) return null;
    const [a, b] = [reperes[0], reperes[reperes.length - 1]];
    return a.v + ((repere - a.y) * (b.v - a.v)) / (b.y - a.y);
  });
  if (lu === null) throw new Error("la loupe du thermomètre ne montre pas de quoi lire");
  return Math.round(lu * 20) / 20;
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
for (let tour = 0; tour < 4000; tour++) {
  const p = await lisGuide(page);
  if (!p) throw new Error("le guide ne dit plus rien");
  if (journal[journal.length - 1]?.cle !== p.cle) {
    if (journal.length) journal[journal.length - 1].ms = Date.now() - depuis;
    depuis = Date.now();
    journal.push({ cle: p.cle, texte: p.texte, ms: 0 });
    // le temps que la vue se rapproche de l'appareil à lire ; ailleurs, la capture se prend tout de suite : le temps passe
    await attends(p.cle.startsWith("lire") ? 500 : 120);
    await e.photo(`${String(journal.length).padStart(2, "0")}-${p.cle}`);
    continue;
  } else if (Date.now() - depuis > 60000) {
    await e.photo("panne");
    throw new Error(`le guide reste sur « ${p.cle} » : ${p.texte}`);
  }
  const rang = String(journal.length).padStart(2, "0");
  if (p.cle === "lire-masse") {
    const lu = await lisBalance();
    lectures.push(`${lu} g`);
    await note(lu, `${rang}-lire-masse-saisie`);
    continue;
  }
  if (p.cle === "lire-temperature") {
    const lu = await lisLeThermometre();
    lectures.push(`${lu.toFixed(2)} °C`);
    await note(lu.toFixed(2).replace(".", ","), `${rang}-lire-temperature-saisie`);
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
  // le guide fait regarder un appareil : le robot attend que la consigne change
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
