// Essai à la main de la paillasse « diffraction » dans un vrai navigateur, sur son banc de chantier
// (/app/tp/chantier/optique?tp=cheveu ou tp=young). Il manipule comme un élève : il glisse le laser sur son support,
// l'allume, glisse les diapositives de la boîte dans le support, glisse l'écran sur le rail, pose les deux curseurs sur
// la figure, note ses lectures avec le pavé de chiffres. Puis il appelle le professeur et relève le jugement du serveur.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/diffraction.mts <dossier des captures> [cheveu|young] [graine] [soigne|fautif] [largeur] [hauteur]
import type { Locator, Page } from "@playwright/test";
import { BASE, attends, glisse, ouvre, pointEcran, type Point } from "./outils.mts";

const [sortie, tp = "cheveu", graineTexte = "1", facon = "soigne", largeur = "390", hauteur = "844"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/diffraction.mts <dossier des captures> [cheveu|young] [graine] [soigne|fautif] [largeur] [hauteur]");
const graine = Number(graineTexte);
const fautif = facon === "fautif";
const e = await ouvre({ sortie, largeur: Number(largeur), hauteur: Number(hauteur) });
const page: Page = e.page;
const bilan: Record<string, unknown> = { tp, graine, facon, fenetre: `${largeur} × ${hauteur}` };

await page.goto(`${BASE}/app/tp/chantier/optique?tp=${tp}&graine=${graine}`);
await page.getByRole("button", { name: "Ouvrir la paillasse" }).click();
await attends(900);
const scene: Locator = page.locator("svg.pl-scene");
const ici = (x: number, y: number) => pointEcran(scene, { x, y });
const deplace = async (de: Point, vers: Point) => { await glisse(page, await ici(de.x, de.y), await ici(vers.x, vers.y)); await attends(250); };
const message = () => e.texte(".pl-message");
const touche = async (el: Locator, cle: string, fois = 1) => { await el.focus(); for (let i = 0; i < fois; i++) await page.keyboard.press(cle); await attends(120); };
const fr = (x: number, d = 1) => x.toFixed(d).replace(".", ",");
const dixieme = (x: number) => Math.round(x * 10) / 10;

// les places du dessin (components/tp/paillasses/Diffraction.tsx)
const AXE = 262, RAIL = { x: 86, parCm: 260 / 200 }, ECHELLE = { x: 12, parMm: 2.8 }, FACE = { y: -26, h: 118 };
const XR = (cm: number) => RAIL.x + cm * RAIL.parCm;
const XE = (mm: number) => ECHELLE.x + mm * ECHELLE.parMm;
const SUPPORT = { x: 40, y: AXE }, TABLE = { x: 74, y: 426 }, PORTE = { x: RAIL.x, y: AXE };
const CASE = (rang: number) => ({ x: 146 + (206 * ((rang % 3) + 0.5)) / 3, y: 374 + 24 + 62 * Math.floor(rang / 3) });
const ecran = scene.getByRole("slider", { name: "Écran, sur le rail" });
const curseur = (k: 1 | 2) => scene.getByRole("slider", { name: `Curseur ${k} de l'écran` });
const ONGLET = (k: 1 | 2, mm: number) => ({ x: XE(mm), y: k === 1 ? FACE.y + 8 : FACE.y + FACE.h + 8 });

/** Tape un nombre sur le pavé de chiffres de la saisie, puis le note. */
async function note(texte: string) {
  for (const c of texte) await page.locator(".pl-pave").getByRole("button", { name: c, exact: true }).click();
  await page.getByRole("button", { name: "Noter", exact: true }).click();
  await attends(350);
}
/** Amène un curseur à une graduation, depuis une graduation connue, au clavier : un millimètre par « page », un dixième par flèche. */
async function amene(k: 1 | 2, de: number, vers: number) {
  const ecart = Math.round((vers - de) * 10);
  await touche(curseur(k), ecart > 0 ? "PageUp" : "PageDown", Math.floor(Math.abs(ecart) / 10));
  await touche(curseur(k), ecart > 0 ? "ArrowRight" : "ArrowLeft", Math.abs(ecart) % 10);
}
/** Glisse un curseur par son onglet jusqu'au bord de la graduation, puis l'amène au clavier à la graduation voulue. */
async function pose(k: 1 | 2, depuis: number, vers: number) {
  await deplace(ONGLET(k, depuis), ONGLET(k, k === 1 ? -6 : 126));
  await amene(k, k === 1 ? 0 : 120, vers);
}
/** Place l'écran : glissé jusqu'au bout du rail, puis ramené au clavier, un centimètre par « page ». */
async function place(D: number) {
  await deplace({ x: XR(100), y: AXE + 10 }, { x: XR(215), y: AXE + 10 });
  await touche(ecran, "PageDown", 200 - D);
}
/** Appelle le professeur et relève son jugement. */
async function appelle() {
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
  await e.photo("verdict", true);
}

await e.photo("1-depart");
// ----- le laser : fixé sur son support, puis allumé. L'élève fautif l'allume d'abord sur la table. -----
if (fautif) {
  await scene.getByRole("button", { name: "Allumer le laser" }).click();
  bilan.danger = await message();
  await attends(300);
  await e.photo("2-laser-allume-sur-la-table");
}
await deplace(TABLE, SUPPORT);
bilan.fixe = await message();
if (!fautif) await scene.getByRole("button", { name: "Allumer le laser" }).click();
bilan.laser = await message();
await e.photo("3-laser-fixe-allume");
// ----- l'écran à 150 cm, et la distance lue à la loupe -----
const D = 150;
await place(D);
await e.photo("4-ecran-place");
await page.getByRole("button", { name: "Noter la distance" }).click();
await attends(600);
await e.photo("5-lecture-distance");
await note(fr(fautif ? D + 0.5 : D));
bilan.distance = await message();
const positions: [number, number] = [45, 75];

if (tp === "cheveu") {
  // la boîte de lib/serveur/contenu/tp/cheveu.ts : le rang de chaque diapositive, sa largeur en micromètres ; le cheveu caché
  const LAMBDA = 650, CHEVEUX = [52, 68, 91, 57, 74, 86];
  const DIAPOS: [string, number, number][] = [["fente de 40 µm", 2, 40], ["fente de 60 µm", 4, 60], ["fente de 100 µm", 0, 100], ["cheveu", 3, CHEVEUX[graine % CHEVEUX.length]]];
  let distance = D;
  for (const [k, [nom, rang, a]] of (fautif ? DIAPOS.filter((d) => d[1] !== 4) : DIAPOS).entries()) {
    if (fautif && nom === "cheveu") {
      // l'écran déplacé entre l'étalonnage et la mesure du cheveu
      await touche(ecran, "PageUp", 20);
      distance = D + 20;
    }
    await deplace(CASE(rang), PORTE);
    bilan[`diapo${k + 1}`] = await message();
    const L = (2 * LAMBDA * distance) / (100 * a) * (fautif && nom === "cheveu" ? 2 : 1);
    const cibles: [number, number] = [dixieme(60 - L / 2), dixieme(60 + L / 2)];
    if (k === 0) { await e.photo("6-figure-avant-les-curseurs"); await pose(1, positions[0], cibles[0]); await pose(2, positions[1], cibles[1]); }
    else { await amene(1, positions[0], cibles[0]); await amene(2, positions[1], cibles[1]); }
    positions[0] = cibles[0];
    positions[1] = cibles[1];
    await e.photo(`${7 + k}-${nom.replace(/ /g, "-")}`);
    await page.getByRole("button", { name: "Noter la mesure" }).click();
    await attends(600);
    if (k === 0 || nom === "cheveu") await e.photo(`${11 + (k === 0 ? 0 : 1)}-lecture-${nom.replace(/ /g, "-")}`);
    // l'élève lit chaque curseur au demi-millimètre, puis fait la différence
    await note(fr(Math.round((cibles[1] - cibles[0]) * 2) / 2));
    bilan[`mesure${k + 1}`] = await message();
  }
} else {
  // la boîte de lib/serveur/contenu/tp/young.ts : les fentes écartées de 0,30 mm sont au rang 2, la fente simple de 70 µm au rang 1
  const DIODES = [660, 635, 685];
  const lambda = DIODES[graine % DIODES.length];
  const i = (lambda * D * 1e-5) / 0.3;
  if (fautif) {
    // le piège : une fente seule ne donne pas de franges
    await deplace(CASE(1), PORTE);
    bilan.fente = await message();
    await e.photo("6-fente-simple");
  }
  await deplace(CASE(2), PORTE);
  bilan.diapo = await message();
  await e.photo("7-franges");
  // douze interfranges d'un coup ; l'élève fautif n'en mesure que deux, et compte les franges au lieu des intervalles
  const n = fautif ? 2 : 12;
  const cibles: [number, number] = [dixieme(60 - (n * i) / 2), dixieme(60 + (n * i) / 2)];
  await pose(1, positions[0], cibles[0]);
  await pose(2, positions[1], cibles[1]);
  await e.photo("8-curseurs-poses");
  await page.getByRole("button", { name: "Noter la mesure" }).click();
  await attends(600);
  await e.photo("9-lecture-ecart");
  await note(fr(Math.round((cibles[1] - cibles[0]) * 2) / 2));
  await attends(300);
  await e.photo("10-compte-des-interfranges");
  await note(String(fautif ? n + 1 : n));
  bilan.mesure = await message();
}

if (fautif) {
  // le laser repris sans l'éteindre
  await deplace(SUPPORT, TABLE);
  bilan.repris = await message();
} else {
  await scene.getByRole("button", { name: "Éteindre le laser" }).click();
  bilan.eteint = await message();
}
await e.photo("14-avant-appel");
await appelle();
console.log(JSON.stringify(bilan, null, 1));
await e.ferme();
