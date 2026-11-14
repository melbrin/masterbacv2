// Essai à la main de la paillasse Titrage quand l'élève s'y prend mal, sans le guide, sur le banc d'essai local :
// un objet lâché au mauvais endroit, un outil porté sur un récipient qui n'est pas à sa place, des appuis très brefs sur
// un poussoir, une burette qui déborde, le guide demandé en cours de route, la paillasse quittée puis reprise.
// Il relève ce que la paillasse répond à chaque fois : elle doit toujours dire ce qui se passe, et quoi faire.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/titrage-maladroit.mts <dossier des captures> [largeur] [hauteur]
import type { Locator, Page } from "@playwright/test";
import { BASE, attends, glisse, maintiens, ouvre, pointEcran, type Point } from "./outils.mts";

const [sortie, largeur = "390", hauteur = "844"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/titrage-maladroit.mts <dossier des captures> [largeur] [hauteur]");
const e = await ouvre({ sortie, largeur: Number(largeur), hauteur: Number(hauteur) });
const page: Page = e.page;
const bilan: Record<string, unknown> = {};

await page.goto(`${BASE}/app/tp/banc/detartrant?graine=1`);
bilan.porte = await e.texte(".pl-porte");
await page.getByRole("button", { name: "Ouvrir la paillasse" }).click();
await attends(900);
const scene: Locator = page.locator("svg.pl-scene");
const ici = (x: number, y: number) => pointEcran(scene, { x, y });
const deplace = async (de: Point, vers: Point) => { await glisse(page, await ici(de.x, de.y), await ici(vers.x, vers.y)); await attends(250); };
const touche = async (p: Point, ms = 50) => { const q = await ici(p.x, p.y); await page.mouse.move(q.x, q.y); await page.mouse.down(); await attends(ms); await page.mouse.up(); await attends(120); };
const message = () => e.texte(".pl-message");

// les places du dessin (components/tp/paillasses/Titrage.tsx)
const PIPETTE = { x: 340, y: 212 }, BECHER = { x: 287, y: 230 }, VASE = { x: 296, y: 398 }, ERLENMEYER = { x: 296, y: 434 }, DESSOUS = { x: 108, y: 444 };
const PISSETTE = { x: 220, y: 320 }, SOUDE = { x: 226, y: 226 }, HAUT_BURETTE = { x: 108, y: 22 }, VERSER = { x: 162, y: 50 };

bilan.guide = { bouton: await page.getByRole("button", { name: "Guide" }).getAttribute("aria-pressed"), phrase: await page.locator(".pl-guide").count() };

// ----- un objet pris en main d'un toucher : la paillasse dit où il va -----
await touche(PIPETTE);
bilan.prise = await message();
await e.photo("1-pipette-en-main");
await touche(PIPETTE); // reposée
// ----- un objet lâché là où rien ne l'accepte -----
await deplace(PISSETTE, { x: 60, y: 300 });
bilan.lache = await message();
// ----- un outil porté sur le récipient glissé sous la burette -----
await deplace(ERLENMEYER, DESSOUS);
await deplace(PIPETTE, { x: 108, y: 406 });
bilan.sousLaBurette = await message();
await e.photo("2-recipient-sous-la-burette");
await touche(PISSETTE);
bilan.sansPlace = await message();
await touche(PISSETTE);
await deplace({ x: 108, y: 442 }, ERLENMEYER);
// ----- des appuis très brefs : chacun compte -----
await deplace(PIPETTE, BECHER);
await maintiens(page, await ici(327, 164), 2500); // « Aspirer » : quelques millilitres
for (let i = 0; i < 6; i++) await touche({ x: 327, y: 214 }, 40); // six petits coups sur « Vider »
await e.photo("3-petits-coups");
// ----- une burette qui déborde -----
await deplace({ x: 287, y: 192 }, PIPETTE);
await deplace(SOUDE, HAUT_BURETTE);
await maintiens(page, await ici(VERSER.x, VERSER.y), 11000);
bilan.debordement = { texte: await e.texte("svg.pl-scene text[style*='brique']"), message: await message() };
await e.photo("4-burette-pleine");
// ----- le guide demandé en cours de route : la paillasse prévient, puis l'élève confirme -----
await page.getByRole("button", { name: "Guide" }).click();
bilan.demande = { message: await message(), enMarche: await page.getByRole("button", { name: "Guide" }).getAttribute("aria-pressed") };
await page.getByRole("button", { name: "Guide" }).click();
await attends(300);
bilan.confirme = { message: await message(), enMarche: await page.getByRole("button", { name: "Guide" }).getAttribute("aria-pressed"), consigne: await e.texte(".pl-guide") };
await e.photo("5-guide-en-route");
await page.getByRole("button", { name: "Guide" }).click();
bilan.coupe = await message();
// ----- quitter, puis reprendre -----
await page.getByRole("button", { name: "Quitter la paillasse" }).click();
await attends(300);
bilan.reprise = await e.texte(".pl-porte");
await e.photo("6-porte-de-reprise", true);
await page.getByRole("button", { name: "Reprendre la manipulation" }).click();
await attends(600);
// ----- l'appel au professeur : il dit ce qui manque -----
await page.getByRole("button", { name: "J'ai fini" }).click();
bilan.appel = await e.texte(".pl-confirme span");
await page.getByRole("button", { name: "Oui, j'ai fini" }).click();
await page.waitForSelector("[data-score]", { timeout: 15000 });
await page.getByRole("button", { name: "Quitter la paillasse" }).click().catch(() => {});
await attends(300);
bilan.score = await page.locator("[data-score]").getAttribute("data-score");
bilan.verdict = await e.texte(".tp-correction");
const gestes = JSON.parse((await e.texte("[data-gestes]")) ?? "[]") as { g: string; v?: number }[];
bilan.gestes = gestes.map((g) => `${g.g}${g.v !== undefined ? ` ${g.v}` : ""}`).join(" · ");
bilan.largeur = await e.largeur();
bilan.erreurs = e.erreurs;
console.log(JSON.stringify(bilan, null, 1));
await e.ferme();
