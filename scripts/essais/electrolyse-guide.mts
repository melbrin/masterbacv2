// Essai à la main du guide de la paillasse Électrolyse, dans un vrai navigateur, à la souris seulement, sur son banc de
// chantier (/app/tp/chantier/thermo). Le robot ne sait rien de l'électrolyse : il fait le geste que la main du guide
// montre (glisser une plaque, tirer un fil, toucher l'interrupteur ou une touche du chronomètre, tourner la molette du
// générateur, garder le doigt sur « Avance rapide » tant que la consigne ne change pas, toucher un fil puis sa croix),
// il touche la touche du bas mise en avant, il lit la balance, l'ampèremètre et le chronomètre sur leurs écrans comme un
// élève et tape ses lectures au pavé de chiffres, puis il appelle le professeur.
// Si la main montre le mauvais endroit, si une étape manque ou si une consigne tourne en rond, l'essai échoue.
// Il prend une capture à chaque nouvelle consigne : il faut les regarder.
// Avec « maladroit », il commence par trois gestes de travers : le guide doit rattraper la manipulation.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/electrolyse-guide.mts <dossier des captures> [graine] [largeur] [hauteur] [propre|maladroit]
import type { Locator, Page } from "@playwright/test";
import { BASE, attends, attendsLeGuide, faisLeGeste, glisse, lisGuide, ouvre, pointEcran, type Point } from "./outils.mts";

const [sortie, graine = "1", largeur = "390", hauteur = "844", depart = "propre"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/electrolyse-guide.mts <dossier des captures> [graine] [largeur] [hauteur] [propre|maladroit]");
const e = await ouvre({ sortie, largeur: Number(largeur), hauteur: Number(hauteur), guide: true });
const page: Page = e.page;
const bilan: Record<string, unknown> = { graine: Number(graine), fenetre: `${largeur} x ${hauteur}` };

await page.goto(`${BASE}/app/tp/chantier/thermo?tp=electrolyse&graine=${graine}`);
await attends(500);
await e.photo("00-porte");
await page.getByRole("button", { name: "Ouvrir la paillasse" }).click();
await attends(900);
const scene: Locator = page.locator("svg.pl-scene");

/** Un geste de travers, à la souris : glisser d'un point du dessin à un autre. */
const deTravers = async (de: Point, vers: Point) => { await glisse(page, await pointEcran(scene, de), await pointEcran(scene, vers)); await attends(300); };
if (depart === "maladroit") {
  // les deux plaques plongées avant la pesée, et la plaque 1 reliée à la borne + : le guide doit faire ôter le fil, sortir, rincer, sécher, peser
  await deTravers({ x: 34, y: 222 }, { x: 154, y: 240 });
  await deTravers({ x: 78, y: 222 }, { x: 206, y: 240 });
  await deTravers({ x: 98, y: 54 }, { x: 154, y: 185 });
  bilan.depart = await e.texte(".pl-message");
}

/** Ce que l'écran d'un appareil montre, tel qu'il s'écrit au pavé de chiffres : sans unité, sans signe, sans espace. */
const lisEcran = async (appareil: string) => ((await scene.getByRole("img", { name: new RegExp(`^${appareil}`) }).getAttribute("aria-label")) ?? "").replace(/^[^:]*: /, "").replace(/[^\d,]/g, "");
/** Tape une lecture au pavé de chiffres, et la note. */
async function note(valeur: string, photo: string): Promise<void> {
  for (const signe of valeur) await page.locator(".pl-pave").getByRole("button", { name: signe, exact: true }).click();
  await e.photo(photo);
  await page.getByRole("button", { name: "Noter", exact: true }).click();
  await attends(450);
}
const APPAREILS: Record<string, [string, string]> = { "lire-masse": ["Balance", "g"], "lire-intensite": ["Ampèremètre", "A"], "lire-duree": ["Chronomètre", "s"] };

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
  } else if (Date.now() - depuis > 90000) {
    await e.photo("panne");
    throw new Error(`le guide reste sur « ${p.cle} » : ${p.texte}`);
  }
  const rang = String(journal.length).padStart(2, "0");
  const appareil = APPAREILS[p.cle];
  if (appareil) {
    const lu = await lisEcran(appareil[0]);
    lectures.push(`${lu} ${appareil[1]}`);
    await note(lu, `${rang}-${p.cle}-saisie`);
    continue;
  }
  if (p.cle === "avancer" && p.geste === "maintenir") {
    // le doigt reste sur « Avance rapide » tant que la consigne ne change pas ; une capture en route : le dépôt grandit
    const doigt = await pointEcran(scene, { x: p.x, y: p.y });
    await page.mouse.move(doigt.x, doigt.y);
    await page.mouse.down();
    await attends(2500);
    await e.photo(`${rang}-avancer-le-depot-grandit`);
    await attendsLeGuide(page, p.cle, 60000);
    await page.mouse.up();
    bilan.chronometre = `${await lisEcran("Chronomètre")} s au moment de lâcher`;
    await attends(120);
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
