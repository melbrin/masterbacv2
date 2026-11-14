// Essai à la main du guide de la paillasse « optique », dans un vrai navigateur, à la souris seulement, sur son banc de
// chantier (/app/tp/chantier/optique). Le robot ne sait rien de l'optique : il fait le geste que la main du guide montre
// (toucher un interrupteur, glisser une lentille, un support, la règle), il touche la touche du bas mise en avant, il
// cherche la netteté dans la loupe en glissant doucement jusqu'à ce que le guide lui dise de lever le doigt, il lit la
// loupe et la règle comme un élève et tape ses lectures au pavé de chiffres, puis il appelle le professeur.
// Si la main montre le mauvais endroit, si une étape manque ou si une consigne tourne en rond, l'essai échoue.
// Attendu : aucune faute, et le score plafonné du guide (0,75). Il prend une capture à chaque nouvelle consigne : il
// faut les regarder.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/optique-guide.mts <dossier des captures> [focale|lunette] [graine] [largeur] [hauteur] [maladroit]
// « maladroit » : le robot lâche la lentille un bon centimètre avant sa place ; le guide la lui fait finir dans la loupe.
import type { Locator, Page } from "@playwright/test";
import { BASE, attends, faisLeGeste, glisse, lisGuide, ouvre, pointEcran, type PasVu } from "./outils.mts";

const [sortie, tp = "focale", graine = "1", largeur = "390", hauteur = "844", facon = ""] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/optique-guide.mts <dossier des captures> [focale|lunette] [graine] [largeur] [hauteur] [maladroit]");
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

/** Ce qu'un élève lit dans la loupe : la graduation en face du repère, au millimètre. Les centimètres y sont chiffrés. */
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

/** Ce qu'un élève lit sur la règle : la graduation en face du haut de l'image, moins celle en face du bas (le zéro, si la règle est bien posée). */
async function lisLaRegle(): Promise<number> {
  const lu = await page.evaluate(() => {
    const nombres = (el: Element | null) => el?.getAttribute("transform")?.match(/-?\d+(\.\d+)?/g)?.map(Number);
    const regle = document.querySelector(".pl-optique-regle");
    const place = nombres(regle);
    const image = nombres(document.querySelector("path.pl-optique-image"));
    if (!regle || !place || !image) return null;
    // la lettre est haute d'une unité, agrandie à la taille de l'image, centrée sur l'écran
    const [haut, bas] = [image[1] - image[2] / 2, image[1] + image[2] / 2];
    const traits = [...regle.querySelectorAll("line")].map((l) => place[1] + Number(l.getAttribute("y1")));
    const enFace = (y: number) => traits.reduce((m, t, k) => (Math.abs(t - y) < Math.abs(traits[m] - y) ? k : m), 0);
    return (enFace(haut) - enFace(bas)) / 10;
  });
  if (lu === null) throw new Error("la règle ou l'image manque sur l'écran");
  return lu;
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
 * Cherche la netteté dans la loupe : le doigt se pose où la main le montre, glisse doucement dans le sens montré, et
 * se lève quand le guide change de consigne (« l'image est nette : lève le doigt »). Comme un élève, il réagit avec un
 * petit retard : il glisse encore un peu. `photo` : le début du nom de la capture prise à ce moment, le doigt encore posé.
 */
async function chercheDansLaLoupe(p: PasVu, photo: string): Promise<void> {
  const sens = Math.sign(p.versX - p.x) || 1;
  const depart = await ici(p.x, p.y);
  await page.mouse.move(depart.x, depart.y);
  await page.mouse.down();
  let retard = -1;
  for (let i = 1; i <= 34 && retard !== 0; i++) {
    const q = await ici(p.x + sens * 1.5 * i, p.y);
    await page.mouse.move(q.x, q.y);
    await attends(24);
    if (retard > 0) { retard--; continue; }
    const vu = await lisGuide(page);
    if (vu && vu.cle === p.cle) continue;
    retard = 3;
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
    // le temps que le regard se rapproche de la loupe ou de l'écran, ou s'en éloigne
    await attends(/lire|regle|noter|positions/.test(p.cle) ? 520 : 200);
    await e.photo(`${rang}-${p.cle}`);
    continue;
  } else if (Date.now() - depuis > 60000) {
    await e.photo("panne");
    throw new Error(`le guide reste sur « ${p.cle} » : ${p.texte}`);
  }
  const ici2 = String(journal.length).padStart(2, "0");
  if (p.cle.startsWith("lire-")) {
    const lu = await lisLaLoupe();
    lectures.push(`${p.cle.slice(5)} ${fr(lu)} cm`);
    await note(fr(lu), `${ici2}-${p.cle}-saisie`);
    continue;
  }
  if (p.cle.endsWith("-lire")) {
    const lu = await lisLaRegle();
    lectures.push(`${p.cle.slice(0, -5)} ${fr(lu)} cm`);
    await note(fr(lu), `${ici2}-${p.cle}-saisie`);
    continue;
  }
  if (p.cle.endsWith("-finir")) { await chercheDansLaLoupe(p, ici2); continue; }
  if (maladroit && p.geste === "glisser" && /^lentille-\d/.test(p.cle) && p.y > 200 && Math.abs(p.versX - p.x) > 8) {
    // le support lâché trop tôt, à 1,3 cm de sa place
    await glisse(page, await ici(p.x, p.y), await ici(p.versX - Math.sign(p.versX - p.x) * 3.6, p.versY), 16, 14);
    await attends(400);
    await e.photo(`${ici2}-${p.cle}-dans-la-loupe`);
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
