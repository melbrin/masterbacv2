// Essai à la main de la paillasse Titrage au doigt (touchers émulés), sur le banc d'essai local, sans le guide : un
// objet glissé jusqu'à sa cible, un appui maintenu sur un poussoir, un robinet tourné, un toucher puis un toucher.
// Les autres essais passent par la souris, que le navigateur n'interrompt jamais : celui-ci vérifie que la scène garde
// la main sur les gestes du doigt (pas de défilement ni de zoom du navigateur au milieu d'un geste).
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/titrage-doigt.mts <dossier des captures>
import type { Locator, Page } from "@playwright/test";
import { BASE, attends, glisseAuDoigt, maintiensAuDoigt, ouvre, pointEcran } from "./outils.mts";

const [sortie] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/titrage-doigt.mts <dossier des captures>");
const e = await ouvre({ sortie });
const page: Page = e.page;
const bilan: Record<string, unknown> = {};
await page.goto(`${BASE}/app/tp/banc/detartrant?graine=1`);
await page.getByRole("button", { name: "Ouvrir la paillasse" }).tap();
await attends(900);
const scene: Locator = page.locator("svg.pl-scene");
const ici = (x: number, y: number) => pointEcran(scene, { x, y });
const message = () => e.texte(".pl-message");

// glisser le bécher poubelle sous la burette, puis le flacon en haut de la burette
await glisseAuDoigt(page, await ici(227, 418), await ici(108, 444));
await attends(300);
bilan.glisser = await message();
await glisseAuDoigt(page, await ici(226, 226), await ici(108, 22));
await attends(300);
bilan.flacon = await message();
// garder le doigt sur « Verser » une seconde et demie
await maintiensAuDoigt(page, await ici(162, 50), 1500);
await attends(200);
bilan.niveau = await page.getByRole("img", { name: /Loupe sur la burette/ }).count();
// tourner le robinet du doigt : de la position fermée (poignée à droite) vers le bas
await glisseAuDoigt(page, await ici(128, 346), await ici(112, 366), 10, 20);
await attends(600);
bilan.robinet = await message();
bilan.ouverture = await page.getByRole("slider", { name: "Robinet de la burette" }).getAttribute("aria-valuenow");
await e.photo("1-au-doigt");
// toucher un objet, puis sa cible
const pipette = await ici(340, 212);
await page.touchscreen.tap(pipette.x, pipette.y);
await attends(300);
bilan.toucher = await message();
const becher = await ici(287, 230);
await page.touchscreen.tap(becher.x, becher.y);
await attends(300);
bilan.poser = await message();
bilan.largeur = await e.largeur();
bilan.erreurs = e.erreurs;
console.log(JSON.stringify(bilan, null, 1));
await e.ferme();
