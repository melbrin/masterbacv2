// Essai à la main du guide de la paillasse Spectro, dans un vrai navigateur, à la souris seulement. Le robot ne sait
// rien du dosage ni du suivi : il fait le geste que la main du guide montre, il touche la touche du bas que le guide met
// en avant, puis il appelle le professeur. Ce que le guide ne dit pas, il le lit comme un élève : l'absorbance sur
// l'afficheur (il la tape sur le pavé de chiffres), les points du graphique (il pose la règle au plus près d'eux, le
// trait de la valeur finale sur le palier, et les repères là où les traits se coupent).
// Si la main montre le mauvais endroit, si une étape manque ou si une consigne tourne en rond, l'essai échoue.
// Il prend une capture à chaque nouvelle consigne : il faut les regarder.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/spectro-guide.mts <dossier des captures> [etalonnage|cinetique] [graine] [largeur] [hauteur]
// La session doit être déjà ouverte (scripts/essais/session.mts) : cet essai ne demande jamais de code de connexion.
import { existsSync } from "node:fs";
import { chromium, type Locator, type Page } from "@playwright/test";
import { BASE, attends, centre, faisLeGeste, glisse, lisGuide, ouvre, pointEcran } from "./outils.mts";

const [sortie, tp = "etalonnage", graine = "1", largeur = "390", hauteur = "844"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/spectro-guide.mts <dossier des captures> [etalonnage|cinetique] [graine] [largeur] [hauteur]");

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
const bilan: Record<string, unknown> = { tp, graine: Number(graine), fenetre: `${largeur} x ${hauteur}` };
const journal: { cle: string; texte: string; ms: number }[] = [];
const lectures: Record<string, unknown> = {};

try {
  await page.goto(`${BASE}/app/tp/chantier/chimie?tp=${tp}&graine=${graine}`);
  await attends(500);
  await e.photo("000-porte");
  await page.getByRole("button", { name: "Ouvrir la paillasse" }).click();
  await attends(900);
  const scene: Locator = page.locator("svg.pl-scene");
  const pied = (nom: string) => page.locator(".pl-pied").getByRole("button", { name: nom, exact: true });

  // ----- ce que l'élève lit : l'afficheur, puis les points de son graphique (components/tp/paillasses/spectroGraphe.tsx) -----
  const nombreLu = (texte: string | null) => Number((texte ?? "").match(/[-−]?\d+(,\d+)?/)?.[0].replace("−", "-").replace(",", "."));
  const afficheur = async () => nombreLu((await scene.getByRole("img", { name: /^Absorbance/ }).getAttribute("aria-label"))?.split(":")[1] ?? null);
  /** Tape un nombre sur le pavé de chiffres, puis le note. */
  const tape = async (valeur: number) => {
    const pave = page.locator(".pl-pave");
    for (const c of Math.abs(valeur).toFixed(3).replace(".", ",")) await pave.getByRole("button", { name: c, exact: true }).click();
    if (valeur < 0) await pave.getByRole("button", { name: "Changer le signe" }).click();
    await page.getByRole("button", { name: "Noter", exact: true }).click();
    await attends(450);
  };
  const CADRE = { x: 46, y: 26, l: 286, h: 336 }, BAS = CADRE.y + CADRE.h;
  const ici = (x: number, y: number) => pointEcran(scene, { x, y });
  const curseur = (nom: string | RegExp) => scene.getByRole("slider", { name: nom });
  const valeur = async (c: Locator, attribut = "aria-valuenow") => Number(await c.getAttribute(attribut));
  /** Les points du graphique, dans les unités du dessin, de gauche à droite. */
  const points = async () => (await scene.locator(".pl-spectro-point").evaluateAll((liste) => liste.map((c) => ({ x: Number(c.getAttribute("cx")), y: Number(c.getAttribute("cy")) })))).sort((a, b) => a.x - b.x);
  /** Glisse le repère vertical d'un graphique jusqu'à une abscisse du dessin, le doigt en bas du cadre. */
  const glisseRepere = async (c: Locator, max: number, x: number) => {
    const depart = CADRE.x + ((await valeur(c)) / max) * CADRE.l;
    await glisse(page, await ici(depart, BAS - 24), await ici(x, BAS - 24), 18, 16);
    await attends(250);
  };

  const vues = new Set<string>();
  let depuis = Date.now();
  let rang = 0;
  for (let tour = 0; tour < 6000; tour++) {
    const p = await lisGuide(page);
    if (!p) throw new Error("le guide ne dit plus rien");
    if (journal[journal.length - 1]?.cle !== p.cle) {
      if (journal.length) journal[journal.length - 1].ms = Date.now() - depuis;
      depuis = Date.now();
      journal.push({ cle: p.cle, texte: p.texte, ms: 0 });
      if (!vues.has(p.cle)) { vues.add(p.cle); rang++; await attends(140); await e.photo(`${String(rang).padStart(3, "0")}-${p.cle}`); }
    } else if (Date.now() - depuis > 120000) {
      throw new Error(`le guide reste sur « ${p.cle} » : ${p.texte}`);
    }

    // ----- ce que le guide laisse à l'élève : lire l'afficheur, poser la règle, le trait et les repères -----
    if (p.cle === "lire") {
      const A = await afficheur();
      lectures[`absorbance ${Object.keys(lectures).length + 1}`] = A;
      await tape(A);
      continue;
    }
    if (p.cle === "regle") {
      // la règle part de l'origine : sa pente est celle qui passe au plus près des points, comme l'œil la cherche
      const regle = curseur(/^Règle/);
      const etalons = await points();
      const pente = etalons.reduce((s, q) => s + (q.x - CADRE.x) * (BAS - q.y), 0) / etalons.reduce((s, q) => s + (q.x - CADRE.x) ** 2, 0);
      await glisse(page, await centre(regle), await ici(CADRE.x + CADRE.l, BAS - pente * CADRE.l), 20, 16);
      await attends(300);
      lectures.regle = await valeur(regle);
      await e.photo(`${String(rang).padStart(3, "0")}-regle-posee`);
      continue;
    }
    if (p.cle === "repere") {
      // le repère là où la règle coupe le trait de l'absorbance de l'échantillon
      const regle = curseur(/^Règle/), repere = curseur("Repère de concentration");
      const hauteur = BAS - ((await valeur(regle)) / (await valeur(regle, "aria-valuemax"))) * CADRE.h;
      const trait = Number(await scene.locator(".pl-spectro-echantillon").getAttribute("y1"));
      await glisseRepere(repere, await valeur(repere, "aria-valuemax"), CADRE.x + ((BAS - trait) / (BAS - hauteur)) * CADRE.l);
      lectures.concentration = await valeur(repere);
      await e.photo(`${String(rang).padStart(3, "0")}-repere-place`);
      await pied("Noter cette concentration").click();
      await attends(400);
      continue;
    }
    if (p.cle === "courbe-palier") {
      // le trait de la valeur finale sur les derniers points de la courbe
      const trait = curseur("Trait de la valeur finale");
      const releves = await points();
      await glisse(page, await centre(trait), await ici(CADRE.x + CADRE.l, releves[releves.length - 1].y), 20, 16);
      await attends(300);
      lectures.valeurFinale = await valeur(trait);
      await e.photo(`${String(rang).padStart(3, "0")}-trait-pose`);
      continue;
    }
    if (p.cle === "courbe-temps") {
      // le repère du temps là où le trait de la moitié coupe la courbe, entre deux relevés
      const trait = curseur("Trait de la valeur finale"), repere = curseur("Repère du temps");
      const moitie = BAS - ((await valeur(trait)) / 2 / (await valeur(trait, "aria-valuemax"))) * CADRE.h;
      const releves = await points();
      const i = releves.findIndex((q) => q.y <= moitie);
      const a = releves[Math.max(0, i - 1)], b = releves[Math.max(0, i)];
      const x = i <= 0 ? b.x : a.x + ((a.y - moitie) / (a.y - b.y)) * (b.x - a.x);
      await glisseRepere(repere, await valeur(repere, "aria-valuemax"), x);
      lectures.temps = await valeur(repere);
      await e.photo(`${String(rang).padStart(3, "0")}-repere-place`);
      await pied("Noter ce temps").click();
      await attends(400);
      continue;
    }

    if (await faisLeGeste(page, scene, p)) {
      // le rythme des relevés que le guide demande : toutes les deux secondes, puis toutes les cinq
      if (p.cle === "suivre") await attends(1500);
      if (p.cle === "suivre-fin") await attends(4200);
      continue;
    }
    if (p.touche) {
      const appel = p.cle === "fini";
      await page.locator(".pl-pied .pl-vise").first().click();
      await attends(350);
      if (appel) { await e.photo("998-confirmation"); bilan.confirmation = await e.texte(".pl-confirme span"); await page.getByRole("button", { name: "Oui, j'ai fini" }).click(); break; }
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
  bilan.largeur = await e.largeur();
  await e.photo("999-verdict", true);
} catch (erreur) {
  bilan.panne = String(erreur).slice(0, 400);
  await e.photo("997-panne").catch(() => {});
} finally {
  bilan.lectures = lectures;
  bilan.consignes = journal.map((j) => `${j.cle} (${(j.ms / 1000).toFixed(1)} s)`).join(" · ");
  bilan.duree = `${Math.round(journal.reduce((s, j) => s + j.ms, 0) / 1000)} s`;
  // ce que le guide a fait reprendre en route, s'il y a lieu : une manipulation suivie à la lettre n'en a pas
  bilan.reprises = journal.filter((j) => j.cle === "refaire" || j.cle === "retour" || /replonger|ajuster|deboucher|changer/.test(j.cle)).map((j) => `${j.cle} : ${j.texte}`);
  bilan.erreurs = e.erreurs;
  console.log(JSON.stringify(bilan, null, 1));
  await e.ferme();
}
