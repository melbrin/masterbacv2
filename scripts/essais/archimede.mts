// Essai à la main de la paillasse Archimède dans un vrai navigateur, sur son banc de chantier (/app/tp/chantier/thermo).
// Il manipule comme un élève : il glisse un cylindre jusqu'au crochet, glisse l'éprouvette sous le dynamomètre, fait
// descendre la potence à la souris puis au clavier, lit les deux loupes et note ses lectures au pavé de chiffres.
// Puis il appelle le professeur et relève le jugement du serveur.
// Deux manipulations : « soignee » (aucune faute attendue) et « baclee » (le cylindre touche le fond, le bord du
// ménisque est lu, le cylindre n'est pas essuyé).
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/archimede.mts <dossier des captures> [graine] [soignee|baclee] [largeur] [hauteur]
import type { Locator, Page } from "@playwright/test";
import { BASE, attends, glisse, ouvre, pointEcran, type Point } from "./outils.mts";

const [sortie, graine = "1", mode = "soignee", largeur = "390", hauteur = "844"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/archimede.mts <dossier des captures> [graine] [soignee|baclee] [largeur] [hauteur]");
const e = await ouvre({ sortie, largeur: Number(largeur), hauteur: Number(hauteur) });
const page: Page = e.page;
const bilan: Record<string, unknown> = { graine, mode, fenetre: `${largeur} x ${hauteur}` };

// la situation tirée par la graine (lib/serveur/contenu/tp/archimede.ts)
const choix = <T,>(liste: T[]): T => liste[Number(graine) % liste.length];
const solide = choix([{ id: "a", hauteur: 7, rho: 2.7, rang: 0 }, { id: "b", hauteur: 8, rho: 2.5, rang: 1 }, { id: "c", hauteur: 9, rho: 1.4, rang: 2 }]);
const rhoX = choix([0.79, 0.88, 1.15, 1.26]);
const eau = choix([57.5, 60, 55, 62.5, 52.5]), liquideX = choix([54, 51.5, 56.5, 49, 58]);
// ce que le dynamomètre et l'éprouvette doivent indiquer (lib/commun/tp/paillasses/archimede.ts)
const V = 3.5 * solide.hauteur;
const P = (solide.rho * V * 9.81) / 1000;
const apparent = (rho: number) => P - (rho * V * 9.81) / 1000;
/** La descente de la potence qui amène le bas du cylindre à la hauteur voulue au-dessus du fond, dans un liquide. */
const descentePour = (bas: number, rho: number) => 30 - solide.hauteur - apparent(rho) / 0.25 - bas;
const fr = (x: number, d: number) => x.toFixed(d).replace(".", ",");
const lu = (newtons: number) => fr(Math.round(newtons / 0.005) * 0.005, 3);

await page.goto(`${BASE}/app/tp/chantier/thermo?tp=archimede&graine=${graine}`);
await page.getByRole("button", { name: "Ouvrir la paillasse" }).click();
await attends(900);
const scene: Locator = page.locator("svg.pl-scene");
const ici = (x: number, y: number) => pointEcran(scene, { x, y });
const deplace = async (de: Point, vers: Point) => { await glisse(page, await ici(de.x, de.y), await ici(vers.x, vers.y)); await attends(300); };
const message = () => e.texte(".pl-message");
const potence = scene.getByRole("slider", { name: /Potence/ });
const touche = async (cle: string, fois = 1) => { await potence.focus(); for (let i = 0; i < fois; i++) await page.keyboard.press(cle); await attends(200); };
/** Amène la potence à une descente donnée, au clavier : des pas de 2 cm, puis de 2 mm. */
const descends = async (cm: number) => {
  const actuelle = 23 - Number(await potence.getAttribute("aria-valuenow"));
  const ecart = cm - actuelle;
  const grands = Math.trunc(ecart / 2);
  await touche(grands > 0 ? "PageDown" : "PageUp", Math.abs(grands));
  const petits = Math.round((ecart - grands * 2) / 0.2);
  await touche(petits > 0 ? "ArrowDown" : "ArrowUp", Math.abs(petits));
};
/** Note une lecture : ouvre la saisie, tape la valeur au pavé de chiffres, valide. */
const note = async (quoi: "poids" | "volume", valeur: string, photo?: string) => {
  await page.getByRole("button", { name: quoi === "poids" ? "Noter le poids" : "Noter le volume" }).click();
  await attends(500);
  if (photo) await e.photo(photo);
  for (const c of valeur) await page.locator(".pl-pave").getByRole("button", { name: c, exact: true }).click();
  await page.getByRole("button", { name: "Noter", exact: true }).click();
  await attends(450);
  return message();
};

// les places du dessin (components/tp/paillasses/Archimede.tsx)
const ETAGERE = { x: [246, 290, 334][solide.rang], y: 296 - solide.hauteur * 5 };
const CROCHET = { x: 100, y: 228 }, DESSOUS = { x: 100, y: 408 }, EAU = { x: 190, y: 414 }, LIQUIDE_X = { x: 250, y: 414 }, PAPIER = { x: 322, y: 484 }, NOIX = { x: 40, y: 18 };
const penduEnHaut = { x: 100, y: 492 - (30 - solide.hauteur - (P + 0.015) / 0.25) * 10 - solide.hauteur * 5 };

await e.photo("0-paillasse");
// ----- le poids dans l'air -----
await deplace(ETAGERE, CROCHET);
bilan.accroche = await message();
await e.photo("1-cylindre-accroche");
bilan.poids = await note("poids", lu(P), "2-saisie-du-poids");
// ----- dans l'eau -----
await deplace(EAU, DESSOUS);
bilan.eprouvette = await message();
bilan.volumeAvant = await note("volume", fr(eau + (mode === "soignee" ? 0 : 0.5), 1), "3-saisie-du-volume");
// la potence descend sous le doigt : d'abord à la souris, sur une douzaine de centimètres
await deplace(NOIX, { x: NOIX.x, y: NOIX.y + 120 });
bilan.entre = await message();
await e.photo("4-le-cylindre-entre-dans-l-eau");
if (mode === "soignee") {
  await descends(descentePour(3, 1));
  bilan.immerge = await message();
  await e.photo("5-cylindre-immerge");
  bilan.poidsEau = await note("poids", lu(apparent(1)));
  bilan.volumeApres = await note("volume", fr(eau + V, 1), "6-saisie-du-volume-immerge");
} else {
  // trop bas : le cylindre repose sur le fond, et le ressort se détend
  const descente = Math.floor((descentePour(0, 1) + 0.4) / 0.2) * 0.2;
  await descends(descente);
  bilan.immerge = await message();
  await e.photo("5-cylindre-sur-le-fond");
  bilan.poidsEau = await note("poids", lu(0.25 * (30 - solide.hauteur - descente)));
  bilan.volumeApres = await note("volume", fr(eau + V + 0.5, 1), "6-saisie-du-volume-immerge");
}
// ----- changer de liquide -----
await touche("End");
bilan.sorti = await message();
await e.photo("7-cylindre-mouille");
if (mode === "soignee") { await deplace(PAPIER, penduEnHaut); bilan.essuie = await message(); }
await deplace(DESSOUS, EAU);
await deplace(LIQUIDE_X, DESSOUS);
bilan.liquideX = await message();
await descends(descentePour(2.5, rhoX));
await e.photo("8-dans-le-liquide-x");
bilan.poidsX = await note("poids", lu(apparent(rhoX)));
await e.photo("9-releves");
// ----- un geste impossible : ranger l'éprouvette alors que le cylindre est dedans -----
await deplace(DESSOUS, LIQUIDE_X);
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
