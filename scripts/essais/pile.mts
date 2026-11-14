// Essai à la main de la paillasse Pile dans un vrai navigateur, sur son banc de chantier (/app/tp/chantier/thermo).
// Il manipule comme un élève : il glisse chaque lame dans son bécher, pose le pont salin, tourne le sélecteur du
// multimètre à la souris, tire les fils d'une borne à une lame, lit l'afficheur, note la tension et la borne positive.
// Puis il appelle le professeur et relève le jugement du serveur.
// Deux manipulations : « soignee » (aucune faute attendue) et « baclee » (pont salin oublié, calibre trop grand, signe
// mal lu, puis l'ampèremètre aux bornes de la pile : le fusible saute).
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/pile.mts <dossier des captures> [graine] [soignee|baclee] [largeur] [hauteur]
import type { Locator, Page } from "@playwright/test";
import { BASE, attends, glisse, ouvre, pointEcran, type Point } from "./outils.mts";

const [sortie, graine = "1", mode = "soignee", largeur = "390", hauteur = "844"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/pile.mts <dossier des captures> [graine] [soignee|baclee] [largeur] [hauteur]");
const e = await ouvre({ sortie, largeur: Number(largeur), hauteur: Number(hauteur) });
const page: Page = e.page;
const bilan: Record<string, unknown> = { graine, mode, fenetre: `${largeur} x ${hauteur}` };
const soignee = mode === "soignee";
// le troisième métal, tiré par la graine (lib/serveur/contenu/tp/pile.ts)
const troisieme = ["fer", "argent", "nickel", "étain"][Number(graine) % 4];

await page.goto(`${BASE}/app/tp/chantier/thermo?tp=pile&graine=${graine}`);
await page.getByRole("button", { name: "Ouvrir la paillasse" }).click();
await attends(900);
const scene: Locator = page.locator("svg.pl-scene");
const ici = (x: number, y: number) => pointEcran(scene, { x, y });
const deplace = async (de: Point, vers: Point) => { await glisse(page, await ici(de.x, de.y), await ici(vers.x, vers.y)); await attends(300); };
const message = () => e.texte(".pl-message");
const fr = (x: number, d: number) => x.toFixed(d).replace(".", ",");

// les places du dessin (components/tp/paillasses/Pile.tsx)
const AXES = [62, 180, 298];
const SELECTEUR = { x: 104, y: 80 }, PRISES = { com: { x: 48, y: 138 }, v: { x: 104, y: 138 }, a: { x: 160, y: 138 } };
const plateau = (i: number) => ({ x: AXES[i] + 12, y: 482 }), becher = (i: number) => ({ x: AXES[i], y: 384 }), lame = (i: number) => ({ x: AXES[i], y: 341 });
const PONT_RANGE = { x: 300, y: 112 }, PONTS = { "0-1": { x: 121, y: 342 }, "1-2": { x: 239, y: 342 }, "0-2": { x: 180, y: 314 } };

/** Tourne le sélecteur du multimètre du doigt, le long de son cadran, jusqu'à la position voulue (0 : arrêt ; 3 : calibre 2 V). */
const tourne = async (vers: number) => {
  const selecteur = scene.getByRole("slider", { name: "Sélecteur du multimètre" });
  const de = Number(await selecteur.getAttribute("aria-valuenow"));
  const point = (position: number) => { const angle = ((-135 + position * 45) * Math.PI) / 180; return ici(SELECTEUR.x + 18 * Math.sin(angle), SELECTEUR.y - 18 * Math.cos(angle)); };
  const depart = await point(de);
  await page.mouse.move(depart.x, depart.y);
  await page.mouse.down();
  for (let k = 1; k <= 12; k++) { const p = await point(de + ((vers - de) * k) / 12); await page.mouse.move(p.x, p.y); await attends(15); }
  await page.mouse.up();
  await attends(250);
  return message();
};
/** Retire un fil : on le touche, puis on touche la croix qui apparaît en son milieu. */
const retire = async (nom: RegExp) => {
  await scene.getByRole("button", { name: nom }).first().focus();
  await page.keyboard.press("Enter");
  await attends(150);
  await scene.getByRole("button", { name: /^Retirer le fil/ }).click({ force: true });
  await attends(250);
};
/** Ce que montre l'afficheur du multimètre : son texte, et la tension avec son signe quand il en montre une. */
const lis = async () => {
  const texte = ((await scene.getByRole("img", { name: /^Multimètre/ }).getAttribute("aria-label")) ?? "").replace(/^Multimètre : /, "");
  const valeur = Number(texte.replace(/ m?V$/, "").replace(",", ".").replace("−", "-"));
  return { texte, valeur: Number.isFinite(valeur) ? valeur : null };
};
/** Note une mesure : la tension lue, sans son signe, puis la lame jugée positive. */
const note = async (valeur: number, decimales: number, plus: string, photo?: string) => {
  await page.getByRole("button", { name: "Noter la tension" }).click();
  await attends(500);
  if (photo) await e.photo(`${photo}-tension`);
  for (const c of fr(Math.abs(valeur), decimales)) await page.locator(".pl-pave").getByRole("button", { name: c, exact: true }).click();
  await page.getByRole("button", { name: "Noter", exact: true }).click();
  await attends(450);
  if (photo) await e.photo(`${photo}-borne`);
  await page.getByRole("button", { name: plus.replace(/^./, (c) => c.toUpperCase()), exact: true }).click();
  await attends(350);
  return message();
};

await e.photo("0-paillasse");
// ----- les trois lames dans leurs solutions -----
for (const i of [0, 1, 2]) await deplace(plateau(i), becher(i));
bilan.lames = await message();
await e.photo("1-lames-plongees");
// ----- la pile zinc-cuivre : borne COM sur le zinc, borne V sur le cuivre -----
if (soignee) { await deplace(PONT_RANGE, PONTS["0-1"]); bilan.pont = await message(); }
bilan.selecteur = await tourne(soignee ? 3 : 2);
await glisse(page, await ici(PRISES.com.x, PRISES.com.y), await ici(lame(0).x, lame(0).y));
await attends(250);
bilan.fil = await message();
await glisse(page, await ici(PRISES.v.x, PRISES.v.y), await ici(lame(1).x, lame(1).y));
await attends(250);
const pile1 = await lis();
bilan.afficheur1 = pile1.texte;
await e.photo("2-pile-zinc-cuivre");
bilan.note1 = await note(pile1.valeur ?? 0, soignee ? 3 : 2, "cuivre", "3-saisie");
// ----- la pile du troisième métal et du cuivre -----
await deplace(soignee ? PONTS["0-1"] : PONT_RANGE, PONTS["1-2"]);
await retire(/^Fil entre la borne COM du multimètre et la lame de zinc/);
if (soignee) {
  await glisse(page, await ici(PRISES.com.x, PRISES.com.y), await ici(lame(2).x, lame(2).y));
} else {
  // bâclée : les fils dans l'autre sens, et le signe n'est pas regardé
  await retire(/^Fil entre la borne V du multimètre et la lame de cuivre/);
  await glisse(page, await ici(PRISES.com.x, PRISES.com.y), await ici(lame(1).x, lame(1).y));
  await attends(250);
  await glisse(page, await ici(PRISES.v.x, PRISES.v.y), await ici(lame(2).x, lame(2).y));
}
await attends(250);
const pile2 = await lis();
bilan.afficheur2 = pile2.texte;
await e.photo("4-deuxieme-pile");
// la lame de la borne V est positive si la tension affichée l'est ; l'élève pressé la prend toujours pour positive
const plus2 = soignee ? ((pile2.valeur ?? 0) > 0 ? "cuivre" : troisieme) : troisieme;
bilan.note2 = await note(pile2.valeur ?? 0, soignee ? 3 : 2, plus2);
// ----- la pile du zinc et du troisième métal : le pont salin passe par-dessus le bécher du milieu -----
await deplace(PONTS["1-2"], PONTS["0-2"]);
bilan.pontLong = await message();
if (soignee) {
  await retire(/^Fil entre la borne V du multimètre et la lame de cuivre/);
  await glisse(page, await ici(PRISES.v.x, PRISES.v.y), await ici(lame(0).x, lame(0).y));
  await attends(250);
  const pile3 = await lis();
  bilan.afficheur3 = pile3.texte;
  await e.photo("5-troisieme-pile");
  bilan.note3 = await note(pile3.valeur ?? 0, 3, (pile3.valeur ?? 0) > 0 ? "zinc" : troisieme);
} else {
  // bâclée : il se trompe de borne, et branche l'ampèremètre aux deux lames de la pile
  await retire(/^Fil entre la borne COM du multimètre et la lame de cuivre/);
  await glisse(page, await ici(PRISES.a.x, PRISES.a.y), await ici(lame(0).x, lame(0).y));
  await attends(250);
  await retire(new RegExp(`^Fil entre la borne V du multimètre et la lame d[e'] ?${troisieme}`));
  await glisse(page, await ici(PRISES.com.x, PRISES.com.y), await ici(lame(2).x, lame(2).y));
  await attends(350);
  bilan.fusible = await message();
  await e.photo("5-fusible-saute");
}
await e.photo("6-releves");
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
await e.photo("7-verdict", true);
console.log(JSON.stringify(bilan, null, 1));
await e.ferme();
