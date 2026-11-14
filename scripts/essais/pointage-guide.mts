// Essai à la main du guide de la paillasse « pointage », dans un vrai navigateur, à la souris seulement, sur son banc
// de chantier (/app/tp/chantier/ondes?tp=chute). Le robot ne sait rien du TP : il fait le geste que la main du guide
// montre (glisser un repère, toucher la balle, régler un bout de la droite, toucher une touche). Il lit comme un élève :
// la longueur de l'étalon dans le protocole, l'énergie mécanique affichée au repère.
// Si la main montre le mauvais endroit, si une étape manque ou si une consigne tourne en rond, l'essai échoue.
// Il prend une capture à chaque nouvelle consigne : il faut les regarder.
// Avec « mal-parti », le robot commence par des gestes de travers (trois images pointées loin de la balle, avant tout
// étalonnage) : le guide doit les faire rattraper.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/pointage-guide.mts <dossier des captures> [graine] [largeur] [hauteur] [propre|mal-parti]
import type { Locator, Page } from "@playwright/test";
import { BASE, attends, faisLeGeste, lisGuide, ouvre, pointEcran } from "./outils.mts";

const [sortie, graine = "1", largeur = "390", hauteur = "844", depart = "propre"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/pointage-guide.mts <dossier des captures> [graine] [largeur] [hauteur] [propre|mal-parti]");
const e = await ouvre({ sortie, largeur: Number(largeur), hauteur: Number(hauteur), guide: true });
const page: Page = e.page;
const bilan: Record<string, unknown> = { tp: "chute", graine: Number(graine), fenetre: `${largeur} x ${hauteur}`, depart };

await page.goto(`${BASE}/app/tp/chantier/ondes?tp=chute&graine=${graine}`);
await attends(500);
await e.photo("00-porte");
await page.getByRole("button", { name: "Ouvrir la paillasse" }).click();
await attends(900);
const scene: Locator = page.locator("svg.pl-scene");

/** Écrit un nombre au pavé de chiffres, puis le note. */
async function ecris(texte: string, photo: string): Promise<void> {
  for (const signe of texte) await page.locator(".pl-pave").getByRole("button", { name: signe, exact: true }).click();
  await e.photo(photo);
  await page.getByRole("button", { name: "Noter", exact: true }).click();
  await attends(450);
}

if (depart === "mal-parti") {
  // l'outil Pointage pris d'entrée, et trois images pointées dans un coin de l'image, loin de la balle
  await scene.getByRole("button", { name: "Outil Pointage" }).click();
  for (let i = 0; i < 3; i++) {
    const coin = await pointEcran(scene, { x: 320, y: 420 });
    await page.mouse.click(coin.x, coin.y);
    await attends(250);
  }
  bilan.malParti = await e.texte(".pl-message");
}

const vues = new Set<string>();
const journal: { cle: string; texte: string; ms: number }[] = [];
let depuis = Date.now();
let rang = 0;
const numero = () => String(rang).padStart(2, "0");
for (let tour = 0; tour < 4000; tour++) {
  const p = await lisGuide(page);
  if (!p) throw new Error("le guide ne dit plus rien");
  if (journal[journal.length - 1]?.cle !== p.cle) {
    if (journal.length) journal[journal.length - 1].ms = Date.now() - depuis;
    depuis = Date.now();
    journal.push({ cle: p.cle, texte: p.texte, ms: 0 });
    if (!vues.has(p.cle)) { vues.add(p.cle); rang++; await attends(180); await e.photo(`${numero()}-${p.cle}`); }
  } else if (Date.now() - depuis > 60000) {
    await e.photo("panne");
    throw new Error(`le guide reste sur « ${p.cle} » : ${p.texte}`);
  }
  if (p.cle === "longueur-ecrire") {
    // la longueur de l'étalon est donnée à la première ligne du protocole
    const ligne = (await page.locator(".pl-cote ol li").first().textContent()) ?? "";
    const longueur = ligne.match(/\(([\d,]+)\sm\)/)?.[1];
    if (!longueur) throw new Error(`le protocole ne donne pas la longueur de l'étalon : « ${ligne} »`);
    bilan.etalon = longueur;
    await ecris(longueur, `${numero()}-longueur-saisie`);
    continue;
  }
  if (p.cle === "debut-ecrire" || p.cle === "fin-ecrire") {
    await attends(450);
    // l'énergie mécanique affichée au repère, sur la dernière ligne
    const affichee = (await scene.locator('[aria-label^="énergie mécanique au repère"]').getAttribute("aria-label")) ?? "";
    const lue = affichee.match(/: ([\d\s,]+) millijoules/)?.[1].replace(/\s/g, "");
    if (!lue) throw new Error(`l'énergie mécanique au repère ne se lit pas : « ${affichee} »`);
    bilan[p.cle === "debut-ecrire" ? "debut" : "fin"] = lue;
    await ecris(lue, `${numero()}-${p.cle.split("-")[0]}-saisie`);
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
bilan.consignes = journal.map((j) => `${j.cle} (${(j.ms / 1000).toFixed(1)} s)`).join(" · ");
bilan.duree = `${Math.round(journal.reduce((s, j) => s + j.ms, 0) / 1000)} s`;
bilan.largeur = await e.largeur();
bilan.erreurs = e.erreurs;
await e.photo("99-verdict", true);
console.log(JSON.stringify(bilan, null, 1));
await e.ferme();
