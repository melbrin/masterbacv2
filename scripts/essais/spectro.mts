// Essai à la main de la paillasse Spectro dans un vrai navigateur, sur le banc de chantier local (/app/tp/chantier/chimie).
// Il manipule comme un élève : il tourne la molette de longueur d'onde à la souris en lisant l'afficheur, glisse les
// tubes au-dessus de la cuve, la cuve dans le porte-cuve, ouvre et ferme le capot, fait le blanc, lit l'absorbance et
// la tape sur le pavé de chiffres. Pour le dosage, il pose la règle sur ses points et place le repère ; pour le suivi,
// il mélange, lance le chronomètre, accélère le temps, relève jusqu'à ce que l'absorbance ne change plus, puis lit le
// temps de demi-réaction sur sa courbe : le trait de la valeur finale sur le palier, le repère du temps là où la moitié
// coupe la courbe. Il ne connaît que ce que l'élève voit : les afficheurs et le graphique.
// Puis il appelle le professeur et relève le jugement du serveur.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/spectro.mts <dossier des captures> [etalonnage|cinetique] [graine] [soin|fautes] [largeur] [hauteur]
// La session doit être déjà ouverte (scripts/essais/session.mts) : cet essai ne demande jamais de code de connexion.
import { existsSync } from "node:fs";
import { chromium, type Locator, type Page } from "@playwright/test";
import { BASE, attends, centre, glisse, ouvre, pointEcran, type Point } from "./outils.mts";

const [sortie, tp = "etalonnage", graine = "1", mode = "soin", largeur = "390", hauteur = "844"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/spectro.mts <dossier des captures> [etalonnage|cinetique] [graine] [soin|fautes] [largeur] [hauteur]");

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
const bilan: Record<string, unknown> = { tp, graine, mode, fenetre: `${largeur} × ${hauteur}` };
const soin = mode === "soin";

try {
  await page.goto(`${BASE}/app/tp/chantier/chimie?tp=${tp}&graine=${graine}`);
  await page.getByRole("button", { name: "Ouvrir la paillasse" }).click();
  await attends(900);
  const scene: Locator = page.locator("svg.pl-scene");
  const ici = (x: number, y: number) => pointEcran(scene, { x, y });
  const message = () => e.texte(".pl-message");
  const objet = (nom: string | RegExp, exact = false) => scene.getByRole("button", { name: nom, exact }).first();
  /** Glisse un objet, pris par son milieu, jusqu'à un point du dessin. */
  const porte = async (o: Locator, vers: Point) => { await glisse(page, await centre(o), await ici(vers.x, vers.y)); await attends(320); };
  const nombreLu = (texte: string | null) => Number((texte ?? "").match(/-?−?\d+(,\d+)?/)?.[0].replace("−", "-").replace(",", "."));
  /** Ce qu'un afficheur indique : l'élève le lit, l'essai aussi. */
  const afficheur = async (nom: string) => nombreLu((await scene.getByRole("img", { name: new RegExp(`^${nom}`) }).getAttribute("aria-label"))?.split(":")[1] ?? null);

  // les places du dessin (components/tp/paillasses/Spectro.tsx)
  const TABLE = 474;
  const MOLETTE = { x: 138, y: 68 }, FENTE = { x: 272, y: 30 }, CUVE = { x: 150, y: TABLE - 24 }, SUR_CUVE = { x: 150, y: TABLE - 32 }, POUBELLE = { x: 46, y: TABLE - 30 }, BECHER = { x: 192, y: 250 };
  const cuve = () => objet(/^Cuve/);
  const capot = scene.getByRole("switch", { name: "Capot du porte-cuve" });
  /** Ouvre ou ferme le capot, s'il ne l'est pas déjà. */
  const regleCapot = async (ferme: boolean) => { if (((await capot.getAttribute("aria-checked")) === "true") !== ferme) { await capot.click(); await attends(150); } };
  const ouvreCapot = () => regleCapot(false), fermeCapot = () => regleCapot(true);
  const tube = (s: string) => (s === "eau" ? objet("Tube d'eau distillée") : s === "x" ? objet(/^Tube de (?!solution)[^ ]+$/) : s === "xd" ? objet(/diluée/) : s === "m" ? objet(/^Bécher/) : objet(`Tube de solution étalon ${s.toUpperCase()}`, true));
  const remplit = async (s: string) => { await porte(tube(s), SUR_CUVE); };
  const vide = async () => { await porte(cuve(), POUBELLE); };
  /** Rince la cuve avec la solution, puis la remplit. */
  const rinceEtRemplit = async (s: string) => { await remplit(s); await vide(); await remplit(s); };
  /** Glisse la cuve dans le porte-cuve et ferme le capot ; puis la sort et la vide. */
  const place = async () => { await ouvreCapot(); await porte(cuve(), FENTE); await fermeCapot(); };
  const sortEtVide = async () => { await ouvreCapot(); await porte(cuve(), CUVE); await vide(); };
  /** Tourne la molette à la souris, le doigt posé dessus : de la longueur d'onde affichée jusqu'à celle qu'on vise. */
  const tourneMolette = async (vers: number) => {
    const angle = (v: number) => ((-135 + ((v - 400) / 300) * 270) * Math.PI) / 180;
    const point = (a: number) => ici(MOLETTE.x + 18 * Math.sin(a), MOLETTE.y - 18 * Math.cos(a));
    const de = angle(await afficheur("Longueur d'onde")), a = angle(vers);
    const debut = await point(de);
    await page.mouse.move(debut.x, debut.y);
    await page.mouse.down();
    for (let i = 1; i <= 24; i++) { const p = await point(de + ((a - de) * i) / 24); await page.mouse.move(p.x, p.y); await attends(18); }
    await page.mouse.up();
    await attends(200);
  };
  const molette = scene.getByRole("slider", { name: "Molette de longueur d'onde" });
  /** Tape un nombre sur le pavé de chiffres, puis le note. */
  const tape = async (valeur: number) => {
    for (const c of valeur.toFixed(3).replace(".", ",")) await page.locator(".pl-pave").getByRole("button", { name: c, exact: true }).click();
    await page.getByRole("button", { name: "Noter", exact: true }).click();
    await attends(450);
  };
  /** Lit l'absorbance sur l'afficheur et la note, comme elle est affichée. */
  const note = async (photo?: string) => {
    const A = await afficheur("Absorbance");
    await page.getByRole("button", { name: "Noter l'absorbance" }).click();
    await attends(450);
    if (photo) await e.photo(photo);
    await tape(A);
    return A;
  };

  bilan.depart = { longueurDOnde: await afficheur("Longueur d'onde"), absorbance: await afficheur("Absorbance") };
  await e.photo("01-paillasse");
  // la cuve : ses faces lisses doivent être sur le trajet du faisceau ; la vue de dessus le montre
  await objet("Tourner la cuve d'un quart de tour").click();
  bilan.tournee = await message();

  if (tp === "etalonnage") {
    const lues: Record<string, number> = {};
    // ----- la longueur d'onde : on cherche la plus grande absorbance avec la solution la plus concentrée -----
    await remplit("s5");
    bilan.remplie = await message();
    await e.photo("02-cuve-remplie");
    await ouvreCapot();
    bilan.capot = await message();
    await e.photo("03-capot-ouvert");
    await porte(cuve(), FENTE);
    bilan.placee = await message();
    await e.photo("04-cuve-dans-le-porte-cuve");
    await fermeCapot();
    await e.photo("05-capot-ferme");
    await tourneMolette(soin ? 530 : 480);
    await e.photo("06-molette-tournee");
    if (soin) {
      // à petits pas, tant que l'absorbance augmente
      await molette.focus();
      let avant = await afficheur("Absorbance");
      for (const cle of ["ArrowLeft", "ArrowRight"]) {
        for (let i = 0; i < 30; i++) {
          await page.keyboard.press(cle);
          const A = await afficheur("Absorbance");
          if (A <= avant) { await page.keyboard.press(cle === "ArrowLeft" ? "ArrowRight" : "ArrowLeft"); break; }
          avant = A;
        }
      }
      await e.photo("07-au-maximum");
    }
    bilan.reglage = { longueurDOnde: await afficheur("Longueur d'onde"), absorbance: await afficheur("Absorbance") };
    await sortEtVide();
    // ----- le blanc -----
    if (soin) {
      await rinceEtRemplit("eau");
      await place();
      await scene.getByRole("button", { name: "Faire le blanc" }).click();
      bilan.blanc = { message: await message(), absorbance: await afficheur("Absorbance") };
      await e.photo("08-blanc");
      await sortEtVide();
    }
    // ----- la gamme, puis la boisson -----
    const mesure = async (s: string, photo?: string) => {
      if (soin) await rinceEtRemplit(s); else await remplit(s);
      await place();
      lues[s] = await note(photo);
      if (photo) await e.photo(`${photo}-notee`);
      await sortEtVide();
    };
    for (const s of ["s1", "s2", "s3", "s4", "s5"]) await mesure(s, s === "s3" ? "09-saisie" : undefined);
    await mesure("x", "10-boisson");
    // la boisson absorbe plus que la solution étalon la plus concentrée : on mesure la boisson diluée
    if (soin && lues.x > lues.s5) await mesure("xd", "11-boisson-diluee");
    bilan.lues = lues;
    const echantillon = lues.xd ?? lues.x;
    // ----- la droite et le repère -----
    await page.getByRole("button", { name: "Ouvrir le graphique" }).click();
    await attends(600);
    await e.photo("12-graphique");
    const graphe: Locator = page.locator("svg.pl-scene");
    const regle = graphe.getByRole("slider", { name: /^Règle/ });
    const repere = graphe.getByRole("slider", { name: "Repère de concentration" });
    const aMax = Number(await regle.getAttribute("aria-valuemax")), cMax = Number(await repere.getAttribute("aria-valuemax"));
    const CADRE = { x: 46, y: 26, l: 286, h: 336 };
    const surGraphe = (C: number, A: number) => pointEcran(graphe, { x: CADRE.x + (C / cMax) * CADRE.l, y: CADRE.y + CADRE.h - (A / aMax) * CADRE.h });
    // la pente qui passe par l'origine et au plus près des points notés, comme l'œil la cherche
    const gamme = [4, 8, 12, 16, 20];
    const pente = gamme.reduce((s, C, i) => s + C * lues[`s${i + 1}`], 0) / gamme.reduce((s, C) => s + C * C, 0);
    await glisse(page, await centre(regle), await surGraphe(cMax, pente * cMax), 20, 16);
    await attends(250);
    await regle.focus();
    for (let i = 0; i < 40; i++) {
      const ecart = pente * cMax - Number(await regle.getAttribute("aria-valuenow"));
      if (Math.abs(ecart) < 0.004) break;
      await page.keyboard.press(ecart > 0 ? "ArrowUp" : "ArrowDown");
    }
    await e.photo("13-regle-posee");
    const visee = echantillon / pente;
    const depart = await surGraphe(Number(await repere.getAttribute("aria-valuenow")), aMax * 0.9);
    await glisse(page, depart, await surGraphe(visee, aMax * 0.9), 20, 16);
    await repere.focus();
    for (let i = 0; i < 60; i++) {
      const ecart = visee - Number(await repere.getAttribute("aria-valuenow"));
      if (Math.abs(ecart) < 0.06) break;
      await page.keyboard.press(ecart > 0 ? "ArrowRight" : "ArrowLeft");
    }
    bilan.repere = Number(await repere.getAttribute("aria-valuenow"));
    await e.photo("14-repere-place");
    await page.getByRole("button", { name: "Noter cette concentration" }).click();
    await attends(400);
    bilan.notee = await message();
    await e.photo("15-concentration-notee");
  } else {
    // ----- la longueur d'onde, puis le blanc -----
    await tourneMolette(470);
    await molette.focus();
    for (let i = 0; i < 20 && (await afficheur("Longueur d'onde")) !== 460; i++) await page.keyboard.press((await afficheur("Longueur d'onde")) > 460 ? "ArrowLeft" : "ArrowRight");
    bilan.reglage = { longueurDOnde: await afficheur("Longueur d'onde") };
    await e.photo("02-molette-reglee");
    if (soin) {
      await rinceEtRemplit("eau");
      await place();
      await scene.getByRole("button", { name: "Faire le blanc" }).click();
      bilan.blanc = { message: await message(), absorbance: await afficheur("Absorbance") };
      await e.photo("03-blanc");
      await sortEtVide();
    }
    await ouvreCapot();
    // ----- le mélange, à l'instant zéro -----
    const lancer = scene.getByRole("button", { name: "Lancer le chronomètre" });
    const accelere = scene.getByRole("button", { name: "Accélérer le temps de la paillasse" });
    await porte(objet("Tube de solution de peroxodisulfate"), BECHER);
    if (soin) await lancer.click();
    bilan.melange = await message();
    await e.photo("04-melange");
    await remplit("m");
    await porte(cuve(), FENTE);
    await fermeCapot();
    await e.photo("05-cuve-en-place");
    // l'élève pressé : il accélère d'abord, et ne lance le chronomètre qu'ensuite
    await accelere.click();
    if (!soin) { await attends(1500); await lancer.click(); }
    bilan.accelere = await message();
    // ----- les relevés : serrés au début, jusqu'à ce que l'absorbance ne change plus -----
    const releves: { t: number; A: number }[] = [];
    const relever = scene.getByRole("button", { name: "Relever l'absorbance et la date" });
    for (let i = 0; i < 70; i++) {
      await relever.click();
      // le relevé tel que l'appareil l'a gardé : la dernière ligne du carnet
      const ligne = (await scene.locator(".pl-spectro-carnet-ligne").allTextContents()).pop() ?? "";
      releves.push({ t: nombreLu(ligne.split(":")[0]), A: nombreLu(ligne.split(":")[1] ?? null) });
      if (i === 4) await e.photo("06-premiers-releves");
      const n = releves.length;
      if (!soin && n >= 9) break;
      if (n >= 14 && Math.abs(releves[n - 1].A - releves[n - 4].A) < 0.004 && releves[n - 1].t - releves[n - 4].t > 150) break;
      await attends(n < 14 ? 800 : 2800);
    }
    await accelere.click();
    bilan.releves = { nombre: releves.length, dernier: releves[releves.length - 1] };
    await e.photo("07-fin-des-releves");
    // ----- la courbe : le trait de la valeur finale sur le palier, puis le repère du temps là où la moitié coupe la courbe -----
    await page.getByRole("button", { name: "Ouvrir la courbe" }).click();
    await attends(600);
    await e.photo("08-courbe");
    const graphe: Locator = page.locator("svg.pl-scene");
    const trait = graphe.getByRole("slider", { name: "Trait de la valeur finale" });
    const repere = graphe.getByRole("slider", { name: "Repère du temps" });
    const CADRE = { x: 46, y: 26, l: 286, h: 336 }, BAS = CADRE.y + CADRE.h;
    const tMax = Number(await repere.getAttribute("aria-valuemax")), aMax = Number(await trait.getAttribute("aria-valuemax"));
    const surCourbe = (t: number, A: number) => pointEcran(graphe, { x: CADRE.x + (t / tMax) * CADRE.l, y: BAS - (A / aMax) * CADRE.h });
    const finale = releves[releves.length - 1];
    // l'élève pressé pose le trait trop bas : sur un point du milieu de la montée
    await glisse(page, await centre(trait), await surCourbe(tMax, soin ? finale.A : finale.A * 0.6), 20, 16);
    await attends(250);
    bilan.valeurFinale = Number(await trait.getAttribute("aria-valuenow"));
    await e.photo("09-valeur-finale");
    // la date où l'absorbance vaut la moitié de la valeur posée, entre deux relevés
    const moitie = Number(await trait.getAttribute("aria-valuenow")) / 2;
    const i = releves.findIndex((p) => p.A >= moitie);
    const a = releves[Math.max(0, i - 1)], b = releves[Math.max(0, i)];
    const demi = i <= 0 ? b.t : a.t + ((moitie - a.A) / (b.A - a.A)) * (b.t - a.t);
    const depart = await surCourbe(Number(await repere.getAttribute("aria-valuenow")), aMax * 0.08);
    await glisse(page, depart, await surCourbe(demi, aMax * 0.08), 20, 16);
    await attends(250);
    bilan.repere = Number(await repere.getAttribute("aria-valuenow"));
    await e.photo("10-demi-reaction");
    await page.getByRole("button", { name: "Noter ce temps" }).click();
    await attends(400);
    bilan.note = await message();
    await e.photo("11-temps-note");
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
  bilan.panne = String(erreur).slice(0, 500);
  await e.photo("99-panne").catch(() => {});
} finally {
  bilan.erreurs = e.erreurs;
  console.log(JSON.stringify(bilan, null, 1));
  await e.ferme();
}
