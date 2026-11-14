// Essai à la main de la paillasse Solutions dans un vrai navigateur, sur le banc de chantier local (/app/tp/chantier/chimie).
// Il manipule comme un élève : il prend la verrerie sur l'étagère et la glisse à sa place, maintient « Verser », aspire
// à la pipette en regardant la loupe et relâche quand le liquide a passé le trait, laisse redescendre, complète la fiole
// au jet puis goutte à goutte, bouche et retourne. Comme l'élève, il ne connaît le niveau que par la loupe : il y lit
// l'écart entre le bas du ménisque et le trait de jauge. Puis il appelle le professeur et relève le jugement du serveur.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/solutions.mts <dossier des captures> [graine] [soin|fautes|verrerie|renverse] [largeur] [hauteur]
// La session doit être déjà ouverte (scripts/essais/session.mts) : cet essai ne demande jamais de code de connexion.
import { existsSync } from "node:fs";
import { chromium, type Locator, type Page } from "@playwright/test";
import { BASE, attends, centre, glisse, maintiens, ouvre, pointEcran, type Point } from "./outils.mts";

const [sortie, graine = "1", mode = "soin", largeur = "390", hauteur = "844"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/solutions.mts <dossier des captures> [graine] [soin|fautes|verrerie|renverse] [largeur] [hauteur]");

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

const e = await ouvre({ sortie, largeur: Number(largeur), hauteur: Number(hauteur) });
const page: Page = e.page;
const bilan: Record<string, unknown> = { graine, mode, fenetre: `${largeur} × ${hauteur}` };

try {
  await page.goto(`${BASE}/app/tp/chantier/chimie?tp=dilution&graine=${graine}`);
  await page.getByRole("button", { name: "Ouvrir la paillasse" }).click();
  await attends(900);
  const scene: Locator = page.locator("svg.pl-scene");
  const ici = (x: number, y: number) => pointEcran(scene, { x, y });
  const message = () => e.texte(".pl-message");
  const objet = (nom: string | RegExp) => scene.getByRole("button", { name: nom }).first();
  /** Glisse un objet, pris par son milieu, jusqu'à un point du dessin. */
  const porte = async (nom: string | RegExp, vers: Point) => { await glisse(page, await centre(objet(nom)), await ici(vers.x, vers.y)); await attends(300); };
  const touche = async (nom: string | RegExp, cle: string, fois = 1) => { const el = objet(nom); await el.focus(); for (let i = 0; i < fois; i++) await page.keyboard.press(cle); await attends(120); };
  /**
   * Ce que montre la loupe posée sur un trait de jauge : le volume qui manque pour que le bas du ménisque arrive sur le
   * trait (négatif au-dessus du trait), en millilitres. Tant que le liquide n'est pas là, il manque tout.
   */
  const manque = (parMl: number): Promise<number> => page.evaluate((k) => {
    const niveau = document.querySelector("svg.pl-scene .pl-loupe .pl-solutions-niveau");
    const ecart = niveau?.getAttribute("transform")?.match(/translate\(0 (-?[\d.]+)\)/);
    return ecart ? Number(ecart[1]) / k : Number.POSITIVE_INFINITY;
  }, parMl);
  /** Maintient l'appui sur un bouton tant que la condition n'est pas remplie, l'œil sur la loupe. */
  const maintiensJusqua = async (nom: string | RegExp, assez: () => Promise<boolean>, max = 25000) => {
    const p = await centre(objet(nom));
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    const debut = Date.now();
    while (Date.now() - debut < max && !(await assez())) await attends(25);
    await page.mouse.up();
    await attends(200);
  };
  const PIPETTE = 110, FIOLE = 40; // les unités du dessin par millilitre, dans chacune des deux loupes

  // la commande tirée : le protocole du professeur nomme la pipette et la fiole
  const protocole = (await page.locator(".pl-cote ol").textContent()) ?? "";
  const pipette = Number(protocole.match(/pipette jaugée de (\d+) mL/)?.[1]);
  const fiole = Number(protocole.match(/fiole jaugée de (\d+) mL/)?.[1]);
  bilan.commande = { pipette, fiole };
  // les places du dessin (components/tp/paillasses/Solutions.tsx)
  const TABLE = 488, AXE = 182;
  const PLAN = { x: AXE, y: TABLE - 46 }, BECHER = { x: 115, y: 262 }, FLACON = { x: 40, y: 232 }, REPOS_FLACON = { x: 40, y: 262 }, REPOS_PISSETTE = { x: 330, y: TABLE - 26 };
  const hautFiole = (capacite: number) => TABLE - 108 * (0.54 + capacite * 0.0036);
  // la place de la pipette sur l'étagère, pour l'y ranger après le prélèvement
  const placePipette = await centre(objet(`Pipette jaugée de ${pipette} mL`));
  await e.photo("01-etagere");

  if (mode === "soin" || mode === "fautes" || mode === "renverse") {
    // ----- la fiole jaugée, puis un peu de solution mère dans le bécher -----
    await porte(`Fiole jaugée de ${fiole} mL`, PLAN);
    bilan.fiole = await message();
    const haut = { x: AXE, y: hautFiole(fiole) + 4 };
    if (mode === "fautes") {
      // l'élève pressé : il plonge la pipette dans le flacon, aspire trop haut et ne règle pas le niveau
      await porte(`Pipette jaugée de ${pipette} mL`, FLACON);
      bilan.dansLeFlacon = await message();
      await maintiensJusqua("Aspirer dans la pipette", async () => (await manque(PIPETTE)) < -pipette * 0.149 && (await attends(500), true));
      await e.photo("02-dans-le-flacon-trop-haut");
      await touche("Laisser redescendre le liquide de la pipette", "ArrowRight", Math.round((pipette * 0.15 - 0.25) / 0.05));
      await e.photo("03-mal-ajustee");
      await porte(`Pipette jaugée de ${pipette} mL`, haut);
      await maintiens(page, await centre(objet("Vider dans le récipient")), 9000);
    } else {
      await porte(/Flacon de solution mère/, BECHER);
      bilan.flacon = await message();
      await maintiens(page, await centre(objet("Verser la solution mère dans le bécher")), 2200);
      await e.photo("02-solution-mere-versee");
      await touche("Verser la solution mère dans le bécher", "ArrowRight", Math.ceil(pipette / 5)); // de quoi remplir la pipette, sans compter l'appui
      bilan.becher = await message();
      await porte(/Flacon de solution mère/, REPOS_FLACON);
      // ----- le prélèvement : au-dessus du trait, puis le bas du ménisque sur le trait -----
      await porte(`Pipette jaugée de ${pipette} mL`, BECHER);
      bilan.pipette = await message();
      await e.photo("03-pipette-dans-le-becher");
      await maintiensJusqua("Aspirer dans la pipette", async () => (await manque(PIPETTE)) < -0.25);
      await e.photo("04-au-dessus-du-trait");
      await maintiensJusqua("Laisser redescendre le liquide de la pipette", async () => (await manque(PIPETTE)) > -0.12);
      // les derniers centièmes au pas fixe, comme on relâche la poire par petites touches
      const reste = await manque(PIPETTE);
      if (reste < -0.02) await touche("Laisser redescendre le liquide de la pipette", "ArrowRight", Math.round(-reste / 0.05));
      bilan.auTraitDeLaPipette = Math.round((await manque(PIPETTE)) * 100) / 100;
      await e.photo("05-au-trait");
      await porte(`Pipette jaugée de ${pipette} mL`, haut);
      bilan.surLaFiole = await message();
      await maintiens(page, await centre(objet("Vider dans le récipient")), 600);
      await e.photo("06-la-pipette-se-vide");
      await maintiens(page, await centre(objet("Vider dans le récipient")), 6000);
      await glisse(page, await centre(objet(`Pipette jaugée de ${pipette} mL`)), placePipette);
      await attends(300);
      bilan.rangee = await message();
    }
    // ----- l'eau distillée -----
    await porte("Pissette d'eau distillée", haut);
    bilan.pissette = await message();
    if (mode === "fautes") {
      // au jet jusqu'au bout, sans agiter : le trait est dépassé
      await maintiensJusqua("Ajouter de l'eau distillée au jet", async () => (await manque(FIOLE)) < -1.2);
      await e.photo("04-trait-depasse");
      bilan.depasse = Math.round(-(await manque(FIOLE)) * 100) / 100;
    } else {
      await maintiensJusqua("Ajouter de l'eau distillée au jet", async () => (await manque(FIOLE)) < fiole * 0.36);
      await e.photo("07-aux-deux-tiers");
      await objet("Agiter le récipient").click();
      bilan.agitation = await message();
      await attends(500);
      await e.photo("08-agitee");
      await maintiensJusqua("Ajouter de l'eau distillée au jet", async () => (await manque(FIOLE)) < 6);
      // dans le col, le niveau monte vite : de petits jets d'un millilitre, puis le goutte à goutte dès que le liquide est dans la loupe
      while ((await manque(FIOLE)) > 1.55) await touche("Ajouter de l'eau distillée au jet", "ArrowRight");
      await e.photo("09-le-liquide-dans-la-loupe");
      await maintiensJusqua("Ajouter de l'eau distillée goutte à goutte", async () => (await manque(FIOLE)) < 0.25);
      const gouttes = Math.round((await manque(FIOLE)) / 0.05);
      if (gouttes > 0) await touche("Ajouter de l'eau distillée goutte à goutte", "ArrowRight", gouttes);
      bilan.auTraitDeLaFiole = Math.round((await manque(FIOLE)) * 100) / 100;
      await attends(400);
      await e.photo("10-au-trait-de-jauge");
    }
    await porte("Pissette d'eau distillée", REPOS_PISSETTE);
    // ----- homogénéiser -----
    if (mode === "soin") {
      await porte("Bouchon de la fiole", haut);
      bilan.bouchon = await message();
      await e.photo("11-bouchee");
      for (let i = 0; i < 3; i++) { await objet("Retourner le récipient").click(); await attends(i === 0 ? 420 : 1000); if (i === 0) await e.photo("12-retournement"); }
      bilan.retournee = await message();
      await attends(600);
      await e.photo("13-homogene");
    }
    if (mode === "renverse") {
      await objet("Retourner le récipient").click();
      await attends(450);
      await e.photo("11-sans-bouchon");
      await attends(900);
      bilan.renverse = await message();
      await e.photo("12-sur-la-paillasse");
    }
  } else {
    // ----- la mauvaise verrerie : l'éprouvette graduée et le bécher gradué -----
    await porte(/Bécher gradué/, PLAN);
    bilan.becherGradue = await message();
    await porte(/Flacon de solution mère/, BECHER);
    await touche("Verser la solution mère dans le bécher", "ArrowRight", 8);
    await porte(/Flacon de solution mère/, REPOS_FLACON);
    await porte(/Éprouvette graduée/, BECHER);
    bilan.eprouvette = await message();
    // il lit les graduations : il s'arrête quand le niveau est en face du volume voulu
    await touche("Remplir l'éprouvette", "ArrowRight", pipette);
    await touche("Reverser un peu de l'éprouvette", "ArrowRight");
    await e.photo("02-eprouvette-graduee");
    const hautBecher = { x: AXE, y: TABLE - 56 + 4 };
    await porte(/Éprouvette graduée/, hautBecher);
    await e.photo("03-eprouvette-sur-le-becher");
    await maintiens(page, await centre(objet("Vider dans le récipient")), 7000);
    await porte("Pissette d'eau distillée", hautBecher);
    await touche("Ajouter de l'eau distillée au jet", "ArrowRight", Math.round(fiole * 0.5));
    await objet("Agiter le récipient").click();
    await attends(500);
    // il complète jusqu'à la graduation du bécher, lue à la loupe : elle annonce moins que ce que le bécher contient
    await touche("Ajouter de l'eau distillée au jet", "ArrowRight", Math.round(fiole * 1.06 - fiole * 0.5 - (pipette - 0.5)));
    await e.photo("04-graduation-du-becher");
    await objet("Agiter le récipient").click();
    await attends(600);
    await porte("Pissette d'eau distillée", REPOS_PISSETTE);
    await e.photo("05-solution-dans-le-becher");
  }

  // ----- l'appel au professeur -----
  await page.getByRole("button", { name: "J'ai fini" }).click();
  await page.getByRole("button", { name: "Oui, j'ai fini" }).click();
  await page.waitForSelector("[data-score]", { timeout: 15000 });
  await page.getByRole("button", { name: "Quitter" }).click().catch(() => {});
  await attends(400);
  bilan.score = await page.locator("[data-score]").getAttribute("data-score");
  bilan.verdict = await e.texte(".tp-correction");
  bilan.mesures = await page.locator("[data-mesures]").textContent();
  bilan.gestes = (JSON.parse((await page.locator("[data-gestes]").textContent()) ?? "[]") as unknown[]).length;
  bilan.largeur = await e.largeur();
  await e.photo("20-verdict", true);
} catch (erreur) {
  bilan.panne = String(erreur).slice(0, 400);
  await e.photo("99-panne").catch(() => {});
} finally {
  bilan.erreurs = e.erreurs;
  console.log(JSON.stringify(bilan, null, 1));
  await e.ferme();
}
