// Essai à la main du guide de la paillasse « doppler », dans un vrai navigateur, à la souris seulement, sur son banc de
// chantier (/app/tp/chantier/ondes?tp=doppler). Le robot ne sait rien du TP : il fait le geste que la main du guide
// montre (tourner une molette, glisser une fourche, toucher une commande, toucher l'écran de l'analyseur), et il attend
// quand le guide dit d'attendre. Il lit comme un élève : la règle à la loupe, le chronomètre, la fréquence du repère.
// Si la main montre le mauvais endroit, si une étape manque ou si une consigne tourne en rond, l'essai échoue.
// Il prend une capture à chaque nouvelle consigne : il faut les regarder.
// Avec « mal-parti », le robot commence par un geste de travers (le mobile lancé d'entrée : au mauvais cran, les
// fourches mal placées, sans enregistrement) : le guide doit le faire rattraper.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/doppler-guide.mts <dossier des captures> [graine] [largeur] [hauteur] [propre|mal-parti]
import type { Locator, Page } from "@playwright/test";
import { BASE, attends, faisLeGeste, lisGuide, ouvre } from "./outils.mts";

const [sortie, graine = "1", largeur = "390", hauteur = "844", depart = "propre"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/doppler-guide.mts <dossier des captures> [graine] [largeur] [hauteur] [propre|mal-parti]");
const e = await ouvre({ sortie, largeur: Number(largeur), hauteur: Number(hauteur), guide: true });
const page: Page = e.page;
const bilan: Record<string, unknown> = { tp: "doppler", graine: Number(graine), fenetre: `${largeur} x ${hauteur}`, depart };

await page.goto(`${BASE}/app/tp/chantier/ondes?tp=doppler&graine=${graine}`);
await attends(500);
await e.photo("00-porte");
await page.getByRole("button", { name: "Ouvrir la paillasse" }).click();
await attends(900);
const scene: Locator = page.locator("svg.pl-scene");
const virgule = (x: number, decimales: number) => x.toFixed(decimales).replace(".", ",");
const nombreLu = (texte: string | null | undefined) => Number((texte ?? "").replace(/[^\d,]/g, "").replace(",", "."));

/** Ce qu'un élève lit dans la loupe : la graduation en face du repère de la fourche, au demi-centimètre près. */
const lisLaLoupe = (): Promise<number> => scene.evaluate((svg) => {
  const repere = Number(svg.querySelector(".pl-loupe line.pl-repere")?.getAttribute("x1"));
  const chiffres = [...svg.querySelectorAll(".pl-loupe text.pl-loupe-chiffre")].map((t) => ({ cm: Number(t.textContent), x: Number(t.getAttribute("x")) })).sort((a, b) => a.x - b.x);
  if (chiffres.length < 2) throw new Error("la loupe ne montre pas deux graduations chiffrées");
  // deux graduations chiffrées donnent l'échelle de la loupe
  const parCm = (chiffres[1].x - chiffres[0].x) / (chiffres[1].cm - chiffres[0].cm);
  return Math.round((chiffres[0].cm + (repere - chiffres[0].x) / parCm) * 2) / 2;
});

/** Écrit un nombre au pavé de chiffres, puis le note. */
async function ecris(texte: string, photo: string): Promise<void> {
  for (const signe of texte) await page.locator(".pl-pave").getByRole("button", { name: signe, exact: true }).click();
  await e.photo(photo);
  await page.getByRole("button", { name: "Noter", exact: true }).click();
  await attends(450);
}

if (depart === "mal-parti") {
  // le mobile lancé d'entrée : au cran le plus bas, les fourches près du départ, sans enregistrement
  await scene.getByRole("button", { name: "Lancer le mobile" }).click();
  await attends(300);
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
  if (p.cle === "x1-ecrire" || p.cle === "x2-ecrire") {
    await attends(450);
    const lue = virgule(await lisLaLoupe(), 1);
    bilan[p.cle.split("-")[0]] = lue;
    await ecris(lue, `${numero()}-${p.cle.split("-")[0]}-saisie`);
    continue;
  }
  if (p.cle === "duree-ecrire") {
    await attends(450);
    const lue = virgule(nombreLu(await scene.locator('[aria-label^="Chronomètre"] .pl-afficheur-valeur').textContent()), 3);
    bilan.duree = lue;
    await ecris(lue, `${numero()}-duree-saisie`);
    continue;
  }
  if (p.cle === "approche-ecrire" || p.cle === "eloignement-ecrire") {
    await attends(450);
    const lue = virgule(nombreLu(await scene.locator(".pl-doppler-lecture").textContent()), 2);
    bilan[p.cle.split("-")[0]] = lue;
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
  // le guide dit d'attendre : le mobile roule
  await attends(60);
}

await page.waitForSelector("[data-score]", { timeout: 15000 });
await page.getByRole("button", { name: "Quitter la paillasse" }).click().catch(() => {});
await attends(400);
bilan.score = await page.locator("[data-score]").getAttribute("data-score");
bilan.verdict = await e.texte(".tp-correction");
bilan.mesures = await e.texte("[data-mesures]");
bilan.consignes = journal.map((j) => `${j.cle} (${(j.ms / 1000).toFixed(1)} s)`).join(" · ");
bilan.duree_totale = `${Math.round(journal.reduce((s, j) => s + j.ms, 0) / 1000)} s`;
bilan.largeur = await e.largeur();
bilan.erreurs = e.erreurs;
await e.photo("99-verdict", true);
console.log(JSON.stringify(bilan, null, 1));
await e.ferme();
