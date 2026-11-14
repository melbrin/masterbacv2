// Essai à la main de la paillasse « doppler » dans un vrai navigateur, sur son banc de chantier (/app/tp/chantier/ondes?tp=doppler).
// Il manipule comme un élève : il tourne la molette du moteur, glisse les fourches optiques, lit la règle à la loupe,
// lance l'enregistreur puis le mobile, arrête l'enregistreur, lit le chronomètre, ramène le mobile, puis zoome sur le
// spectre et pose le repère sur le sommet de chaque pic. Il note chaque lecture dans le carnet, appelle le professeur
// et relève le jugement du serveur.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/doppler.mts <dossier des captures> [graine] [soignee|baclee] [largeur] [hauteur]
import type { Locator, Page } from "@playwright/test";
import { BASE, attends, glisse, ouvre, pointEcran, type Point } from "./outils.mts";

const [sortie, graineTexte = "1", mode = "soignee", largeur = "390", hauteur = "844"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/doppler.mts <dossier des captures> [graine] [soignee|baclee] [largeur] [hauteur]");
const e = await ouvre({ sortie, largeur: Number(largeur), hauteur: Number(hauteur) });
const page: Page = e.page;
const graine = Number(graineTexte);
const bilan: Record<string, unknown> = { mode, graine, fenetre: `${largeur} x ${hauteur}` };

// la situation tirée par la graine : les mêmes listes que lib/serveur/contenu/tp/doppler.ts
const variante = <V,>(choix: V[]): V => choix[Math.abs(Math.trunc(graine)) % choix.length];
const fE = variante([4000, 3000, 5000]), cran = variante([3, 4, 2]);

await page.goto(`${BASE}/app/tp/chantier/ondes?tp=doppler&graine=${graine}`);
await page.getByRole("button", { name: "Ouvrir la paillasse" }).click();
await attends(900);
const scene: Locator = page.locator("svg.pl-scene");
const ici = (x: number, y: number) => pointEcran(scene, { x, y });
const deplace = async (de: Point, vers: Point, pas = 16) => { await glisse(page, await ici(de.x, de.y), await ici(vers.x, vers.y), pas); await attends(250); };
const message = () => e.texte(".pl-message");
const curseur = (nom: string | RegExp) => scene.getByRole("slider", { name: nom }).first();
const touche = async (nom: string | RegExp, cle: string, fois = 1) => { await curseur(nom).focus(); for (let i = 0; i < fois; i++) await page.keyboard.press(cle); await attends(120); };
const virgule = (x: number, decimales: number) => x.toFixed(decimales).replace(".", ",");
const nombreLu = (texte: string | null | undefined) => Number((texte ?? "").replace(/[^\d,]/g, "").replace(",", "."));

// les places du dessin (components/tp/paillasses/Doppler.tsx et doppler-spectre.tsx)
const X = (cm: number) => 20 + cm * 0.8;
const RAIL_Y = 290, LOUPE = { x: 286, parCm: 4.6 }, MOTEUR = { x: 58, y: 46, crans: 5 };
const ECRAN = { x: 30, y: 30, l: 320, h: 300 }, ZOOM = { x: 60, y: 448, crans: 7 };

/** Tourne une molette à la souris : le doigt se pose sur son repère et suit l'arc jusqu'au cran voulu. */
async function tourne(m: { x: number; y: number; crans: number }, de: number, vers: number): Promise<void> {
  const angle = (rang: number) => -135 + (rang / (m.crans - 1)) * 270;
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

/** Lit la règle à la loupe, comme l'élève : la graduation chiffrée la plus proche, et l'écart du repère à cette graduation. En centimètres, au demi-centimètre. */
const lisLoupe = (): Promise<number> => scene.evaluate((svg, loupe) => {
  const chiffres = [...svg.querySelectorAll(".pl-loupe text.pl-loupe-chiffre")].map((t) => ({ cm: Number(t.textContent), x: Number(t.getAttribute("x")) }));
  const proche = chiffres.sort((a, b) => Math.abs(a.x - loupe.x) - Math.abs(b.x - loupe.x))[0];
  return Math.round((proche.cm + (loupe.x - proche.x) / loupe.parCm) * 2) / 2;
}, LOUPE);

/** Glisse une fourche à la souris près d'une graduation, puis l'y amène au clavier : les touches Page font dix centimètres, les flèches un demi-centimètre. */
async function placeFourche(n: 1 | 2, de: number, vers: number): Promise<void> {
  await deplace({ x: X(de), y: RAIL_Y - 20 }, { x: X(vers) + 2, y: RAIL_Y - 20 }, 20);
  const pas = Math.round((vers - (await lisLoupe())) * 2);
  await touche(`Fourche optique F${n}, sur le rail`, pas > 0 ? "PageUp" : "PageDown", Math.floor(Math.abs(pas) / 20));
  await touche(`Fourche optique F${n}, sur le rail`, pas > 0 ? "ArrowRight" : "ArrowLeft", Math.abs(pas) % 20);
}

/** Ouvre le carnet, choisit une ligne, écrit la valeur au pavé de chiffres, et la note. */
async function ecris(ligne: RegExp, valeur: string, photo?: string): Promise<void> {
  await page.getByRole("button", { name: /^Carnet/ }).click();
  await page.getByRole("button", { name: ligne }).click();
  await attends(550);
  for (const c of valeur) await page.locator(".pl-pave").getByRole("button", { name: c, exact: true }).click();
  if (photo) await e.photo(photo);
  await page.getByRole("button", { name: "Noter", exact: true }).click();
  await attends(550);
}

/** Ce que l'élève voit sur l'écran de l'analyseur : pour chaque colonne, sa fréquence et sa hauteur. */
const lisSpectre = (): Promise<{ f: number; hauteur: number }[]> => scene.locator("polyline.pl-doppler-courbe").evaluate((courbe, ecran) => {
  const debut = Number(courbe.getAttribute("data-debut")), fenetre = Number(courbe.getAttribute("data-largeur"));
  return (courbe.getAttribute("points") ?? "").split(" ").map((p) => p.split(",").map(Number)).map(([x, y]) => ({ f: debut + ((x - ecran.x) / ecran.l) * fenetre, hauteur: ecran.y + ecran.h - y }));
}, ECRAN);
/** Le sommet du plus haut pic entre deux fréquences. */
const sommet = async (de: number, a: number): Promise<number> => (await lisSpectre()).filter((p) => p.f >= de && p.f <= a).sort((u, v) => v.hauteur - u.hauteur)[0].f;
/** Amène le repère sur une fréquence, au clavier : les touches Page font dix pas, les flèches un pas. */
async function amene(f: number): Promise<void> {
  const repere = curseur("Repère du spectre");
  const pas = Number(await scene.locator("polyline.pl-doppler-courbe").getAttribute("data-largeur")) / 400;
  const sauts = Math.round((f - Number(await repere.getAttribute("aria-valuenow"))) / pas);
  await touche("Repère du spectre", sauts > 0 ? "PageUp" : "PageDown", Math.floor(Math.abs(sauts) / 10));
  await touche("Repère du spectre", sauts > 0 ? "ArrowRight" : "ArrowLeft", Math.abs(sauts) % 10);
}
/** Zoome sur un pic, pose le repère sur son sommet, et lit la fréquence que l'analyseur affiche. */
async function lisPic(de: number, a: number, photo: string): Promise<number> {
  await amene(await sommet(de, a));
  await touche("Zoom de l'analyseur", "ArrowRight");
  await amene(await sommet(de, a));
  await e.photo(photo);
  const lu = nombreLu(await scene.locator(".pl-doppler-lecture").textContent());
  await touche("Zoom de l'analyseur", "ArrowLeft");
  return lu;
}

await e.photo("01-banc");

// ----- le moteur et les fourches -----
if (mode === "soignee") {
  await tourne(MOTEUR, 0, cran - 1);
  bilan.moteur = await message();
  await placeFourche(1, 20, 100);
  await e.photo("02-fourche-1");
  await ecris(/Position de la première fourche/, virgule(await lisLoupe(), 1), "03-lecture-de-la-regle");
  await placeFourche(2, 70, 300);
  await ecris(/Position de la seconde fourche/, virgule(await lisLoupe(), 1));
  await e.photo("04-fourches-placees");
}

// ----- l'enregistrement et le passage du mobile -----
const enregistre = scene.getByRole("button", { name: "Lancer l'enregistrement" });
const lanceMobile = scene.getByRole("button", { name: "Lancer le mobile" });
if (mode === "soignee") {
  await enregistre.click();
  await attends(700);
  await lanceMobile.click();
  await attends(650);
  await e.photo("05-le-mobile-passe");
  await page.waitForFunction(() => document.querySelector(".pl-message")?.textContent?.includes("arrivé"), undefined, { timeout: 15000 });
  await attends(600);
  await scene.getByRole("button", { name: "Arrêter l'enregistrement" }).click();
} else {
  // une manipulation bâclée : le moteur et les fourches laissés comme ils sont, l'enregistrement lancé quand le mobile est déjà passé
  await lanceMobile.click();
  await attends(2400);
  await enregistre.click();
  await page.waitForFunction(() => document.querySelector(".pl-message")?.textContent?.includes("arrivé"), undefined, { timeout: 15000 });
  await attends(500);
  await scene.getByRole("button", { name: "Arrêter l'enregistrement" }).click();
}
bilan.enregistrement = await message();
await e.photo("06-arrive");

// ----- le chronomètre, puis le mobile ramené au départ -----
const duree = nombreLu(await scene.locator('[aria-label^="Chronomètre"] .pl-afficheur-valeur').textContent());
await ecris(/Durée du chronomètre/, virgule(duree, 3), "07-lecture-du-chronometre");
if (mode === "baclee") {
  // la règle lue de travers, de trois centimètres
  await ecris(/Position de la première fourche/, "23");
  await ecris(/Position de la seconde fourche/, "70");
}
await deplace({ x: X(400), y: RAIL_Y - 14 }, { x: X(0), y: RAIL_Y - 12 }, 24);
bilan.retour = await message();
await e.photo("08-mobile-ramene");

// ----- le spectre : de loin, un seul trait ; de près, les pics -----
await page.getByRole("button", { name: "Spectre" }).click();
await attends(400);
await e.photo("09-spectre-de-loin");
// le repère glissé à la souris sur le trait, puis la molette de zoom tournée à la souris jusqu'à la fenêtre de 200 Hz
await deplace({ x: ECRAN.x + (2000 / 8000) * ECRAN.l, y: ECRAN.y + 120 }, { x: ECRAN.x + (fE / 8000) * ECRAN.l, y: ECRAN.y + 120 });
await tourne(ZOOM, 0, 3);
await e.photo("10-spectre-fenetre-800");
await amene(await sommet(fE - 2, fE + 2));
await tourne(ZOOM, 3, 5);
await e.photo("11-spectre-fenetre-200");
if (mode === "soignee") {
  const approche = await lisPic(fE + 3, fE + 100, "12-pic-de-l-approche");
  await ecris(/Fréquence à l'approche/, virgule(approche, 2), "13-lecture-du-repere");
  const eloignement = await lisPic(fE - 100, fE - 3, "14-pic-de-l-eloignement");
  await ecris(/Fréquence à l'éloignement/, virgule(eloignement, 2));
  bilan.frequences = [approche, eloignement];
} else {
  // sans zoomer davantage : le repère posé à peu près sur ce qui dépasse, de chaque côté
  const eloignement = await sommet(fE - 100, fE - 3);
  await amene(eloignement + 2);
  await ecris(/Fréquence à l'éloignement/, virgule(nombreLu(await scene.locator(".pl-doppler-lecture").textContent()), 2));
  await amene(fE + 6);
  await ecris(/Fréquence à l'approche/, virgule(nombreLu(await scene.locator(".pl-doppler-lecture").textContent()), 2));
}
await page.getByRole("button", { name: /^Carnet/ }).click();
await e.photo("15-carnet");
await page.getByRole("button", { name: "Fermer le carnet" }).click();

// ----- l'appel au professeur -----
await page.getByRole("button", { name: "J'ai fini" }).click();
await page.getByRole("button", { name: "Oui, j'ai fini" }).click();
await page.waitForSelector("[data-score]", { timeout: 15000 });
await page.getByRole("button", { name: "Quitter" }).click().catch(() => {});
await attends(400);
bilan.score = await page.locator("[data-score]").getAttribute("data-score");
bilan.verdict = await e.texte(".tp-correction");
bilan.mesures = await page.locator("[data-mesures]").textContent();
bilan.largeur = await e.largeur();
bilan.erreurs = e.erreurs;
await e.photo("16-verdict", true);
console.log(JSON.stringify(bilan, null, 1));
await e.ferme();
