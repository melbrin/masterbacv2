// Essai à la main du guide de la paillasse Pile, dans un vrai navigateur, à la souris seulement, sur son banc de chantier
// (/app/tp/chantier/thermo). Le robot ne sait rien des piles : il fait le geste que la main du guide montre (glisser une
// lame ou le pont salin, tourner le sélecteur, tirer un fil d'une borne à une lame, toucher un fil puis sa croix pour le
// retirer), il touche la touche du bas mise en avant, il lit l'afficheur du multimètre comme un élève, tape la tension
// au pavé de chiffres, puis applique la règle du signe que le guide lui rappelle pour dire la borne positive.
// Si la main montre le mauvais endroit, si une étape manque ou si une consigne tourne en rond, l'essai échoue.
// Il prend une capture à chaque nouvelle consigne : il faut les regarder.
// Avec « maladroit », il commence par deux gestes de travers : le guide doit rattraper la manipulation.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/pile-guide.mts <dossier des captures> [graine] [largeur] [hauteur] [propre|maladroit]
import type { Locator, Page } from "@playwright/test";
import { BASE, attends, faisLeGeste, glisse, lisGuide, ouvre, pointEcran, type Point } from "./outils.mts";

const [sortie, graine = "1", largeur = "390", hauteur = "844", depart = "propre"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/pile-guide.mts <dossier des captures> [graine] [largeur] [hauteur] [propre|maladroit]");
const e = await ouvre({ sortie, largeur: Number(largeur), hauteur: Number(hauteur), guide: true });
const page: Page = e.page;
const bilan: Record<string, unknown> = { graine: Number(graine), fenetre: `${largeur} x ${hauteur}` };

await page.goto(`${BASE}/app/tp/chantier/thermo?tp=pile&graine=${graine}`);
await attends(500);
await e.photo("00-porte");
await page.getByRole("button", { name: "Ouvrir la paillasse" }).click();
await attends(900);
const scene: Locator = page.locator("svg.pl-scene");

/** Un geste de travers, à la souris : glisser d'un point du dessin à un autre. */
const deTravers = async (de: Point, vers: Point) => { await glisse(page, await pointEcran(scene, de), await pointEcran(scene, vers)); await attends(300); };
if (depart === "maladroit") {
  // la lame de zinc dans le sulfate de cuivre, et un fil de la borne mA à la borne COM : le guide doit faire retirer le fil, puis reposer la lame
  await deTravers({ x: 62, y: 482 }, { x: 180, y: 384 });
  await deTravers({ x: 160, y: 138 }, { x: 48, y: 138 });
  bilan.depart = await e.texte(".pl-message");
}

/** Ce que l'afficheur du multimètre montre, avec son signe : « −0,458 ». */
const lisAfficheur = async () => ((await scene.getByRole("img", { name: /^Multimètre/ }).getAttribute("aria-label")) ?? "").replace(/^Multimètre : /, "").replace(/\s*m?V$/, "");
/** Le métal de la lame qu'un fil relie à une borne du multimètre, lu sur la paillasse : « cuivre ». */
async function lameSur(borne: "V" | "COM"): Promise<string> {
  const fils = await scene.locator('[aria-label^="Fil entre"]').evaluateAll((els) => els.map((el) => el.getAttribute("aria-label") ?? ""));
  const fil = fils.find((f) => f.includes(`la borne ${borne} du multimètre`));
  const lame = fil?.replace("Fil entre ", "").split(" et ").find((bout) => bout.startsWith("la lame"));
  if (!lame) throw new Error(`aucune lame n'est reliée à la borne ${borne}`);
  return lame.replace(/^la lame d(e |')/, "");
}

const journal: { cle: string; texte: string; ms: number }[] = [];
const lectures: string[] = [];
let depuis = Date.now();
for (let tour = 0; tour < 3000; tour++) {
  const p = await lisGuide(page);
  if (!p) throw new Error("le guide ne dit plus rien");
  if (journal[journal.length - 1]?.cle !== p.cle) {
    if (journal.length) journal[journal.length - 1].ms = Date.now() - depuis;
    depuis = Date.now();
    journal.push({ cle: p.cle, texte: p.texte, ms: 0 });
    // le temps que la vue se rapproche de l'afficheur, ou s'en éloigne
    await attends(p.cle === "lire-tension" || p.cle === "borne" ? 500 : 180);
    await e.photo(`${String(journal.length).padStart(2, "0")}-${p.cle}`);
    continue;
  } else if (Date.now() - depuis > 60000) {
    await e.photo("panne");
    throw new Error(`le guide reste sur « ${p.cle} » : ${p.texte}`);
  }
  const rang = String(journal.length).padStart(2, "0");
  if (p.cle === "lire-tension") {
    // la tension s'écrit sans son signe
    const lu = (await lisAfficheur()).replace(/^[−-]/, "");
    for (const signe of lu) await page.locator(".pl-pave").getByRole("button", { name: signe, exact: true }).click();
    await e.photo(`${rang}-lire-tension-saisie`);
    await page.getByRole("button", { name: "Noter", exact: true }).click();
    await attends(450);
    continue;
  }
  if (p.cle === "borne") {
    // la règle du signe : sans signe moins, la borne positive est la lame de la borne V ; sinon, celle de la borne COM
    const affiche = await lisAfficheur();
    const metal = await lameSur(/^[−-]/.test(affiche) ? "COM" : "V");
    lectures.push(`${affiche} V, borne positive : ${metal}`);
    await page.locator(".pl-pied").getByRole("button", { name: metal.replace(/^./, (c) => c.toUpperCase()), exact: true }).click();
    await attends(450);
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
