// Essai à la main de la paillasse Électrolyse dans un vrai navigateur, sur son banc de chantier (/app/tp/chantier/thermo).
// Il manipule comme un élève : il porte la plaque sur la balance, plonge les plaques dans la cuve, tire les fils d'une
// borne à l'autre, bascule l'interrupteur, tourne la molette du générateur à la souris en lisant l'ampèremètre, lance le
// chronomètre, maintient « Avance rapide », puis rince, sèche et pèse de nouveau la plaque. Il lit les appareils sur
// leurs écrans, comme un élève. Puis il appelle le professeur et relève le jugement du serveur.
// Trois manipulations : « soignee » (aucune faute attendue), « baclee » (chronomètre lancé en retard, plaque pesée
// encore mouillée) et « inverse » (la plaque pesée reliée à la borne + du générateur : elle perd de la masse).
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/electrolyse.mts <dossier des captures> [graine] [soignee|baclee|inverse] [largeur] [hauteur]
import type { Locator, Page } from "@playwright/test";
import { BASE, attends, glisse, ouvre, pointEcran, type Point } from "./outils.mts";

const [sortie, graine = "1", mode = "soignee", largeur = "390", hauteur = "844"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/electrolyse.mts <dossier des captures> [graine] [soignee|baclee|inverse] [largeur] [hauteur]");
const e = await ouvre({ sortie, largeur: Number(largeur), hauteur: Number(hauteur) });
const page: Page = e.page;
const bilan: Record<string, unknown> = { graine, mode, fenetre: `${largeur} x ${hauteur}` };
const soignee = mode === "soignee";
// la situation tirée par la graine (lib/serveur/contenu/tp/electrolyse.ts)
const choix = <T,>(liste: T[]): T => liste[Number(graine) % liste.length];
const intensite = choix([0.8, 0.6, 1, 0.5]), duree = choix([1200, 900, 1500]);

await page.goto(`${BASE}/app/tp/chantier/thermo?tp=electrolyse&graine=${graine}`);
await page.getByRole("button", { name: "Ouvrir la paillasse" }).click();
await attends(900);
const scene: Locator = page.locator("svg.pl-scene");
const ici = (x: number, y: number) => pointEcran(scene, { x, y });
const deplace = async (de: Point, vers: Point) => { await glisse(page, await ici(de.x, de.y), await ici(vers.x, vers.y)); await attends(300); };
const message = () => e.texte(".pl-message");
const fr = (x: number, d: number) => x.toFixed(d).replace(".", ",");

/** Ce qu'affiche l'écran d'un appareil : la balance, l'ampèremètre, le générateur, le chronomètre. */
const ecran = async (appareil: string) => Number(((await scene.getByRole("img", { name: new RegExp(`^${appareil}`) }).getAttribute("aria-label")) ?? "").replace(/^[^:]*: /, "").replace(/[^\d,−-]/g, "").replace(",", ".").replace("−", "-"));
/** Tire un fil d'une borne à une autre. */
const fil = async (de: Point, vers: Point) => { await glisse(page, await ici(de.x, de.y), await ici(vers.x, vers.y)); await attends(250); return message(); };
/** Retire un fil : on le touche, puis on touche la croix qui apparaît en son milieu. */
const retire = async (nom: RegExp) => {
  await scene.getByRole("button", { name: nom }).first().focus();
  await page.keyboard.press("Enter");
  await attends(150);
  await scene.getByRole("button", { name: /^Retirer le fil/ }).click({ force: true });
  await attends(250);
};
/** Tourne la molette du générateur du doigt, le long de son cadran, jusqu'à la tension voulue ; « fin » : ajuste ensuite au clavier, cran par cran. */
const regle = async (volts: number, fin: boolean) => {
  const molette = scene.getByRole("slider", { name: "Tension du générateur" });
  const point = (v: number) => { const angle = ((-135 + (v / 12) * 270) * Math.PI) / 180; return ici(98 + 14 * Math.sin(angle), -8 - 14 * Math.cos(angle)); };
  const de = Number(await molette.getAttribute("aria-valuenow"));
  const depart = await point(de);
  await page.mouse.move(depart.x, depart.y);
  await page.mouse.down();
  for (let k = 1; k <= 16; k++) { const p = await point(de + ((volts - de) * k) / 16); await page.mouse.move(p.x, p.y); await attends(15); }
  await page.mouse.up();
  await attends(200);
  if (!fin) return;
  await molette.focus();
  for (let i = 0; i < 40; i++) {
    const ecart = Math.round((volts - (await ecran("Générateur"))) * 10);
    if (ecart === 0) break;
    await page.keyboard.press(ecart > 0 ? "ArrowRight" : "ArrowLeft");
    await attends(60);
  }
};
/** Note une lecture : choisit l'appareil, tape la valeur au pavé de chiffres, valide. */
const note = async (quoi: "La masse" | "L'intensité" | "La durée", valeur: string, photo?: string) => {
  await page.getByRole("button", { name: "Noter une mesure" }).click();
  await attends(300);
  await page.getByRole("button", { name: quoi, exact: true }).click();
  await attends(500);
  if (photo) await e.photo(photo);
  for (const c of valeur) await page.locator(".pl-pave").getByRole("button", { name: c, exact: true }).click();
  await page.getByRole("button", { name: "Noter", exact: true }).click();
  await attends(400);
  return message();
};

// les places du dessin (components/tp/paillasses/Electrolyse.tsx)
const PRISES = { plus: { x: 98, y: 54 }, moins: { x: 30, y: 54 }, k1: { x: 156, y: 54 }, k2: { x: 204, y: 54 }, a: { x: 262, y: 54 }, com: { x: 328, y: 54 }, p1: { x: 154, y: 185 }, p2: { x: 206, y: 185 } };
const SUPPORT = [{ x: 34, y: 222 }, { x: 78, y: 222 }], CUVE = [{ x: 154, y: 240 }, { x: 206, y: 240 }], BALANCE = { x: 72, y: 437 };
const PISSETTE = { x: 268, y: 262 }, SECHE = { x: 320, y: 266 }, AVANCE = { x: 180, y: 462 };

await e.photo("0-paillasse");
// ----- la pesée de départ -----
await deplace(SUPPORT[0], BALANCE);
bilan.pesee = await message();
const m1 = await ecran("Balance");
bilan.masseAvant = await note("La masse", fr(m1, 3), "1-saisie-de-la-masse");
// ----- le montage : les deux plaques dans la cuve, la boucle en série -----
await deplace(BALANCE, CUVE[0]);
await deplace(SUPPORT[1], CUVE[1]);
bilan.cuve = await message();
await fil(PRISES.plus, PRISES.k1);
await fil(PRISES.k2, PRISES.a);
// soignée ou bâclée : la plaque 1 du côté de la borne − ; inverse : du côté de la borne +
await fil(PRISES.com, mode === "inverse" ? PRISES.p1 : PRISES.p2);
bilan.boucle = await fil(mode === "inverse" ? PRISES.p2 : PRISES.p1, PRISES.moins);
await e.photo("2-circuit-monte");
// ----- le courant -----
await scene.getByRole("switch", { name: "Interrupteur" }).click({ force: true });
bilan.interrupteur = await message();
if (soignee) await scene.getByRole("button", { name: "Lancer le chronomètre" }).click({ force: true });
const volts = Math.round(intensite * choix([7.5, 6.4, 8.6]) * 10) / 10;
await regle(volts, soignee);
bilan.amperemetre = await ecran("Ampèremètre");
await e.photo("3-intensite-reglee");
bilan.intensite = await note("L'intensité", fr(Math.abs(Number(bilan.amperemetre)), 2), "4-saisie-de-l-intensite");
// ----- le temps de l'électrolyse, en avance rapide -----
const avance = async (jusque: number, photo?: string) => {
  const doigt = await ici(AVANCE.x, AVANCE.y);
  await page.mouse.move(doigt.x, doigt.y);
  await page.mouse.down();
  if (photo) { await attends(1500); await e.photo(photo); }
  for (let i = 0; i < 600 && (await ecran("Chronomètre")) < jusque; i++) await attends(40);
  await page.mouse.up();
  await attends(200);
};
if (!soignee) {
  // bâclée : le chronomètre n'est lancé qu'après une seconde d'avance rapide, deux minutes du laboratoire
  const doigt = await ici(AVANCE.x, AVANCE.y);
  await page.mouse.move(doigt.x, doigt.y);
  await page.mouse.down();
  await attends(1000);
  await page.mouse.up();
  await scene.getByRole("button", { name: "Lancer le chronomètre" }).click({ force: true });
}
await avance(duree - 20, "5-le-depot-grandit");
await scene.getByRole("switch", { name: "Interrupteur" }).click({ force: true });
await scene.getByRole("button", { name: "Arrêter le chronomètre" }).click({ force: true });
bilan.arret = await message();
bilan.duree = await note("La durée", String(await ecran("Chronomètre")), "6-saisie-de-la-duree");
await e.photo("7-apres-l-electrolyse");
// ----- la pesée finale : ôter le fil, rincer, sécher, peser -----
await retire(/plaque 1/);
await deplace(CUVE[0], SUPPORT[0]);
bilan.sortie = await message();
await e.photo("8-plaque-mouillee");
if (soignee) {
  await deplace(PISSETTE, SUPPORT[0]);
  bilan.rincage = await message();
  await deplace(SECHE, SUPPORT[0]);
  bilan.sechage = await message();
}
await deplace(SUPPORT[0], BALANCE);
const m2 = await ecran("Balance");
bilan.masseApres = await note("La masse", fr(m2, 3), "9-saisie-de-la-masse-finale");
await e.photo("10-releves");
// ----- un geste impossible : sortir la plaque 2 de la cuve alors qu'un fil y est pincé -----
await deplace(CUVE[1], SUPPORT[1]);
bilan.refus = await message();
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
await e.photo("11-verdict", true);
console.log(JSON.stringify(bilan, null, 1));
await e.ferme();
