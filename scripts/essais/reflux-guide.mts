// Essai à la main du guide de la paillasse « reflux », dans un vrai navigateur, à la souris seulement. Le robot ne sait
// rien de la synthèse : il fait le geste que la main du guide montre, d'un poste à l'autre, il garde l'appui tant que
// la consigne ne change pas, il lit la balance comme un élève, puis il appelle le professeur. Si la main montre le
// mauvais endroit, si une étape manque ou si une consigne tourne en rond, l'essai échoue.
// Il prend une capture à chaque nouvelle consigne : il faut les regarder.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/reflux-guide.mts <dossier des captures> [graine] [largeur] [hauteur]
import type { Locator, Page } from "@playwright/test";
import { BASE, attends, faisLeGeste, lisGuide, ouvre } from "./outils.mts";

const [sortie, graine = "1", largeur = "390", hauteur = "844"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/reflux-guide.mts <dossier des captures> [graine] [largeur] [hauteur]");
const e = await ouvre({ sortie, largeur: Number(largeur), hauteur: Number(hauteur), guide: true });
const page: Page = e.page;
const bilan: Record<string, unknown> = { graine: Number(graine), fenetre: `${largeur} x ${hauteur}` };
const photo = (nom: string) => e.photo(`guide-${largeur}-${nom}`);

await page.goto(`${BASE}/app/tp/chantier/synthese?tp=synthese&graine=${graine}`);
const banc = page.locator("section[data-banc]").filter({ hasText: ": reflux" });
await attends(500);
await banc.getByRole("button", { name: "Ouvrir la paillasse" }).click();
await attends(900);
const scene: Locator = page.locator("svg.pl-scene");
/** Ce qu'un élève lit sur la balance : les chiffres de son afficheur. */
const lisLaBalance = async () => Number(((await scene.locator('[aria-label^="Balance"]').getAttribute("aria-label")) ?? "").replace("−", "-").match(/(-?[\d,]+) g/)?.[1].replace(",", "."));

const vues = new Set<string>();
const journal: { cle: string; ms: number }[] = [];
let depuis = Date.now();
let rang = 0;
for (let tour = 0; tour < 6000; tour++) {
  const p = await lisGuide(page);
  if (!p) throw new Error("le guide ne dit plus rien");
  if (journal[journal.length - 1]?.cle !== p.cle) {
    if (journal.length) journal[journal.length - 1].ms = Date.now() - depuis;
    depuis = Date.now();
    journal.push({ cle: p.cle, ms: 0 });
    // une consigne nouvelle : le temps de la lire, et que le poste finisse d'arriver
    await attends(p.cle.startsWith("aller-") || journal[journal.length - 2]?.cle.startsWith("aller-") ? 420 : 160);
    if (!vues.has(p.cle)) { vues.add(p.cle); rang++; await photo(`${String(rang).padStart(2, "0")}-${p.cle}`); }
    continue;
  } else if (Date.now() - depuis > 90000) {
    await photo("panne");
    throw new Error(`le guide reste sur « ${p.cle} » : ${p.texte}`);
  }
  if (p.cle === "lire-masse") {
    const lu = await lisLaBalance();
    bilan.balance = lu;
    for (const signe of lu.toFixed(2).replace(".", ",")) await page.locator(".pl-pave").getByRole("button", { name: signe, exact: true }).click();
    await photo(`${String(rang).padStart(2, "0")}-lire-masse-saisie`);
    await page.getByRole("button", { name: "Noter", exact: true }).click();
    await attends(450);
    continue;
  }
  if (await faisLeGeste(page, scene, p)) continue;
  if (p.touche) {
    const appel = p.cle === "fini";
    await page.locator(".pl-pied .pl-vise").first().click();
    await attends(450);
    if (appel) { await photo("98-confirmation"); bilan.confirmation = await e.texte(".pl-confirme span"); await page.getByRole("button", { name: "Oui, j'ai fini" }).click(); break; }
    continue;
  }
  await attends(60);
}

await banc.locator("[data-score]").waitFor({ state: "attached", timeout: 15000 });
await page.getByRole("button", { name: "Quitter la paillasse" }).click().catch(() => {});
await attends(400);
bilan.score = await banc.locator("[data-score]").getAttribute("data-score");
bilan.verdict = (await banc.locator(".tp-correction").innerText()).replace(/\s+/g, " ").trim();
bilan.mesures = await banc.locator("[data-mesures]").textContent();
bilan.consignes = journal.map((j) => `${j.cle} (${(j.ms / 1000).toFixed(1)} s)`).join(" · ");
bilan.duree = `${Math.round(journal.reduce((s, j) => s + j.ms, 0) / 1000)} s`;
bilan.largeur = await e.largeur();
bilan.erreurs = e.erreurs;
await photo("99-verdict");
console.log(JSON.stringify(bilan, null, 1));
await e.ferme();
