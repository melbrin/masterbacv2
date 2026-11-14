// Essai à la main de la paillasse « reflux » dans un vrai navigateur, sur le banc de chantier (/app/tp/chantier/synthese).
// Il manipule comme un élève, d'un poste à l'autre : il s'équipe, prélève l'alcool à la pipette jaugée en regardant la
// loupe, mesure l'acide à l'éprouvette, ajoute la pierre ponce et le catalyseur ; il glisse chaque pièce du montage à sa
// place, tire les tuyaux, tourne le robinet d'eau et le thermostat, laisse passer le temps ; il agite et dégaze l'ampoule,
// ferme le robinet à la limite des deux phases, tare la balance, pèse, note. Puis il appelle le professeur.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/reflux.mts <dossier des captures> [soigne|fautif] [graine] [largeur] [hauteur]
//   ESSAI_CALME=1 demande moins d'animations, comme le réglage du téléphone.
//   soigne : la manipulation du protocole ; fautif : tuyaux à l'envers, pas de pierre ponce, chauffage écourté.
import type { Locator, Page } from "@playwright/test";
import { BASE, attends, glisse, maintiens, ouvre, pointEcran, type Point } from "./outils.mts";

const [sortie, mode = "soigne", graine = "1", largeur = "390", hauteur = "844"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/reflux.mts <dossier des captures> [soigne|fautif] [graine] [largeur] [hauteur]");
const fautif = mode === "fautif";
const e = await ouvre({ sortie, largeur: Number(largeur), hauteur: Number(hauteur), calme: process.env.ESSAI_CALME === "1" });
const page: Page = e.page;
const bilan: Record<string, unknown> = { mode, graine, fenetre: `${largeur} x ${hauteur}` };
const photo = (nom: string) => e.photo(`${mode}-${largeur}-${nom}`);

await page.goto(`${BASE}/app/tp/chantier/synthese?tp=synthese&graine=${graine}`);
const banc = page.locator("section[data-banc]").filter({ hasText: ": reflux" });
await banc.getByRole("button", { name: "Ouvrir la paillasse" }).click();
await attends(900);
const scene: Locator = page.locator("svg.pl-scene");
const ici = (x: number, y: number) => pointEcran(scene, { x, y });
const deplace = async (de: Point, vers: Point) => { await glisse(page, await ici(de.x, de.y), await ici(vers.x, vers.y)); await attends(300); };
const message = () => e.texte(".pl-message");
const bouton = (nom: string | RegExp) => scene.getByRole("button", { name: nom }).first();
const touche = async (nom: string | RegExp, cle: string, fois = 1) => { const el = bouton(nom).or(scene.getByRole("slider", { name: nom })).first(); await el.focus(); for (let i = 0; i < fois; i++) await page.keyboard.press(cle); await attends(150); };
const appuie = async (nom: string | RegExp, fois = 1) => { for (let i = 0; i < fois; i++) { await bouton(nom).click({ force: true }); await attends(200); } };
/** Tourne une molette du doigt : l'appui suit un arc autour de son centre, d'un angle à l'autre (0 vers le haut, sens des aiguilles d'une montre). */
async function tourne(centre: Point, rayon: number, de: number, a: number): Promise<void> {
  const point = (angle: number) => ici(centre.x + rayon * Math.sin((angle * Math.PI) / 180), centre.y - rayon * Math.cos((angle * Math.PI) / 180));
  const depart = await point(de);
  await page.mouse.move(depart.x, depart.y);
  await page.mouse.down();
  const pas = Math.max(6, Math.ceil(Math.abs(a - de) / 8));
  for (let i = 1; i <= pas; i++) { const p = await point(de + ((a - de) * i) / pas); await page.mouse.move(p.x, p.y); await attends(20); }
  await page.mouse.up();
  await attends(250);
}
/** Ce que l'élève voit : le protocole donne les volumes et la durée ; la loupe, l'éprouvette, le chronomètre, l'ampoule et la balance se lisent. */
const protocole = (await page.locator(".pl-cote ol").textContent()) ?? "";
const nombreApres = (motif: RegExp) => Number((protocole.match(motif)?.[1] ?? "").replace(",", "."));
const Va = nombreApres(/Prélever ([\d,]+) mL/), Vc = nombreApres(/Mesurer ([\d,]+) mL/), duree = nombreApres(/pendant ([\d,]+) min/);
bilan.protocole = { Va, Vc, duree };
const dansPipette = async () => Va + (Number(await scene.locator('[aria-label^="Loupe sur la pipette"] line.pl-repere').getAttribute("y1")) - 152) / 110;
const dansEprouvette = async () => { const y = await bouton(/Éprouvette graduée/).locator('rect[fill^="rgba(190"]').first().getAttribute("y").catch(() => null); return y === null ? 0 : ((42 - Number(y)) / 82) * 25; };
const chronometre = async () => { const t = (await scene.locator('[aria-label^="Chronomètre"]').getAttribute("aria-label"))?.match(/(\d+):(\d+)/); return t ? Number(t[1]) + Number(t[2]) / 60 : 0; };
const phaseAqueuse = async () => { const h = await scene.locator('rect[fill="rgba(132, 186, 240, 0.34)"][clip-path]').first().getAttribute("height").catch(() => null); return h === null ? 0 : 120 * ((Number(h) - 6) / 184) ** (1 / 0.55); };
const balance = async () => Number(((await scene.locator('[aria-label^="Balance"]').getAttribute("aria-label")) ?? "").replace("−", "-").match(/(-?[\d,]+) g/)?.[1].replace(",", "."));

// les places du dessin (components/tp/paillasses/Reflux.tsx)
const TOI = { x: 44, y: 30 }, COL = { x: 330, y: 404 }, VALET_1 = { x: 330, y: 464 }, VALET = { x: 44, y: 464 };
const PIPETTE = { x: 226, y: 230 }, ALCOOL = { x: 45, y: 462 }, DANS_ALCOOL = { x: 45, y: 430 }, SUR_BALLON = { x: 330, y: 348 };
const ACIDE = { x: 40, y: 222 }, TUBE = { x: 160, y: 392 }, ACIDE_PENCHE = { x: 194, y: 368 }, EPROUVETTE = { x: 160, y: 450 }, PONCE = { x: 170, y: 240 }, SULFURIQUE = { x: 104, y: 236 };
const AXE = 180, SUPPORT = { x: 276, y: 376 }, CHAUFFE = { x: 276, y: 300 }, PINCE = { x: 270, y: 92 }, REFRIGERANT = { x: 330, y: 172 };
const BORNES = { robinet: { x: 278, y: 34 }, evier: { x: 292, y: 462 }, bas: { x: 204, y: 308 }, haut: { x: 204, y: 192 } };
const AMPOULE = { x: 166, y: 410 }, ENTONNOIR = { x: 166, y: 176 }, BOUCHON = { x: 256, y: 96 }, SOUS = { x: 166, y: 475 }, POUBELLE = { x: 232, y: 475 }, ETAGERE = { x: 306, y: 300 }, PLATEAU = { x: 306, y: 393 };

await photo("01-preparation");
// ----- poste 1 : s'équiper -----
for (const x of [120, 170, 220]) await deplace({ x, y: 18 }, TOI);
bilan.equipe = await message();
await photo("02-equipe");
// ----- l'alcool, à la pipette jaugée : au-dessus du trait, puis le bas du ménisque sur le trait -----
await deplace(PIPETTE, ALCOOL);
bilan.pipette = await message();
await maintiens(page, await ici(97, 396), 2500); // « Aspirer », au doigt
while (await dansPipette() < Va + 0.2) await touche("Aspirer dans la pipette", "ArrowRight");
await photo("03-au-dessus-du-trait");
while (await dansPipette() > Va + 0.04) await touche("Laisser redescendre le liquide de la pipette", "ArrowRight");
await photo("04-au-trait");
await deplace(DANS_ALCOOL, COL);
await maintiens(page, await ici(284, 348), 1200); // « Vider », au doigt
await touche("Vider la pipette dans le ballon", "ArrowRight", Math.ceil(Va));
await deplace(SUR_BALLON, PIPETTE);
// ----- l'acide, à l'éprouvette lue à la loupe -----
await deplace(ACIDE, TUBE);
bilan.acide = await message();
await maintiens(page, await ici(250, 420), 1800); // « Verser », au doigt
while (await dansEprouvette() < Vc - 0.5) await touche("Verser l'acide dans l'éprouvette", "ArrowRight");
await attends(200);
await photo("05-eprouvette-a-la-loupe");
await deplace(ACIDE_PENCHE, ACIDE);
await deplace(EPROUVETTE, COL);
bilan.eprouvette = await message();
// ----- la pierre ponce et le catalyseur -----
if (!fautif) { await deplace(PONCE, COL); bilan.ponce = await message(); }
await deplace(SULFURIQUE, COL);
await appuie("Ajouter une goutte d'acide sulfurique", 5);
bilan.gouttes = await message();
await photo("06-ballon-pret");
await deplace({ x: 330, y: 372 }, SULFURIQUE);
// ----- poste 2 : le montage, pièce par pièce -----
await page.getByRole("button", { name: "Aller au montage" }).click();
await attends(600);
await photo("07-montage-a-faire");
await deplace(SUPPORT, { x: AXE, y: 484 });
await deplace(CHAUFFE, { x: AXE, y: 464 });
await deplace(PINCE, { x: 145, y: 352 });
await deplace(VALET, { x: AXE, y: 402 });
bilan.ballon = await message();
await touche("Molette du support élévateur", "End");
bilan.support = await message();
await deplace(REFRIGERANT, { x: AXE, y: 328 });
await deplace(PINCE, { x: 145, y: 250 });
await photo("08-montage-fait");
// ----- les tuyaux : l'eau arrive en bas et repart en haut (ou l'inverse, pour l'élève distrait), puis le robinet d'eau -----
await deplace(BORNES.robinet, fautif ? BORNES.haut : BORNES.bas);
await deplace(fautif ? BORNES.bas : BORNES.haut, BORNES.evier);
bilan.tuyaux = await message();
await tourne({ x: 322, y: 2 }, 15, -135, -45); // le robinet d'eau, tourné du doigt : un cran
await touche("Robinet d'eau", "Home");
await touche("Robinet d'eau", "ArrowRight");
bilan.eau = await message();
// ----- le chauffage : le thermostat tourné du doigt, puis le temps qui passe -----
await tourne({ x: 48, y: 152 }, 16, -135, 45); // de 0 à 4
await touche("Thermostat du chauffe-ballon", "Home");
await touche("Thermostat du chauffe-ballon", "ArrowRight", 4);
bilan.chauffage = await message();
await photo("09-ebullition");
await maintiens(page, await ici(48, 50), 4000); // « Attendre », au doigt : une douzaine de minutes
await attends(200);
await photo("10-reflux");
const voulue = fautif ? 20 : duree;
while (await chronometre() < voulue) await touche("Laisser passer le temps, en accéléré", "ArrowRight");
bilan.chronometre = await chronometre();
await photo("11-fin-du-chauffage");
// ----- arrêter, descendre le support, laisser refroidir -----
await touche("Thermostat du chauffe-ballon", "Home");
await touche("Molette du support élévateur", "Home");
bilan.descente = await message();
await touche("Laisser passer le temps, en accéléré", "ArrowRight", 5);
await touche("Robinet d'eau", "Home");
await photo("12-refroidi");
await deplace({ x: AXE, y: 402 }, VALET);
bilan.demontage = await message();
// ----- poste 3 : l'ampoule à décanter -----
await page.getByRole("button", { name: "Aller à la séparation" }).click();
await attends(600);
await photo("13-separation-a-faire");
await deplace(VALET, ENTONNOIR);
bilan.transvase = await message();
await photo("14-melange-dans-l-ampoule");
await deplace(BOUCHON, ENTONNOIR);
for (let i = 0; i < 3; i++) { await appuie("Agiter l'ampoule"); if (i === 0) await photo("15-agitee"); await appuie(/Dégazer/); }
bilan.lavage = await message();
await maintiens(page, await ici(48, 50), 600); // « Attendre », au doigt, puis des minutes entières
await touche("Laisser passer le temps, en accéléré", "ArrowRight", 3);
await photo("16-deux-phases");
await deplace({ x: AMPOULE.x, y: 184 }, BOUCHON);
// ----- la phase aqueuse, dans le bécher poubelle : au filet, puis goutte à goutte jusqu'à la limite -----
await deplace(POUBELLE, SOUS);
await tourne(AMPOULE, 18, 90, 170); // le robinet de l'ampoule, tourné du doigt : au filet
bilan.robinet = await message();
await attends(1500);
await photo("17-au-filet");
await touche("Robinet de l'ampoule à décanter", "Home");
while (await phaseAqueuse() > 7) await touche("Robinet de l'ampoule à décanter", "f");
while (await phaseAqueuse() > 0.05) await touche("Robinet de l'ampoule à décanter", "g");
await photo("18-a-la-limite");
// ----- la tare, la phase organique, la pesée -----
await deplace(ETAGERE, PLATEAU);
await appuie("Tare de la balance");
bilan.tare = await balance();
await deplace(PLATEAU, SOUS);
await touche("Robinet de l'ampoule à décanter", "f", 5);
await photo("19-produit-recueilli");
await deplace(SOUS, PLATEAU);
const masse = await balance();
bilan.balance = masse;
await page.getByRole("button", { name: "Noter la masse" }).click();
await attends(500);
for (const c of masse.toFixed(2).replace(".", ",")) await page.locator(".pl-pave").getByRole("button", { name: c, exact: true }).click();
await photo("20-saisie-de-la-masse");
await page.getByRole("button", { name: "Noter", exact: true }).click();
await attends(500);
bilan.note = await message();
await photo("21-pesee");
// ----- l'appel au professeur -----
await page.getByRole("button", { name: "J'ai fini" }).click();
await page.getByRole("button", { name: "Oui, j'ai fini" }).click();
await banc.locator("[data-score]").waitFor({ state: "attached", timeout: 15000 });
await page.getByRole("button", { name: "Quitter" }).click().catch(() => {});
await attends(400);
bilan.score = await banc.locator("[data-score]").getAttribute("data-score");
bilan.verdict = (await banc.locator(".tp-correction").innerText()).replace(/\s+/g, " ").trim();
bilan.mesures = await banc.locator("[data-mesures]").textContent();
bilan.gestes = (await banc.locator("[data-gestes]").textContent())?.length;
bilan.largeur = await e.largeur();
bilan.erreurs = e.erreurs;
await e.photo(`${mode}-${largeur}-22-verdict`, true);
console.log(JSON.stringify(bilan, null, 1));
await e.ferme();
