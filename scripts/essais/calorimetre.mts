// Essai à la main de la paillasse Calorimètre dans un vrai navigateur, sur son banc de chantier (/app/tp/chantier/thermo).
// Il manipule comme un élève : il porte le vase sur la balance, fait la tare, verse en maintenant l'appui, lit l'écran de
// la balance, plonge le thermomètre et attend que la loupe ne bouge plus, porte le bloc avec la pince, ferme, agite, lit
// la température finale. Il lit les appareils sur le dessin, comme un élève : l'écran de la balance, les chiffres de la loupe.
// Puis il appelle le professeur et relève le jugement du serveur.
// Deux manipulations : « soignee » (aucune faute attendue) et « baclee » (pas de tare, thermomètre lu trop tôt, bloc qui
// traîne plus de trente secondes à l'air, ni couvercle ni agitation, température finale lue avant l'équilibre).
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/calorimetre.mts <dossier des captures> [graine] [soignee|baclee] [largeur] [hauteur]
import type { Locator, Page } from "@playwright/test";
import { BASE, attends, glisse, maintiens, ouvre, pointEcran, type Point } from "./outils.mts";

const [sortie, graine = "1", mode = "soignee", largeur = "390", hauteur = "844"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/calorimetre.mts <dossier des captures> [graine] [soignee|baclee] [largeur] [hauteur]");
const e = await ouvre({ sortie, largeur: Number(largeur), hauteur: Number(hauteur) });
const page: Page = e.page;
const bilan: Record<string, unknown> = { graine, mode, fenetre: `${largeur} x ${hauteur}` };
const soignee = mode === "soignee";

await page.goto(`${BASE}/app/tp/chantier/thermo?tp=calorimetrie&graine=${graine}`);
await page.getByRole("button", { name: "Ouvrir la paillasse" }).click();
await attends(900);
const scene: Locator = page.locator("svg.pl-scene");
const ici = (x: number, y: number) => pointEcran(scene, { x, y });
const deplace = async (de: Point, vers: Point, pause = 300) => { await glisse(page, await ici(de.x, de.y), await ici(vers.x, vers.y)); await attends(pause); };
const message = () => e.texte(".pl-message");
const fr = (x: number, d: number) => x.toFixed(d).replace(".", ",");

/** Ce que la balance affiche, lu sur son écran. */
const lisBalance = async () => Number(((await scene.getByRole("img", { name: /^Balance/ }).getAttribute("aria-label")) ?? "").replace(/^Balance : /, "").replace(" g", "").replace(",", ".").replace("−", "-"));
/** Ce que montre la loupe du thermomètre : la valeur en face du haut de la colonne, d'après deux chiffres voisins de l'échelle. */
const lisThermometre = () => scene.getByRole("img", { name: /Loupe sur le thermomètre/ }).evaluate((loupe) => {
  const centre = Number(loupe.querySelector("circle.pl-loupe-bord")?.getAttribute("cy"));
  const chiffres = [...loupe.querySelectorAll("text.pl-loupe-chiffre")].map((t) => ({ v: Number((t.textContent ?? "").replace(",", ".")), y: Number(t.getAttribute("y")) - 3.5 }));
  if (chiffres.length < 2) throw new Error("la loupe ne montre pas deux chiffres");
  const [a, b] = chiffres;
  return a.v + ((centre - a.y) * (b.v - a.v)) / (b.y - a.y);
});
/** Attend que le thermomètre ne bouge plus, comme un élève qui regarde la loupe ; rend la lecture, à la demi-graduation près. */
const attendsLeThermometre = async () => {
  let avant = await lisThermometre();
  for (let i = 0; i < 120; i++) {
    await attends(700);
    const lue = await lisThermometre();
    if (Math.abs(lue - avant) < 0.004) break;
    avant = lue;
  }
  return Math.round((await lisThermometre()) * 20) / 20;
};
/**
 * Note une lecture : ouvre la saisie, tape la valeur au pavé de chiffres, valide. Sans valeur donnée, il lit le thermomètre
 * une fois la saisie ouverte : le temps du laboratoire s'arrête alors, et la loupe ne bouge plus.
 */
const note = async (quoi: "masse" | "température", connue: string | null, photo?: string) => {
  await page.getByRole("button", { name: `Noter la ${quoi}` }).click();
  await attends(500);
  if (photo) await e.photo(photo);
  const valeur = connue ?? fr(Math.round((await lisThermometre()) * 20) / 20, 2);
  for (const c of valeur) await page.locator(".pl-pave").getByRole("button", { name: c, exact: true }).click();
  await page.getByRole("button", { name: "Noter", exact: true }).click();
  await attends(450);
  return message();
};

// les places du dessin (components/tp/paillasses/Calorimetre.tsx)
const CALORIMETRE = { x: 190, y: 448 }, PLATEAU = { x: 66, y: 414 }, EAU = { x: 44, y: 276 }, AU_DESSUS = { x: 66, y: 360 }, VERSER = { x: 152, y: 338 };
const THERMOMETRE = { x: 236, y: 225 }, PLONGE = { x: 172, y: 386 }, PINCE = { x: 322, y: 268 }, BAIN = { x: 307, y: 442 }, TENU = { x: 307, y: 372 }, AU_FOND = { x: 190, y: 428 };
const COUVERCLE = { x: 152, y: 294 }, FERME = { x: 190, y: 399 }, AGITER = { x: 248, y: 350 };

await e.photo("0-paillasse");
// ----- la masse d'eau -----
await deplace(CALORIMETRE, PLATEAU);
bilan.vase = await message();
bilan.vaseVide = await lisBalance();
if (soignee) { await scene.getByRole("button", { name: /^Tare/ }).click({ force: true }); bilan.tare = await message(); }
await deplace(EAU, AU_DESSUS);
bilan.becher = await message();
await maintiens(page, await ici(VERSER.x, VERSER.y), 4200); // « Verser », au doigt : vite jusqu'à 110 g, puis doucement
await e.photo("1-eau-versee");
// le reste au clavier, par pas de 10 g, jusqu'à 140 g au moins
const verser = scene.getByRole("button", { name: "Verser l'eau froide dans le vase" });
for (let i = 0; i < 12 && (await lisBalance()) - (soignee ? 0 : Number(bilan.vaseVide)) < 140; i++) { await verser.focus(); await page.keyboard.press("ArrowRight"); await attends(120); }
const masse = await lisBalance();
bilan.masse = await note("masse", fr(masse, 1), "2-saisie-de-la-masse");
await deplace({ x: AU_DESSUS.x + 40, y: AU_DESSUS.y }, EAU);
await deplace(PLATEAU, CALORIMETRE);
bilan.retour = await message();
// ----- la température de l'eau froide -----
await deplace(THERMOMETRE, PLONGE, 150);
bilan.thermometre = await message();
await e.photo("3-le-thermometre-descend");
// soignée : il attend que la loupe ne bouge plus ; bâclée : il note tout de suite
bilan.froid = await note("température", soignee ? fr(await attendsLeThermometre(), 2) : null, "4-saisie-de-la-temperature");
// ----- le bloc -----
await deplace(PINCE, BAIN, soignee ? 150 : 36000); // bâclée : le bloc reste plus de trente secondes dans la pince ; à l'air, le temps passe au rythme réel
bilan.sorti = await message();
if (!soignee) await e.photo("5-le-bloc-traine");
await deplace(TENU, AU_FOND, 150);
bilan.plonge = await message();
if (soignee) {
  await deplace(COUVERCLE, FERME, 150);
  bilan.couvercle = await message();
  // on agite en maintenant l'appui : six secondes, une minute du laboratoire
  const doigt = await ici(AGITER.x, AGITER.y);
  await page.mouse.move(doigt.x, doigt.y);
  await page.mouse.down();
  await attends(2500);
  bilan.agite = await message();
  await e.photo("6-on-agite");
  await attends(3500);
  await page.mouse.up();
  const finale = await attendsLeThermometre();
  await e.photo("7-equilibre");
  bilan.finale = await note("température", fr(finale, 2), "8-saisie-de-la-temperature-finale");
} else {
  // ni couvercle ni agitation, et une lecture au bout de douze secondes : calorimètre ouvert, le temps passe au rythme réel
  await attends(12000);
  await e.photo("6-sans-agiter");
  bilan.finale = await note("température", null, "8-saisie-de-la-temperature-finale");
}
await e.photo("9-releves");
// ----- un geste impossible : reprendre le vase alors que le bloc est dedans -----
await deplace({ x: 205, y: 470 }, PLATEAU);
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
await e.photo("10-verdict", true);
console.log(JSON.stringify(bilan, null, 1));
await e.ferme();
