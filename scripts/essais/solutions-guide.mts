// Essai à la main du guide de la paillasse Solutions, dans un vrai navigateur, à la souris seulement. Le robot ne sait
// rien de la dilution : il fait le geste que la main du guide montre, il garde l'appui tant que la consigne ne change
// pas, il touche la touche du bas que le guide met en avant, puis il appelle le professeur.
// Si la main montre le mauvais endroit, si une étape manque ou si une consigne tourne en rond, l'essai échoue.
// Il prend une capture à chaque nouvelle consigne : il faut les regarder.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/solutions-guide.mts <dossier des captures> [graine] [largeur] [hauteur]
// La session doit être déjà ouverte (scripts/essais/session.mts) : cet essai ne demande jamais de code de connexion.
import { existsSync } from "node:fs";
import { chromium, type Locator, type Page } from "@playwright/test";
import { BASE, attends, faisLeGeste, lisGuide, ouvre } from "./outils.mts";

const [sortie, graine = "1", largeur = "390", hauteur = "844"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/solutions-guide.mts <dossier des captures> [graine] [largeur] [hauteur]");

/** Vérifie que la session gardée ouvre encore l'application ; sinon l'essai s'arrête, sans demander de code. */
async function sessionPrete(fichier: string | undefined): Promise<void> {
  if (!fichier || !existsSync(fichier)) throw new Error("ESSAI_SESSION doit désigner le fichier d'une session déjà ouverte.");
  const nav = await chromium.launch();
  try {
    const ctx = await nav.newContext({ storageState: fichier });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/app`);
    if (!new URL(page.url()).pathname.startsWith("/app")) throw new Error("La session est perdue : l'essai s'arrête sans demander de code.");
    await ctx.storageState({ path: fichier });
  } finally { await nav.close(); }
}
await sessionPrete(process.env.ESSAI_SESSION);

const e = await ouvre({ sortie, largeur: Number(largeur), hauteur: Number(hauteur), guide: true });
const page: Page = e.page;
const bilan: Record<string, unknown> = { tp: "dilution", graine: Number(graine), fenetre: `${largeur} x ${hauteur}` };
const journal: { cle: string; texte: string; ms: number }[] = [];

try {
  await page.goto(`${BASE}/app/tp/chantier/chimie?tp=dilution&graine=${graine}`);
  await attends(500);
  await e.photo("00-porte");
  await page.getByRole("button", { name: "Ouvrir la paillasse" }).click();
  await attends(900);
  const scene: Locator = page.locator("svg.pl-scene");

  const vues = new Set<string>();
  let depuis = Date.now();
  let rang = 0;
  for (let tour = 0; tour < 4000; tour++) {
    const p = await lisGuide(page);
    if (!p) throw new Error("le guide ne dit plus rien");
    if (journal[journal.length - 1]?.cle !== p.cle) {
      if (journal.length) journal[journal.length - 1].ms = Date.now() - depuis;
      depuis = Date.now();
      journal.push({ cle: p.cle, texte: p.texte, ms: 0 });
      if (!vues.has(p.cle)) { vues.add(p.cle); rang++; await attends(140); await e.photo(`${String(rang).padStart(2, "0")}-${p.cle}`); }
    } else if (Date.now() - depuis > 90000) {
      throw new Error(`le guide reste sur « ${p.cle} » : ${p.texte}`);
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
  bilan.mesures = await page.locator("[data-mesures]").textContent();
  bilan.largeur = await e.largeur();
  await e.photo("99-verdict", true);
} catch (erreur) {
  bilan.panne = String(erreur).slice(0, 400);
  await e.photo("97-panne").catch(() => {});
} finally {
  bilan.consignes = journal.map((j) => `${j.cle} (${(j.ms / 1000).toFixed(1)} s)`).join(" · ");
  bilan.duree = `${Math.round(journal.reduce((s, j) => s + j.ms, 0) / 1000)} s`;
  // ce que le guide a fait reprendre en route, s'il y a lieu : une manipulation suivie à la lettre n'en a pas
  bilan.reprises = journal.filter((j) => j.cle === "refaire" || j.cle === "retour" || /replonger|ajuster|deboucher|changer/.test(j.cle)).map((j) => `${j.cle} : ${j.texte}`);
  bilan.erreurs = e.erreurs;
  console.log(JSON.stringify(bilan, null, 1));
  await e.ferme();
}
