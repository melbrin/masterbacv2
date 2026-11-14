// Essai à la main de la paillasse « optique » dans un vrai navigateur, sur son banc de chantier
// (/app/tp/chantier/optique?tp=focale). Il manipule comme un élève : il éteint la salle, allume la source, glisse la
// lentille de la boîte au support, glisse les supports sur le rail, finit au millimètre dans la loupe, note ses lectures
// avec le pavé de chiffres, pose la règle contre l'image. Puis il appelle le professeur et relève le jugement du serveur.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/optique.mts <dossier des captures> [focale|lunette] [graine] [soigne|fautif] [largeur] [hauteur]
import type { Locator, Page } from "@playwright/test";
import { BASE, attends, glisse, ouvre, pointEcran, type Point } from "./outils.mts";

const [sortie, tp = "focale", graineTexte = "1", facon = "soigne", largeur = "390", hauteur = "844"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/optique.mts <dossier des captures> [focale|lunette] [graine] [soigne|fautif] [largeur] [hauteur]");
const graine = Number(graineTexte);
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
const piece = (nom: string | RegExp) => scene.getByRole("slider", { name: nom }).first();
const touche = async (el: Locator, cle: string, fois = 1) => { await el.focus(); for (let i = 0; i < fois; i++) await page.keyboard.press(cle); await attends(120); };
const mm = (x: number) => Math.round(x * 10) / 10;
const fr = (x: number) => x.toFixed(1).replace(".", ",");

// les places du dessin (components/tp/paillasses/Optique.tsx)
const RAIL = { x: 15, parCm: 330 / 120 }, AXE = 252;
const X = (cm: number) => RAIL.x + cm * RAIL.parCm;
const CASE = (rang: number, sur = 4) => ({ x: 12 + (336 * (rang + 0.5)) / sur, y: 440 });
const LOUPE = { x: 280, y: 46 }, PAR_MM = 4.6;
const CENTRE = { x: 105, y: 69 }, REGLE = { x: 179, y: 154 }, PAR_CM = 20;

/** Amène une pièce du rail à une graduation, au clavier, depuis une graduation connue : un centimètre par « page », un millimètre par flèche. */
async function amene(el: Locator, de: number, vers: number) {
  const ecart = Math.round((vers - de) * 10);
  await touche(el, ecart > 0 ? "PageUp" : "PageDown", Math.floor(Math.abs(ecart) / 10));
  await touche(el, ecart > 0 ? "ArrowRight" : "ArrowLeft", Math.abs(ecart) % 10);
}
/** Tape un nombre sur le pavé de chiffres de la saisie, puis le note. */
async function note(valeur: number) {
  for (const c of fr(valeur)) await page.locator(".pl-pave").getByRole("button", { name: c, exact: true }).click();
  await page.getByRole("button", { name: "Noter", exact: true }).click();
  await attends(350);
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

if (tp === "focale") {
  // les lentilles cachées de lib/serveur/contenu/tp/focale.ts : la distance focale réelle, et les distances du protocole
  const LOTS = [{ f: 12.3, d: [30, 24, 18] }, { f: 13.6, d: [30, 24, 18] }, { f: 10.2, d: [25, 20, 15] }, { f: 9.2, d: [25, 20, 15] }, { f: 20.4, d: [50, 40, 30] }, { f: 18.6, d: [50, 40, 30] }];
  const lot = LOTS[graine % LOTS.length];
  const OBJET = 10, TAILLE = 2;
  const ecran = piece("Écran, sur le rail");
  const loupe = scene.getByRole("slider", { name: /réglage fin/ });
  const support = () => piece(/^Support de/);
  await e.photo("1-depart");

  // ----- éteindre la salle, allumer la source -----
  await scene.getByRole("switch", { name: "Lumière de la salle" }).click();
  bilan.salle = await message();
  await scene.getByRole("switch", { name: "Lampe de la source" }).click();
  bilan.lampe = await message();
  await e.photo("2-sans-lentille");

  if (facon === "fautif") {
    // ----- le piège : la lentille divergente ne forme aucune image, où que soit l'écran -----
    await deplace(CASE(0), { x: X(45), y: AXE });
    bilan.divergente = await message();
    await deplace({ x: X(105), y: AXE + 20 }, { x: X(125), y: AXE + 20 });
    await amene(ecran, 120, 70);
    await e.photo("3-divergente");
    await scene.getByRole("button", { name: /^Ranger la lentille/ }).click();
    bilan.rangee = await message();
  }

  // ----- la lentille à étudier : de la boîte au support, en la glissant -----
  await deplace(CASE(2), { x: X(45), y: AXE });
  bilan.lentille = await message();
  await e.photo("4-lentille-posee");

  const mesures = facon === "fautif" ? lot.d.slice(0, 2) : lot.d;
  let positionEcran = facon === "fautif" ? 70 : 105;
  for (const [k, d] of mesures.entries()) {
    const lentille = OBJET + d;
    const nette = mm(lentille + 1 / (1 / lot.f - 1 / d));
    // l'écran au bout du rail, puis la lentille : glissée jusqu'à sa butée contre l'objet, elle est à 13,0 cm
    await deplace({ x: X(positionEcran), y: AXE + 20 }, { x: X(125), y: AXE + 20 });
    await deplace({ x: X(k === 0 ? 45 : OBJET + mesures[k - 1]), y: AXE + 10 }, { x: X(2), y: AXE + 10 });
    bilan[`butee${k + 1}`] = await message();
    await amene(support(), 13, lentille);
    // l'écran : au clavier jusqu'à 3 cm de l'image nette, puis à la netteté
    await amene(ecran, 120, nette + 3);
    if (k === 0) await e.photo("5-image-floue");
    await amene(ecran, nette + 3, nette);
    if (k === 0) {
      // le réglage fin : glisser dans la loupe déplace l'écran de 2 mm, puis on revient
      await glisse(page, await ici(LOUPE.x - 2 * PAR_MM, LOUPE.y + 20), await ici(LOUPE.x, LOUPE.y + 20));
      await attends(200);
      await e.photo("6-loupe-2-mm-plus-loin");
      await touche(loupe, "ArrowLeft", 2);
    }
    const decalage = facon === "fautif" && k === 0 ? 2.5 : 0;
    if (decalage) await amene(ecran, nette, nette + decalage);
    await e.photo(`${7 + k}-mesure-${k + 1}-nette`);
    positionEcran = nette + decalage;
    // noter les positions : l'objet, la lentille, puis l'écran
    await page.getByRole("button", { name: "Noter les positions" }).click();
    await attends(500);
    if (k === 0) await e.photo("10-lecture-objet");
    await note(OBJET);
    await attends(300);
    if (k === 0) await e.photo("11-lecture-lentille");
    await note(facon === "fautif" && k === 1 ? lentille + 0.5 : lentille);
    if (k === 0) await e.photo("12-lecture-ecran");
    await note(positionEcran);
    bilan[`mesure${k + 1}`] = await message();
  }

  if (facon !== "fautif") {
    // ----- la règle : son zéro sur le bas de la lettre, son bord contre le montant -----
    const d = lot.d[2];
    const taille = (TAILLE * (1 / (1 / lot.f - 1 / d))) / d;
    const regle = scene.getByRole("slider", { name: /^Règle graduée/ });
    await glisse(page, await ici(REGLE.x + 9, REGLE.y - 60), await ici(REGLE.x - 11, REGLE.y - 80));
    await attends(200);
    // au clavier, une unité du dessin par flèche, depuis la place où le glissement l'a laissée : 20 à gauche, 20 plus haut
    await touche(regle, "ArrowLeft", Math.round(REGLE.x - 20 - (CENTRE.x + 0.31 * taille * PAR_CM)));
    await touche(regle, "ArrowUp", Math.round(REGLE.y - 20 - (CENTRE.y + (taille * PAR_CM) / 2)));
    await e.photo("13-regle-posee");
    await page.getByRole("button", { name: "Noter la taille" }).click();
    await attends(600);
    await e.photo("14-lecture-taille");
    await note(mm(taille));
    bilan.taille = await message();
  }
  await e.photo("15-avant-appel");
  await appelle();
} else {
  // les lentilles de lib/serveur/contenu/tp/lunette.ts : la vergence de l'objectif et celle de l'oculaire ; la boîte range
  // l'oculaire, la lentille divergente, puis l'objectif
  const LOTS = [{ C1: 2, C2: 10 }, { C1: 4, C2: 10 }, { C1: 2, C2: 8 }, { C1: 4, C2: 8 }];
  const lot = LOTS[graine % LOTS.length];
  const [f1, f2] = [100 / lot.C1, 100 / lot.C2];
  const SANS = 1.5, PREMIER = 20, SECOND = 46, BUTEE = 101;
  const regle = scene.getByRole("slider", { name: /^Règle graduée/ });
  // les deux supports de lentille, dans l'ordre du banc : le second est du côté de l'œil fictif
  const second = () => scene.getByRole("slider", { name: /upport.*sur le rail$/ }).nth(1);
  /** Pose la règle contre l'image : son zéro sur le bas de la lettre, son bord à droite de la lettre. `ou` : sa place actuelle. */
  const mesure = async (taille: number, ou: Point): Promise<Point> => {
    const vers = { x: Math.round(CENTRE.x + 0.31 * taille * PAR_CM), y: Math.round(CENTRE.y + (taille * PAR_CM) / 2) };
    await touche(regle, vers.x > ou.x ? "ArrowRight" : "ArrowLeft", Math.abs(vers.x - ou.x));
    await touche(regle, vers.y > ou.y ? "ArrowDown" : "ArrowUp", Math.abs(vers.y - ou.y));
    return vers;
  };
  await e.photo("1-depart");
  await scene.getByRole("switch", { name: "Lumière de la salle" }).click();
  await scene.getByRole("switch", { name: "Lampe de la source" }).click();
  bilan.lampe = await message();
  // ----- sans lunette : l'œil fictif forme seul l'image de l'objet lointain -----
  await glisse(page, await ici(REGLE.x + 9, REGLE.y - 60), await ici(REGLE.x - 11, REGLE.y - 80));
  await attends(200);
  let ou = { x: REGLE.x - 20, y: REGLE.y - 20 };
  if (facon !== "fautif") {
    ou = await mesure(SANS, ou);
    await e.photo("2-sans-lunette");
    await page.getByRole("button", { name: "Noter la taille" }).click();
    await attends(600);
    await e.photo("3-lecture-sans-lunette");
    await note(SANS);
    bilan.sans = await message();
    // la taille notée, la règle retourne au bord de l'écran
    ou = { x: REGLE.x, y: REGLE.y };
  }
  // ----- les deux lentilles : l'objectif du côté de l'objet, l'oculaire du côté de l'œil ; l'élève fautif les inverse -----
  await deplace(CASE(facon === "fautif" ? 0 : 2, 3), { x: X(PREMIER), y: AXE });
  bilan.objectif = await message();
  await deplace(CASE(facon === "fautif" ? 2 : 0, 3), { x: X(SECOND), y: AXE });
  bilan.oculaire = await message();
  await e.photo("4-lentilles-posees");
  // ----- le réglage : le second support glissé jusqu'à sa butée contre l'œil fictif, puis ramené au clavier -----
  const afocale = PREMIER + f1 + f2;
  await deplace({ x: X(SECOND), y: AXE + 10 }, { x: X(118), y: AXE + 10 });
  bilan.butee = await message();
  await amene(second(), BUTEE, afocale + 2);
  await e.photo("5-lunette-dereglee");
  await amene(second(), afocale + 2, facon === "fautif" ? afocale + 1 : afocale);
  await e.photo("6-lunette-reglee");
  await page.getByRole("button", { name: "Noter les positions" }).click();
  await attends(500);
  await e.photo("7-lecture-premiere-lentille");
  await note(PREMIER);
  await e.photo("8-lecture-seconde-lentille");
  await note(facon === "fautif" ? afocale + 1 : afocale);
  bilan.positions = await message();
  // ----- l'image à travers la lunette -----
  const avec = facon === "fautif" ? (SANS * f2) / f1 : (SANS * f1) / f2;
  await mesure(avec, ou);
  await e.photo("9-regle-contre-l-image");
  await page.getByRole("button", { name: "Noter la taille" }).click();
  await attends(600);
  await e.photo("10-lecture-avec-lunette");
  await note(mm(avec));
  bilan.avec = await message();
  await e.photo("11-avant-appel");
  await appelle();
}

console.log(JSON.stringify(bilan, null, 1));
await e.ferme();
