// Essai à la main de la paillasse « ccm » dans un vrai navigateur, sur le banc de chantier (/app/tp/chantier/synthese).
// Il manipule comme un élève : il verse l'éluant, ferme la cuve, pose le crayon sur la plaque et trace la ligne de dépôt,
// trempe les capillaires et touche la plaque, glisse la plaque dans la cuve, laisse monter le front, la ressort, marque
// le front, allume la lampe UV, place la règle et son curseur, lit la loupe et note ses distances. Puis il appelle le
// professeur et relève le jugement du serveur.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/ccm.mts <dossier des captures> [soigne|fautif|noye] [graine] [largeur] [hauteur]
//   ESSAI_CALME=1 demande moins d'animations, comme le réglage du téléphone.
//   soigne : la manipulation du protocole ; fautif : cuve jamais fermée, ligne au stylo, un dépôt trop gros ;
//   noye : trop d'éluant, la ligne de dépôt trempe.
import type { Locator, Page } from "@playwright/test";
import { BASE, attends, glisse, maintiens, ouvre, pointEcran, type Point } from "./outils.mts";

const [sortie, mode = "soigne", graine = "1", largeur = "390", hauteur = "844"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/ccm.mts <dossier des captures> [soigne|fautif|noye] [graine] [largeur] [hauteur]");
const e = await ouvre({ sortie, largeur: Number(largeur), hauteur: Number(hauteur), calme: process.env.ESSAI_CALME === "1" });
const page: Page = e.page;
const bilan: Record<string, unknown> = { mode, graine, fenetre: `${largeur} x ${hauteur}` };
const photo = (nom: string) => e.photo(`${mode}-${largeur}-${nom}`);

await page.goto(`${BASE}/app/tp/chantier/synthese?tp=synthese&graine=${graine}`);
const banc = page.locator("section[data-banc]").filter({ hasText: ": ccm" });
await banc.getByRole("button", { name: "Ouvrir la paillasse" }).click();
await attends(900);
const scene: Locator = page.locator("svg.pl-scene");
const ici = (x: number, y: number) => pointEcran(scene, { x, y });
/** Glisse d'un point du dessin à un autre, puis laisse à la vue le temps de se rapprocher ou de s'éloigner. */
const deplace = async (de: Point, vers: Point) => { await glisse(page, await ici(de.x, de.y), await ici(vers.x, vers.y)); await attends(650); };
const message = () => e.texte(".pl-message");
const touche = async (nom: string | RegExp, cle: string, fois = 1) => { const el = scene.getByRole("button", { name: nom }).first(); await el.focus(); for (let i = 0; i < fois; i++) await page.keyboard.press(cle); await attends(150); };
/** Amène un curseur à la valeur voulue avec les flèches, en lisant sa position. */
async function regle(nom: RegExp, cible: number): Promise<void> {
  const el = scene.getByRole("slider", { name: nom });
  await el.focus();
  for (let i = 0; i < 300; i++) {
    const v = Number(await el.getAttribute("aria-valuenow"));
    if (Math.abs(v - cible) < 0.02) return;
    await page.keyboard.press(v < cible ? "ArrowUp" : "ArrowDown");
  }
  throw new Error(`curseur « ${nom} » : ${cible} hors d'atteinte`);
}

// les places du dessin (components/tp/paillasses/Ccm.tsx)
const CM = 30, BAS = 318;
const hauteurY = (h: number) => BAS - h * CM;
const CUVE = { x: 71, y: 211 }, FEUILLE = { x: 213, y: 213 }, SUR_PLAQUE = { x: 213, y: 189 };
const FLACON = { x: 36, y: 16 }, VERSOIR = { x: 71, y: 62 }, FLACON_PENCHE = { x: 38, y: 60 }, VERSER = { x: 113, y: 46 };
const COUVERCLE = { x: 71, y: 352 }, OUVERTURE = { x: 71, y: 100 }, COUVERCLE_POSE = { x: 71, y: 91 };
const CRAYON = { x: 190, y: 14 }, STYLO = { x: 236, y: 14 }, POT = { x: 322, y: 378 }, GESTE = { x: 316, y: 324 }, ATTENDRE = { x: 100, y: 396 };
const FIOLES: Record<string, number> = { a: 172, p: 218, r: 264 };
const REPERES: Record<string, number> = { a: 183, p: 213, r: 243 };
const VISEUR = /Curseur de la règle|Pointe du/;
/** Glisse le curseur de la règle (ou la pointe du crayon) jusqu'à une hauteur, à la souris, puis l'ajuste aux flèches. */
async function vise(h: number): Promise<void> {
  const cible = Math.round(h * 20) / 20;
  const ou = Number(await scene.getByRole("slider", { name: VISEUR }).getAttribute("aria-valuenow"));
  await glisse(page, await ici(268, hauteurY(ou)), await ici(268, hauteurY(cible)));
  await attends(200);
  await regle(VISEUR, cible);
}
/** Ce que l'élève voit sur la plaque : la hauteur du front tant qu'elle est mouillée, et le centre de chaque tache sous la lampe. */
const frontVu = async () => (105 - Number(await scene.locator("rect.pl-ccm-mouille").getAttribute("y"))) / CM;
const tachesVues = () => scene.locator("ellipse.pl-ccm-tache").evaluateAll((taches) => taches.map((t) => ({ colonne: Number(t.getAttribute("cx")), h: (105 - Number(t.getAttribute("cy"))) / 30 })));
/** Écrit une distance dans le carnet, avec le pavé de chiffres. */
async function note(quoi: RegExp, valeur: number, capture?: string): Promise<void> {
  await scene.getByRole("button", { name: quoi }).click({ force: true });
  await attends(600);
  for (const c of valeur.toFixed(2).replace(".", ",")) await page.locator(".pl-pave").getByRole("button", { name: c, exact: true }).click();
  if (capture) await photo(capture);
  await page.getByRole("button", { name: "Noter", exact: true }).click();
  await attends(600);
}

await photo("01-paillasse");
// ----- l'éluant, puis le couvercle -----
await deplace(FLACON, VERSOIR);
bilan.flacon = await message();
if (mode === "noye") {
  await touche("Verser l'éluant dans la cuve", "ArrowRight", 13); // 1,3 cm : au-dessus de la ligne de dépôt
} else {
  await maintiens(page, await ici(VERSER.x, VERSER.y), 600); // « Verser », au doigt : un peu plus d'un millimètre
  await touche("Verser l'éluant dans la cuve", "ArrowRight", 4); // puis quatre fois un millimètre
}
await attends(200);
await photo("02-eluant-a-la-loupe");
await deplace(FLACON_PENCHE, FLACON);
if (mode !== "fautif") {
  await deplace(COUVERCLE, OUVERTURE);
  bilan.cuve = await message();
}
await photo("03-cuve-prete");
// ----- la ligne de dépôt -----
await deplace(mode === "fautif" ? STYLO : CRAYON, SUR_PLAQUE);
bilan.crayon = await message();
await photo("04-crayon-sur-la-plaque");
await vise(1);
await photo("05-pointe-a-un-centimetre");
await scene.getByRole("button", { name: /Tracer un trait/ }).click({ force: true });
await attends(650);
bilan.ligne = await message();
await photo("06-ligne-tracee");
// ----- les trois dépôts : un capillaire par flacon, un contact très bref -----
for (const s of ["a", "p", "r"]) {
  await deplace(POT, { x: FIOLES[s], y: 392 });
  await deplace({ x: FIOLES[s] + 6, y: 356 }, { x: REPERES[s], y: hauteurY(1) });
  if (s === "a") { bilan.capillaire = await message(); await photo("07-capillaire-sur-le-repere"); }
  await maintiens(page, await ici(GESTE.x, GESTE.y), mode === "fautif" && s === "p" ? 1500 : 140); // « Déposer » : un contact bref, ou bien trop long
  await attends(250);
}
bilan.depot = await message();
await photo("08-trois-depots");
await page.getByRole("button", { name: "Voir toute la paillasse" }).click();
await attends(650);
// ----- la migration -----
if (mode !== "fautif") await deplace(COUVERCLE_POSE, COUVERCLE);
await deplace(FEUILLE, CUVE);
bilan.plaque = await message();
if (mode !== "fautif") await deplace(COUVERCLE, OUVERTURE);
await photo("09-plaque-dans-la-cuve");
await maintiens(page, await ici(ATTENDRE.x, ATTENDRE.y), 3000); // « Attendre », au doigt : quatre à cinq minutes
await attends(200);
await photo("10-le-front-monte");
await touche("Laisser passer le temps, en accéléré", "ArrowRight", mode === "fautif" ? 9 : 7); // puis des minutes entières
await attends(200);
await photo("11-avant-de-sortir");
if (mode !== "fautif") await deplace(COUVERCLE_POSE, COUVERCLE);
await deplace({ x: CUVE.x, y: 215 }, FEUILLE);
bilan.sortie = await message();
await photo("12-plaque-sortie");
// ----- le front, marqué tout de suite -----
const front = await frontVu();
await deplace(CRAYON, SUR_PLAQUE);
await vise(front);
await photo("13-pointe-sur-le-front");
await scene.getByRole("button", { name: /Tracer un trait/ }).click({ force: true });
await attends(650);
bilan.front = await message();
// ----- la révélation -----
await scene.getByRole("switch", { name: "Lampe UV" }).click({ force: true });
await attends(700);
bilan.lampe = await message();
await photo("14-sous-la-lampe");
// ----- les distances : le zéro de la règle sur la ligne de dépôt, le curseur sur le trait du front puis sur chaque tache -----
const taches = await tachesVues();
bilan.taches = taches.map((t) => `${t.colonne} : ${t.h.toFixed(2)}`).join(" ; ");
if (taches.length === 0) {
  // rien à mesurer : les dépôts se sont dissous
  bilan.sansTache = true;
} else {
  await glisse(page, await ici(152, 200), await ici(152, 170)); // la règle monte d'un centimètre
  await attends(200);
  await regle(/Règle/, 1);
  await photo("15-zero-sur-la-ligne");
  const lit = async (h: number) => { await vise(h); return Math.round(h * 20) / 20 - 1; };
  await note(/Noter la distance parcourue par le front/, await lit(front), "16-saisie-du-front");
  await note(/Noter la distance parcourue par la tache du dépôt A/, await lit(taches.find((t) => t.colonne === -30)!.h));
  await photo("17-curseur-sur-la-tache-A");
  await note(/Noter la distance parcourue par la tache du dépôt R/, await lit(taches.find((t) => t.colonne === 30)!.h));
  await photo("18-carnet-rempli");
}
bilan.note = await message();
await page.getByRole("button", { name: "Voir toute la paillasse" }).click();
await attends(650);
await photo("19-fin");
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
await e.photo(`${mode}-${largeur}-20-verdict`, true);
console.log(JSON.stringify(bilan, null, 1));
await e.ferme();
