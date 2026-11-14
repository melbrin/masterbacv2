// Essai à la main du guide de la paillasse « diffraction », dans un vrai navigateur, à la souris seulement, sur son banc
// de chantier (/app/tp/chantier/optique?tp=cheveu ou young). Le robot ne sait rien de la diffraction : il fait le geste
// que la main du guide montre (fixer le laser, toucher son bouton, glisser une diapositive, l'écran, un curseur), il
// touche la touche du bas mise en avant, il ajuste chaque curseur de près en glissant doucement jusqu'à ce que le guide
// lui dise de lever le doigt, il lit la loupe et la graduation de l'écran comme un élève, il compte les franges, et il
// tape ses lectures au pavé de chiffres. Puis il appelle le professeur.
// Si la main montre le mauvais endroit, si une étape manque ou si une consigne tourne en rond, l'essai échoue.
// Attendu : aucune faute, et le score plafonné du guide (0,75). Il prend une capture à chaque nouvelle consigne : il
// faut les regarder.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/diffraction-guide.mts <dossier des captures> [cheveu|young] [graine] [largeur] [hauteur] [maladroit]
// « maladroit » : le robot lâche chaque curseur un millimètre avant sa zone sombre ; le guide le lui fait ajuster de près.
import type { Locator, Page } from "@playwright/test";
import { BASE, attends, faisLeGeste, glisse, lisGuide, ouvre, pointEcran, type PasVu } from "./outils.mts";

const [sortie, tp = "cheveu", graine = "1", largeur = "390", hauteur = "844", facon = ""] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/diffraction-guide.mts <dossier des captures> [cheveu|young] [graine] [largeur] [hauteur] [maladroit]");
const maladroit = facon === "maladroit";
const e = await ouvre({ sortie, largeur: Number(largeur), hauteur: Number(hauteur), guide: true });
const page: Page = e.page;
const bilan: Record<string, unknown> = { tp, graine: Number(graine), fenetre: `${largeur} x ${hauteur}`, facon: maladroit ? "maladroit" : "soigne" };

await page.goto(`${BASE}/app/tp/chantier/optique?tp=${tp}&graine=${graine}`);
await attends(500);
await e.photo("00-porte");
await page.getByRole("button", { name: "Ouvrir la paillasse" }).click();
await attends(900);
const scene: Locator = page.locator("svg.pl-scene");
const ici = (x: number, y: number) => pointEcran(scene, { x, y });
const fr = (x: number) => x.toFixed(1).replace(".", ",");

/** Ce qu'un élève lit dans la loupe : la graduation en face du repère de l'écran, au millimètre. Les centimètres y sont chiffrés. */
async function lisLaLoupe(): Promise<number> {
  const lu = await page.evaluate(() => {
    const loupe = document.querySelector(".pl-optique-loupe");
    const repere = loupe?.querySelector("path.pl-optique-repere")?.getAttribute("d")?.match(/-?\d+(\.\d+)?/g)?.map(Number);
    if (!loupe || !repere) return null;
    const chiffres = [...loupe.querySelectorAll("text.pl-loupe-chiffre")].map((t) => ({ v: Number(t.textContent), x: Number(t.getAttribute("x")) })).sort((a, b) => a.v - b.v);
    if (chiffres.length < 2) return null;
    const [a, b] = [chiffres[0], chiffres[chiffres.length - 1]];
    return a.v + ((repere[0] - a.x) * (b.v - a.v)) / (b.x - a.x);
  });
  if (lu === null) throw new Error("la loupe ne montre pas de quoi lire");
  return Math.round(lu * 10) / 10;
}

/** Ce qu'un élève lit sur l'écran : la graduation en face de chaque curseur, au demi-millimètre, puis la différence. */
async function lisLesCurseurs(): Promise<number> {
  const lus = await page.evaluate(() => {
    const dessin = document.querySelector("svg.pl-scene");
    // la première échelle de la scène est la graduation de l'écran : ses dizaines de millimètres sont chiffrées
    const chiffres = [...(dessin?.querySelector(".pl-echelle")?.querySelectorAll("text") ?? [])].map((t) => ({ v: Number(t.textContent), x: Number(t.getAttribute("x")) })).sort((a, b) => a.v - b.v);
    const curseurs = [...(dessin?.querySelectorAll(".pl-diffraction-curseur line") ?? [])].map((l) => Number(l.getAttribute("x1")));
    if (chiffres.length < 2 || curseurs.length !== 2) return null;
    const [a, b] = [chiffres[0], chiffres[chiffres.length - 1]];
    return curseurs.map((x) => a.v + ((x - a.x) * (b.v - a.v)) / (b.x - a.x));
  });
  if (!lus) throw new Error("l'écran ne montre pas ses deux curseurs sur la graduation");
  const [c1, c2] = lus.map((x) => Math.round(x * 2) / 2);
  return Math.abs(c2 - c1);
}

/** Ce qu'un élève compte entre les deux curseurs : les franges brillantes, c'est-à-dire les interfranges d'une frange sombre à l'autre. */
async function compteLesFranges(): Promise<number> {
  const n = await page.evaluate(() => {
    const dessin = document.querySelector("svg.pl-scene");
    const curseurs = [...(dessin?.querySelectorAll(".pl-diffraction-curseur line") ?? [])].map((l) => Number(l.getAttribute("x1"))).sort((a, b) => a - b);
    const degrade = dessin?.querySelector("linearGradient[gradientUnits=userSpaceOnUse]");
    if (!degrade || curseurs.length !== 2) return null;
    const [x1, x2] = [Number(degrade.getAttribute("x1")), Number(degrade.getAttribute("x2"))];
    // l'éclat de la figure, point par point, entre les deux curseurs
    const eclats = [...degrade.querySelectorAll("stop")].map((s) => ({ x: x1 + Number(s.getAttribute("offset")) * (x2 - x1), e: Number(s.getAttribute("stop-opacity")) }))
      .filter((p) => p.x > curseurs[0] && p.x < curseurs[1]).map((p) => p.e);
    // une frange brillante : l'éclat monte, puis redescend
    let franges = 0, monte = false;
    for (let k = 1; k < eclats.length; k++) {
      if (eclats[k] > eclats[k - 1]) monte = true;
      else if (eclats[k] < eclats[k - 1]) { if (monte) franges++; monte = false; }
    }
    return franges;
  });
  if (n === null) throw new Error("l'écran ne montre pas de franges entre deux curseurs");
  return n;
}

/** Tape une lecture au pavé de chiffres, et la note. */
async function note(valeur: string, photo: string): Promise<void> {
  for (const signe of valeur) await page.locator(".pl-pave").getByRole("button", { name: signe, exact: true }).click();
  await e.photo(photo);
  await page.getByRole("button", { name: "Noter", exact: true }).click();
  await attends(450);
}

const journal: { cle: string; texte: string; ms: number }[] = [];
let depuis = Date.now();

/**
 * Ajuste un curseur de près : le doigt se pose sur son onglet, glisse doucement dans le sens que la main montre, et se
 * lève quand le guide change de consigne (« le curseur est au milieu de la zone sombre : lève le doigt »). Comme un
 * élève, il réagit avec un petit retard. `photo` : le début du nom de la capture prise à ce moment, le doigt encore posé.
 */
async function ajusteLeCurseur(p: PasVu, photo: string): Promise<void> {
  const sens = Math.sign(p.versX - p.x) || 1;
  const depart = await ici(p.x, p.y);
  await page.mouse.move(depart.x, depart.y);
  await page.mouse.down();
  let retard = -1;
  for (let i = 1; i <= 300 && retard !== 0; i++) {
    const q = await ici(p.x + sens * 0.4 * i, p.y);
    await page.mouse.move(q.x, q.y);
    await attends(16);
    if (retard > 0) { retard--; continue; }
    const vu = await lisGuide(page);
    if (vu && vu.cle === p.cle) continue;
    retard = 2;
    if (vu) { journal[journal.length - 1].ms = Date.now() - depuis; depuis = Date.now(); journal.push({ cle: vu.cle, texte: vu.texte, ms: 0 }); }
  }
  // le doigt est encore posé : la consigne de le lever est toujours là
  const vu = await lisGuide(page);
  if (vu && vu.cle !== p.cle) await e.photo(`${photo}-${vu.cle}`);
  await page.mouse.up();
  await attends(200);
}

const lectures: string[] = [];
for (let tour = 0; tour < 4000; tour++) {
  const p = await lisGuide(page);
  if (!p) throw new Error("le guide ne dit plus rien");
  const rang = String(journal.length + 1).padStart(2, "0");
  if (journal[journal.length - 1]?.cle !== p.cle) {
    if (journal.length) journal[journal.length - 1].ms = Date.now() - depuis;
    depuis = Date.now();
    journal.push({ cle: p.cle, texte: p.texte, ms: 0 });
    // le temps que le regard se rapproche de la loupe ou des curseurs, ou s'en éloigne
    await attends(/lire|compter|noter|ajuster|distance/.test(p.cle) ? 520 : 200);
    await e.photo(`${rang}-${p.cle}`);
    continue;
  } else if (Date.now() - depuis > 60000) {
    await e.photo("panne");
    throw new Error(`le guide reste sur « ${p.cle} » : ${p.texte}`);
  }
  const ici2 = String(journal.length).padStart(2, "0");
  if (p.cle === "distance-lire") {
    const lu = await lisLaLoupe();
    lectures.push(`D ${fr(lu)} cm`);
    await note(fr(lu), `${ici2}-${p.cle}-saisie`);
    continue;
  }
  if (p.cle.endsWith("-lire")) {
    const lu = await lisLesCurseurs();
    lectures.push(`${p.cle.slice(0, -5)} ${fr(lu)} mm`);
    await note(fr(lu), `${ici2}-${p.cle}-saisie`);
    continue;
  }
  if (p.cle.endsWith("-compter")) {
    const n = await compteLesFranges();
    lectures.push(`${n} interfranges`);
    await note(String(n), `${ici2}-${p.cle}-saisie`);
    continue;
  }
  if (/-ajuster-\d$/.test(p.cle)) { await ajusteLeCurseur(p, ici2); continue; }
  if (maladroit && p.geste === "glisser" && /-curseur-\d$/.test(p.cle)) {
    // le curseur lâché trop tôt, un millimètre avant sa zone sombre
    await glisse(page, await ici(p.x, p.y), await ici(p.versX - Math.sign(p.versX - p.x) * 2.8, p.versY), 16, 14);
    await attends(300);
    continue;
  }
  if (await faisLeGeste(page, scene, p)) continue;
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
bilan.lectures = lectures.join(" · ");
bilan.consignes = journal.map((j) => `${j.cle} (${(j.ms / 1000).toFixed(1)} s)`).join(" · ");
bilan.duree = `${Math.round(journal.reduce((s, j) => s + j.ms, 0) / 1000)} s`;
bilan.largeur = await e.largeur();
bilan.erreurs = e.erreurs;
await e.photo("99-verdict", true);
console.log(JSON.stringify(bilan, null, 1));
await e.ferme();
