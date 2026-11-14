// Essai à la main de la paillasse « ultrasons » dans un vrai navigateur, sur son banc de chantier (/app/tp/chantier/ondes?tp=ultrasons).
// Il manipule comme un élève : il tire les câbles d'une prise à l'autre, tourne les molettes de l'oscilloscope, glisse les
// curseurs de l'écran, fait glisser le récepteur mobile, lit le rail à la loupe et écrit ses lectures dans le carnet.
// Puis il appelle le professeur et relève le jugement du serveur.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/ultrasons.mts <dossier des captures> [graine] [soignee|baclee] [largeur] [hauteur]
import type { Locator, Page } from "@playwright/test";
import { BASE, attends, glisse, ouvre, pointEcran, type Point } from "./outils.mts";

const [sortie, graineTexte = "1", mode = "soignee", largeur = "390", hauteur = "844"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/ultrasons.mts <dossier des captures> [graine] [soignee|baclee] [largeur] [hauteur]");
const e = await ouvre({ sortie, largeur: Number(largeur), hauteur: Number(hauteur) });
const page: Page = e.page;
const bilan: Record<string, unknown> = { mode, graine: Number(graineTexte), fenetre: `${largeur} x ${hauteur}` };

// la situation tirée par la graine : les mêmes listes que lib/serveur/contenu/tp/ultrasons.ts
const graine = Number(graineTexte);
const variante = <V,>(choix: V[]): V => choix[Math.abs(Math.trunc(graine)) % choix.length];
const f = variante([40000, 39200, 40800]), theta = variante([16, 28, 18, 31]), fixe = variante([-11.5, -8.2, -14.6, -9.7, -12.9]);
const T = 1e6 / f, lambda = ((331.5 + 0.607 * theta) / f) * 1000;
/** La première position du récepteur mobile où les deux signaux sont en phase, en millimètres. */
const debut = fixe + Math.ceil((14 - fixe) / lambda) * lambda;

await page.goto(`${BASE}/app/tp/chantier/ondes?tp=ultrasons&graine=${graine}`);
await page.getByRole("button", { name: "Ouvrir la paillasse" }).click();
await attends(900);
const scene: Locator = page.locator("svg.pl-scene");
const ici = (x: number, y: number) => pointEcran(scene, { x, y });
const deplace = async (de: Point, vers: Point, pas = 14) => { await glisse(page, await ici(de.x, de.y), await ici(vers.x, vers.y), pas); await attends(250); };
const message = () => e.texte(".pl-message");
const curseur = (nom: string | RegExp) => scene.getByRole("slider", { name: nom }).first();
const touche = async (nom: string | RegExp, cle: string, fois = 1) => { await curseur(nom).focus(); for (let i = 0; i < fois; i++) await page.keyboard.press(cle); await attends(150); };
const virgule = (x: number, decimales: number) => x.toFixed(decimales).replace(".", ",");

// les places du dessin (components/tp/paillasses/Ultrasons.tsx)
const X = (mm: number) => 78 + mm * 2.1;
const AXE = 492, GRILLE = { x: 20, y: 14, div: 32, h: 256 }, LOUPE = { x: 292, parMm: 6.2 }, FIN = { x: 20, y: 594 };
const GEN = { x: 30, y: 347 }, VOIE1 = { x: 134, y: 347 }, VOIE2 = { x: 242, y: 347 }, EMETTEUR = { x: 12, y: 458 }, FIXE = { x: X(fixe), y: 530 };
const mobile = (mm: number): Point => ({ x: X(mm), y: 456 });
const MOLETTE_1 = { x: 88, y: 347, crans: 9 }, MOLETTE_BASE = { x: 304, y: 347, crans: 10 };

/** Tourne une molette à la souris : le doigt se pose sur son repère et suit l'arc jusqu'au cran voulu. */
async function tourne(m: { x: number; y: number; crans: number }, de: number, vers: number): Promise<void> {
  const angle = (cran: number) => -135 + (cran / (m.crans - 1)) * 270;
  const point = (deg: number) => ici(m.x + 15 * Math.sin((deg * Math.PI) / 180), m.y - 15 * Math.cos((deg * Math.PI) / 180));
  const depart = await point(angle(de));
  await page.mouse.move(depart.x, depart.y);
  await page.mouse.down();
  const pas = Math.max(6, Math.ceil(Math.abs(angle(vers) - angle(de)) / 8));
  for (let i = 1; i <= pas; i++) {
    const p = await point(angle(de) + ((angle(vers) - angle(de)) * i) / pas);
    await page.mouse.move(p.x, p.y);
    await attends(14);
  }
  await page.mouse.up();
  await attends(200);
}

/** Lit le rail à la loupe, comme l'élève : la graduation chiffrée la plus proche, et l'écart du repère à cette graduation. En millimètres. */
const lisLoupe = (): Promise<number> => scene.evaluate((svg, loupe) => {
  const chiffres = [...svg.querySelectorAll(".pl-loupe text.pl-loupe-chiffre")].map((t) => ({ cm: Number(t.textContent), x: Number(t.getAttribute("x")) }));
  const proche = chiffres.sort((a, b) => Math.abs(a.x - loupe.x) - Math.abs(b.x - loupe.x))[0];
  return Math.round((proche.cm * 10 + (loupe.x - proche.x) / loupe.parMm) * 10) / 10;
}, LOUPE);
/** Ce que l'élève écrit après avoir lu le rail : au demi-millimètre près, en centimètres. */
const lectureRail = (mm: number) => virgule(Math.round(mm * 2) / 20, 2);

/** Amène le récepteur mobile sur une graduation, au clavier : les touches Page font un millimètre, les flèches un dixième. */
async function amene(cible: number): Promise<void> {
  const pas = Math.round((cible - (await lisLoupe())) * 10);
  await touche("Récepteur mobile, sur le rail", pas > 0 ? "PageUp" : "PageDown", Math.floor(Math.abs(pas) / 10));
  await touche("Récepteur mobile, sur le rail", pas > 0 ? "ArrowRight" : "ArrowLeft", Math.abs(pas) % 10);
}

/** Ouvre le carnet, choisit une ligne, écrit la valeur au pavé de chiffres, et la note. */
async function ecris(ligne: RegExp, valeur: string, photo?: string): Promise<void> {
  await page.getByRole("button", { name: /Carnet de mesures/ }).click();
  if (photo) await e.photo(`${photo}-carnet`);
  await page.getByRole("button", { name: ligne }).click();
  await attends(550);
  for (const c of valeur) await page.locator(".pl-pave").getByRole("button", { name: c, exact: true }).click();
  if (photo) await e.photo(`${photo}-saisie`);
  await page.getByRole("button", { name: "Noter", exact: true }).click();
  await attends(550);
}

await e.photo("01-depart");
if (await page.getByRole("button", { name: "Protocole" }).isVisible()) {
  await page.getByRole("button", { name: "Protocole" }).click();
  await attends(350);
  await e.photo("02-protocole");
  await page.getByRole("button", { name: "Fermer" }).click();
}

// ----- les câbles : tirés à la souris, d'une prise à l'autre -----
await deplace(GEN, EMETTEUR);
bilan.emetteur = await message();
await deplace(FIXE, VOIE1);
await deplace(mobile(30), VOIE2);
bilan.cables = await message();
await e.photo("03-cables");

if (mode === "soignee") {
  // ----- régler l'oscilloscope : la voie 1 et la base de temps à la souris, la voie 2 au clavier -----
  await tourne(MOLETTE_1, 8, 2);
  bilan.voie1 = await message();
  await e.photo("04-voie-1");
  await touche("Sensibilité de la voie 2", "ArrowLeft", 6);
  await tourne(MOLETTE_BASE, 9, 6);
  await e.photo("05-bande");
  await tourne(MOLETTE_BASE, 6, 2);
  bilan.base = await message();
  await e.photo("06-deux-periodes");

  // ----- mesurer la période : le curseur A au début d'une période, le curseur B au bout de la dernière période entière -----
  const periodes = Math.floor(50 / T) >= 2 ? 2 : 1;
  await deplace({ x: GRILLE.x + 2 * GRILLE.div, y: GRILLE.y + 4 }, { x: GRILLE.x - 6, y: GRILLE.y + 4 });
  await deplace({ x: GRILLE.x + 7 * GRILLE.div, y: GRILLE.y + GRILLE.h - 4 }, { x: GRILLE.x + ((periodes * T) / 5) * GRILLE.div, y: GRILLE.y + GRILLE.h - 4 });
  // la fin du réglage au clavier, par pas de deux centièmes de division
  const B = curseur("Curseur B de l'écran");
  const ecart = Math.round((Math.round(((periodes * T) / 5) * 50) / 50 - Number(await B.getAttribute("aria-valuenow"))) * 50);
  await touche("Curseur B de l'écran", ecart > 0 ? "ArrowRight" : "ArrowLeft", Math.abs(ecart));
  await e.photo("07-curseurs");
  // l'élève lit l'écart des curseurs sur l'écran, puis calcule : divisions × base de temps, divisé par le nombre de périodes
  const lu = Number((await scene.locator(".pl-ultrasons-lecture").textContent())?.match(/([\d,]+) div/)?.[1].replace(",", "."));
  bilan.ecartDesCurseurs = lu;
  await ecris(/Période du signal/, virgule((lu * 5) / periodes, 1), "08-periode");
  bilan.periode = await message();

  // ----- la première position en phase : le récepteur glissé à la souris, puis ajusté -----
  await deplace({ x: X(30), y: AXE }, { x: X(debut) + 3, y: AXE }, 24);
  await e.photo("09-pres-du-depart");
  await amene(Math.round(debut * 10) / 10);
  await e.photo("10-en-phase");
  await ecris(/Position de départ/, lectureRail(await lisLoupe()), "11-depart");

  // ----- dix longueurs d'onde plus loin : glissé lentement en comptant, la molette de réglage fin, puis le clavier -----
  const fin = Math.round((debut + 10 * lambda) * 10) / 10;
  const depuis = await lisLoupe();
  await glisse(page, await ici(X(depuis), AXE), await ici(X(depuis + 4.5 * lambda), AXE), 60, 10);
  await attends(200);
  await e.photo("12-en-opposition");
  const milieu = await lisLoupe();
  await glisse(page, await ici(X(milieu), AXE), await ici(X(fin - 2), AXE), 70, 10);
  await attends(200);
  bilan.apresLaSouris = await lisLoupe();
  await deplace({ x: FIN.x + 30, y: FIN.y + 18 }, { x: FIN.x + 110, y: FIN.y + 18 }, 20);
  bilan.apresLeReglageFin = await lisLoupe();
  await amene(fin);
  await e.photo("13-dix-longueurs-d-onde");
  await ecris(/Position d'arrivée/, lectureRail(await lisLoupe()), "14-arrivee");
  await ecris(/Longueurs d'onde comptées/, "10");
  bilan.nombre = await message();
  await page.getByRole("button", { name: /Carnet de mesures/ }).click();
  await e.photo("15-carnet-rempli");
  await page.getByRole("button", { name: "Fermer le carnet" }).click();
} else {
  // ----- une manipulation bâclée : un signal qui sort de l'écran, des périodes trop serrées, une seule longueur d'onde, sans réglage fin -----
  await touche("Sensibilité de la voie 1", "ArrowLeft", 7);
  await touche("Base de temps", "ArrowLeft", 4);
  bilan.base = await message();
  await e.photo("04-illisible");
  await ecris(/Période du signal/, virgule(T * 1.04, 0), "05-periode");
  // le récepteur poussé en bout de course, puis reculé d'à peu près une longueur d'onde, sans regarder la phase
  await deplace({ x: X(30), y: AXE }, { x: X(0), y: AXE });
  bilan.butee = await message();
  await ecris(/Position de départ/, lectureRail((await lisLoupe()) + 2));
  await touche("Récepteur mobile, sur le rail", "PageUp", 8);
  await e.photo("06-hors-phase");
  await ecris(/Position d'arrivée/, lectureRail(await lisLoupe()));
  await ecris(/Longueurs d'onde comptées/, "1");
}

// ----- l'appel au professeur -----
await e.photo("16-avant-l-appel");
await page.getByRole("button", { name: "J'ai fini" }).click();
await e.photo("17-confirmation");
await page.getByRole("button", { name: "Oui, j'ai fini" }).click();
await page.waitForSelector("[data-score]", { timeout: 15000 });
await page.getByRole("button", { name: "Quitter" }).click().catch(() => {});
await attends(400);
bilan.score = await page.locator("[data-score]").getAttribute("data-score");
bilan.verdict = await e.texte(".tp-correction");
bilan.mesures = await page.locator("[data-mesures]").textContent();
bilan.largeur = await e.largeur();
bilan.erreurs = e.erreurs;
await e.photo("18-verdict", true);
console.log(JSON.stringify(bilan, null, 1));
await e.ferme();
