// Essai à la main du guide de la paillasse « ultrasons », dans un vrai navigateur, à la souris seulement, sur son banc
// de chantier (/app/tp/chantier/ondes?tp=ultrasons). Le robot ne sait rien du TP : il fait le geste que la main du
// guide montre. Pour un geste lent (le récepteur glissé, la molette de réglage fin), il avance tant que la consigne ne
// change pas. Il lit l'écran et la loupe comme un élève : l'écart des curseurs, la base de temps, les périodes entre
// les curseurs, la graduation en face du repère ; il compte lui-même les retours en phase en regardant les deux courbes.
// Si la main montre le mauvais endroit, si une étape manque ou si une consigne tourne en rond, l'essai échoue.
// Il prend une capture à chaque nouvelle consigne : il faut les regarder.
// Avec « mal-parti », le robot commence par des gestes de travers (un câble mal posé, le récepteur poussé au bout du
// rail) : le guide doit les faire rattraper.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/ultrasons-guide.mts <dossier des captures> [graine] [largeur] [hauteur] [propre|mal-parti]
import type { Locator, Page } from "@playwright/test";
import { BASE, attends, faisLeGeste, glisse, lisGuide, ouvre, pointEcran, type PasVu } from "./outils.mts";

const [sortie, graine = "1", largeur = "390", hauteur = "844", depart = "propre"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/ultrasons-guide.mts <dossier des captures> [graine] [largeur] [hauteur] [propre|mal-parti]");
const e = await ouvre({ sortie, largeur: Number(largeur), hauteur: Number(hauteur), guide: true });
const page: Page = e.page;
const bilan: Record<string, unknown> = { tp: "ultrasons", graine: Number(graine), fenetre: `${largeur} x ${hauteur}`, depart };

await page.goto(`${BASE}/app/tp/chantier/ondes?tp=ultrasons&graine=${graine}`);
await attends(500);
await e.photo("00-porte");
await page.getByRole("button", { name: "Ouvrir la paillasse" }).click();
await attends(900);
const scene: Locator = page.locator("svg.pl-scene");
const ici = (x: number, y: number) => pointEcran(scene, { x, y });
const virgule = (x: number, decimales: number) => x.toFixed(decimales).replace(".", ",");

/** Ce qu'un élève lit dans la loupe : la graduation chiffrée la plus proche, et l'écart du repère à cette graduation. En millimètres. */
const lisLaLoupe = (): Promise<number> => scene.evaluate((svg) => {
  const repere = Number(svg.querySelector(".pl-loupe line.pl-repere")?.getAttribute("x1"));
  const chiffres = [...svg.querySelectorAll(".pl-loupe text.pl-loupe-chiffre")].map((t) => ({ cm: Number(t.textContent), x: Number(t.getAttribute("x")) })).sort((a, b) => a.x - b.x);
  if (chiffres.length < 2) throw new Error("la loupe ne montre pas deux graduations chiffrées");
  // deux graduations chiffrées donnent l'échelle de la loupe
  const parMm = (chiffres[1].x - chiffres[0].x) / ((chiffres[1].cm - chiffres[0].cm) * 10);
  return Math.round((chiffres[0].cm * 10 + (repere - chiffres[0].x) / parMm) * 10) / 10;
});

/** Les sommets d'une courbe de l'écran, de gauche à droite, dans les unités du dessin ; vide si la voie ne montre pas de courbe lisible. */
const sommets = (voie: 1 | 2): Promise<number[]> => scene.evaluate((svg, rang) => {
  const trace = svg.querySelectorAll(".pl-ultrasons-trace")[rang];
  const d = trace?.getAttribute("d");
  if (!d) return [];
  const n = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < n.length; i += 2) points.push({ x: n[i], y: n[i + 1] });
  const hauts: number[] = [];
  // un sommet : le point le plus haut entre deux descentes (y diminue vers le haut) ; un plateau compte une fois, en son milieu
  for (let i = 1; i + 1 < points.length; i++) {
    if (points[i].y >= points[i - 1].y) continue;
    let j = i;
    while (j + 1 < points.length && points[j + 1].y === points[i].y) j++;
    if (j + 1 < points.length && points[j + 1].y > points[i].y) hauts.push((points[i].x + points[j].x) / 2);
    i = j;
  }
  return hauts;
}, voie - 1);

/** Le décalage de la courbe de la voie 2 par rapport à celle de la voie 1, en fraction de période, de −0,5 à 0,5 ; null si l'écran ne le montre pas. */
async function decalageVu(): Promise<number | null> {
  const [a, b] = [await sommets(1), await sommets(2)];
  if (a.length < 2 || b.length < 1) return null;
  const periode = a[1] - a[0];
  const e = (b[0] - a[0]) / periode;
  const f = e - Math.floor(e);
  return f > 0.5 ? f - 1 : f;
}

/** Écrit un nombre au pavé de chiffres, puis le note. */
async function ecris(texte: string, photo: string): Promise<void> {
  for (const signe of texte) await page.locator(".pl-pave").getByRole("button", { name: signe, exact: true }).click();
  await e.photo(photo);
  await page.getByRole("button", { name: "Noter", exact: true }).click();
  await attends(450);
}

/** La période, comme l'élève la calcule : l'écart des curseurs, fois la base de temps, divisé par le nombre de périodes entre eux. */
async function lisLaPeriode(): Promise<string> {
  const ecart = Number((await scene.locator(".pl-ultrasons-lecture").textContent())?.match(/([\d,]+) div/)?.[1].replace(",", "."));
  const base = (await scene.getByRole("slider", { name: "Base de temps" }).getAttribute("aria-valuetext")) ?? "";
  const parDivision = Number(base.match(/[\d,]+/)?.[0].replace(",", ".")) * (base.includes("ms") ? 1000 : 1);
  const places = await Promise.all(["A", "B"].map(async (lettre) => 20 + 32 * Number(await scene.getByRole("slider", { name: `Curseur ${lettre} de l'écran` }).getAttribute("aria-valuenow"))));
  const [gauche, droite] = [Math.min(...places), Math.max(...places)];
  // les sommets de la voie 1 du curseur de gauche au curseur de droite : un de plus que de périodes
  const entre = (await sommets(1)).filter((x) => x > gauche - 6 && x < droite + 6).length;
  if (!(ecart > 0) || !(parDivision > 0) || entre < 2) throw new Error(`lecture de la période impossible : écart ${ecart}, base « ${base} », ${entre} sommet(s) entre les curseurs`);
  bilan.lecturePeriode = `${virgule(ecart, 2)} div × ${parDivision} µs/div ÷ ${entre - 1}`;
  return virgule((ecart * parDivision) / (entre - 1), 1);
}

/** Les gestes lents : le robot avance tant que la consigne ne change pas, comme un élève qui regarde les courbes. */
const LENT = /^(depart|arrivee)-(gauche|droite|glisser|revenir|fin)$/;
/** Le nombre de retours en phase comptés depuis la position de départ : le décalage des deux courbes, suivi pas à pas. */
let tours = 0;
let dernierDecalage: number | null = null;
let departNote = false;
async function suisLaPhase(): Promise<void> {
  const d = await decalageVu();
  if (d === null) return;
  if (departNote && dernierDecalage !== null) {
    let saut = d - dernierDecalage;
    if (saut > 0.5) saut -= 1;
    if (saut < -0.5) saut += 1;
    tours += saut;
  }
  dernierDecalage = d;
}
async function glisseLentement(p: PasVu): Promise<void> {
  const pas = p.cle.endsWith("-fin") ? 2 : 1;
  let ou = await ici(p.x, p.y);
  await page.mouse.move(ou.x, ou.y);
  await page.mouse.down();
  for (let i = 0; i < 2500; i++) {
    const q = await lisGuide(page);
    if (!q || q.cle !== p.cle || q.geste !== "glisser") break;
    ou = { x: ou.x + Math.sign(q.versX - q.x) * pas, y: ou.y };
    await page.mouse.move(ou.x, ou.y);
    await attends(10);
    await suisLaPhase();
  }
  await page.mouse.up();
  await attends(160);
  await suisLaPhase();
}

if (depart === "mal-parti") {
  // un câble de la sortie GÉN à la voie 1, puis le récepteur mobile poussé vers le bout du rail (les places : components/tp/paillasses/Ultrasons.tsx)
  await glisse(page, await ici(30, 347), await ici(134, 347), 14);
  await attends(300);
  await glisse(page, await ici(78 + 30 * 2.1, 498), await ici(78 + 112 * 2.1, 498), 20);
  await attends(300);
  bilan.malParti = await e.texte(".pl-message");
}

const vues = new Set<string>();
const journal: { cle: string; texte: string; ms: number }[] = [];
let depuis = Date.now();
let rang = 0;
const numero = () => String(rang).padStart(2, "0");
for (let tour = 0; tour < 4000; tour++) {
  const p = await lisGuide(page);
  if (!p) throw new Error("le guide ne dit plus rien");
  if (journal[journal.length - 1]?.cle !== p.cle) {
    if (journal.length) journal[journal.length - 1].ms = Date.now() - depuis;
    depuis = Date.now();
    journal.push({ cle: p.cle, texte: p.texte, ms: 0 });
    if (!vues.has(p.cle)) { vues.add(p.cle); rang++; await attends(180); await e.photo(`${numero()}-${p.cle}`); }
  } else if (Date.now() - depuis > 90000) {
    await e.photo("panne");
    throw new Error(`le guide reste sur « ${p.cle} » : ${p.texte}`);
  }
  if (p.cle === "periode-ecrire") {
    await attends(450);
    const lue = await lisLaPeriode();
    bilan.periode = lue;
    await ecris(lue, `${numero()}-periode-saisie`);
    continue;
  }
  if (p.cle === "depart-ecrire" || p.cle === "arrivee-ecrire") {
    await attends(450);
    // l'élève lit au demi-millimètre près, et écrit en centimètres
    const lue = virgule(Math.round((await lisLaLoupe()) * 2) / 20, 2);
    bilan[p.cle === "depart-ecrire" ? "depart" : "arrivee"] = lue;
    await ecris(lue, `${numero()}-${p.cle.split("-")[0]}-saisie`);
    if (p.cle === "depart-ecrire") { departNote = true; tours = 0; await suisLaPhase(); }
    continue;
  }
  if (p.cle === "nombre-ecrire") {
    bilan.retoursComptes = Math.round(tours * 100) / 100;
    await ecris(String(Math.round(tours)), `${numero()}-nombre-saisie`);
    continue;
  }
  if (LENT.test(p.cle) && p.geste === "glisser") { await glisseLentement(p); continue; }
  if (await faisLeGeste(page, scene, p)) { await suisLaPhase(); continue; }
  if (p.touche) {
    const appel = p.cle === "fini";
    await page.locator(".pl-pied .pl-vise").first().click();
    await attends(350);
    if (appel) { await e.photo("98-confirmation"); bilan.confirmation = await e.texte(".pl-confirme span"); await page.getByRole("button", { name: "Oui, j'ai fini" }).click(); break; }
    continue;
  }
  await attends(60);
}

await page.waitForSelector("[data-score]", { timeout: 15000 });
await page.getByRole("button", { name: "Quitter la paillasse" }).click().catch(() => {});
await attends(400);
bilan.score = await page.locator("[data-score]").getAttribute("data-score");
bilan.verdict = await e.texte(".tp-correction");
bilan.mesures = await e.texte("[data-mesures]");
bilan.consignes = journal.map((j) => `${j.cle} (${(j.ms / 1000).toFixed(1)} s)`).join(" · ");
bilan.duree = `${Math.round(journal.reduce((s, j) => s + j.ms, 0) / 1000)} s`;
bilan.largeur = await e.largeur();
bilan.erreurs = e.erreurs;
await e.photo("99-verdict", true);
console.log(JSON.stringify(bilan, null, 1));
await e.ferme();
