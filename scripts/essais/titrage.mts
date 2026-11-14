// Essai à la main de la paillasse Titrage dans un vrai navigateur, sur le banc d'essai local (/app/tp/banc/detartrant).
// Il manipule comme un élève : il glisse les objets, maintient « Verser », tourne le robinet, aspire à la pipette, lit la
// loupe et note le volume. Puis il appelle le professeur et relève le jugement du serveur.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/titrage.mts <dossier des captures> [detartrant|vinaigre|serum] [graine] [volume à l'équivalence]
import type { Locator, Page } from "@playwright/test";
import { BASE, attends, glisse, maintiens, ouvre, pointEcran, type Point } from "./outils.mts";

const [sortie, tp = "detartrant", graine = "1", equivalence] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/titrage.mts <dossier des captures> [tp] [graine]");
const e = await ouvre({ sortie });
const page: Page = e.page;
const bilan: Record<string, unknown> = {};

await page.goto(`${BASE}/app/tp/banc/${tp}?graine=${graine}`);
await page.getByRole("button", { name: "Ouvrir la paillasse" }).click();
await attends(900);
const scene: Locator = page.locator("svg.pl-scene");
const ici = (x: number, y: number) => pointEcran(scene, { x, y });
const deplace = async (de: Point, vers: Point) => { await glisse(page, await ici(de.x, de.y), await ici(vers.x, vers.y)); await attends(250); };
const message = () => e.texte(".pl-message");
const touche = async (nom: string | RegExp, cle: string, fois = 1) => { const el = scene.getByRole("button", { name: nom }).or(scene.getByRole("slider", { name: nom })).first(); await el.focus(); for (let i = 0; i < fois; i++) await page.keyboard.press(cle); await attends(150); };

// les places du dessin (components/tp/paillasses/Titrage.tsx)
const HAUT_BURETTE = { x: 108, y: 22 }, DESSOUS = { x: 108, y: 444 }, SOUDE = { x: 226, y: 226 }, SOUDE_POSEE = { x: 142, y: -4 };
const PIPETTE = { x: 340, y: 212 }, BECHER = { x: 287, y: 230 }, VASE = { x: 296, y: 398 }, COMPTE = { x: 254, y: 322 }, PISSETTE = { x: 220, y: 320 };
const POUBELLE = { x: 227, y: 418 }, POUBELLE_DESSOUS = { x: 108, y: 462 }, ERLENMEYER = { x: 296, y: 434 }, BARREAU = { x: 227, y: 466 };
/** le vinaigre se suit au pH-mètre, le sérum au conductimètre : une sonde, un bécher, une courbe */
const sonde = tp !== "detartrant";
const conducti = tp === "serum";

// ----- rincer la burette -----
await deplace(POUBELLE, DESSOUS);
bilan.poubelle = await message();
await deplace(SOUDE, HAUT_BURETTE);
bilan.flacon = await message();
await e.photo("1-flacon-pose");
await maintiens(page, await ici(204, -4), 900); // « Verser », au doigt : environ 4,5 mL
await attends(200);
await e.photo("2-rincage-verse");
await touche("Robinet de la burette", "End"); // grand ouvert
bilan.robinet = await message();
await attends(600);
await e.photo("3-filet");
await attends(2600);
await touche("Robinet de la burette", "Home");
// ----- remplir, puis régler le zéro -----
await touche("Verser dans la burette", "ArrowRight", 26); // 26 mL : un millilitre au-dessus du zéro
await e.photo("4-remplie");
await touche("Robinet de la burette", "g", 20); // vingt gouttes : le niveau descend au zéro
await attends(300);
await e.photo("5-zero");
await deplace(SOUDE_POSEE, SOUDE);
await deplace(POUBELLE_DESSOUS, POUBELLE);
// ----- la prise d'essai -----
await deplace(PIPETTE, BECHER);
bilan.pipette = await message();
await touche("Aspirer dans la pipette", "ArrowRight", 21); // 10,5 mL : au-dessus du trait
await e.photo("6-au-dessus-du-trait");
await touche("Laisser redescendre le liquide de la pipette", "ArrowRight", 10); // dix fois 0,05 mL : au trait
await e.photo("7-au-trait");
await deplace({ x: 287, y: 192 }, VASE);
await touche("Vider la pipette dans le récipient", "ArrowRight", 10);
await deplace({ x: 296, y: 336 }, PIPETTE);
// ----- préparer le récipient -----
if (sonde) {
  await deplace(PISSETTE, VASE);
  await touche("Ajouter de l'eau distillée", "ArrowRight", conducti ? 10 : 8); // 50 mL, ou 40 mL
  await deplace({ x: 336, y: 376 }, PISSETTE);
  await deplace(PISSETTE, COMPTE); // rincer la sonde
  bilan.rincage = await message();
  await deplace(COMPTE, VASE); // plonger la sonde
} else {
  await deplace(COMPTE, VASE);
  for (let i = 0; i < 3; i++) await scene.getByRole("button", { name: "Ajouter une goutte d'indicateur" }).click();
  bilan.gouttes = await message();
}
await deplace(BARREAU, VASE);
await e.photo("8-recipient-pret");
await deplace(ERLENMEYER, DESSOUS);
await touche("Vitesse de l'agitateur", "ArrowRight", 3);
bilan.agitation = await message();
// ----- le titrage -----
const VE = Number(equivalence ?? (conducti ? 14.9 : sonde ? 13.85 : 10.12));
if (sonde) {
  if (conducti) {
    await touche("Robinet de la burette", "f", 22); // des ajouts réguliers d'un millilitre, bien au-delà de l'équivalence
  } else {
    await touche("Robinet de la burette", "f", Math.floor(VE - 1.5));
    await touche("Robinet de la burette", "g", Math.ceil((VE + 1 - Math.floor(VE - 1.5)) / 0.05)); // serré autour du saut
    await touche("Robinet de la burette", "f", 3);
  }
  await e.photo("9-apres-le-saut");
  await page.getByRole("button", { name: "Ouvrir la courbe" }).click();
  await attends(400);
  await e.photo("10-courbe");
  const repere = page.getByRole("slider", { name: "Repère sur la courbe" });
  await repere.focus();
  const depart = Number(await repere.getAttribute("aria-valuenow"));
  const pas = Math.round((Math.round(VE * 20) / 20 - depart) / 0.05);
  for (let i = 0; i < Math.abs(pas); i++) await page.keyboard.press(pas > 0 ? "ArrowRight" : "ArrowLeft");
  await e.photo("11-repere");
  await page.getByRole("button", { name: "Noter ce volume" }).click();
} else {
  await touche("Robinet de la burette", "f", Math.floor(VE - 0.6));
  await e.photo("9-avant-equivalence");
  const gouttes = Math.ceil(Math.round((VE - Math.floor(VE - 0.6)) * 100) / 5);
  await touche("Robinet de la burette", "g", gouttes - 1);
  await e.photo("10-derniere-goutte-avant");
  await touche("Robinet de la burette", "g", 1);
  await attends(400);
  await e.photo("11-equivalence");
  await page.getByRole("button", { name: "Noter le volume" }).click();
  await attends(300);
  await e.photo("12-saisie");
  const lu = (Math.floor(VE - 0.6) + gouttes * 0.05).toFixed(2).replace(".", ",");
  for (const c of lu) await page.locator(".pl-pave").getByRole("button", { name: c, exact: true }).click();
  await page.getByRole("button", { name: "Noter", exact: true }).click();
}
bilan.note = await message();
await e.photo("13-note");
// ----- l'appel au professeur -----
await page.getByRole("button", { name: "J'ai fini" }).click();
await page.getByRole("button", { name: "Oui, j'ai fini" }).click();
await page.waitForSelector("[data-score]", { timeout: 15000 });
await page.getByRole("button", { name: "Quitter" }).click().catch(() => {});
await attends(400);
bilan.score = await page.locator("[data-score]").getAttribute("data-score");
bilan.verdict = await e.texte(".tp-correction");
bilan.mesures = await e.texte("[data-mesures]");
bilan.largeur = await e.largeur();
bilan.erreurs = e.erreurs;
await e.photo("14-verdict", true);
console.log(JSON.stringify(bilan, null, 1));
await e.ferme();
