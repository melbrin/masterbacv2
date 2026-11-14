// Essai à la main du guide de la paillasse du microcontrôleur, dans un vrai navigateur, à la souris seulement, sur son
// banc de chantier (/app/tp/chantier/circuits?tp=jauge). Le robot ne sait rien du montage : il fait le geste que la main
// du guide montre, il garde l'appui tant que la consigne ne change pas, il lit le niveau dans la loupe et la durée sur
// le moniteur comme un élève, les écrit au pavé de chiffres, puis il appelle le professeur.
// Si la main montre le mauvais endroit, si une étape manque ou si une consigne tourne en rond, l'essai échoue.
// Il prend une capture à chaque nouvelle consigne : il faut les regarder.
// Avec « maladroit », l'élève commence seul et de travers (un autre conducteur ohmique, un fil de la broche 5 V à la
// plaque d'essai, une ligne écrite au hasard dans le carnet), puis il suit le guide, qui doit tout rattraper.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/microcontroleur-guide.mts <dossier des captures> [graine] [largeur] [hauteur] [propre|maladroit]
import type { Locator, Page } from "@playwright/test";
import { BASE, attends, centre, faisLeGeste, glisse, lisGuide, ouvre } from "./outils.mts";

const [sortie, graine = "1", largeur = "390", hauteur = "844", depart = "propre"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/microcontroleur-guide.mts <dossier des captures> [graine] [largeur] [hauteur] [propre|maladroit]");
const e = await ouvre({ sortie, largeur: Number(largeur), hauteur: Number(hauteur), guide: true });
const page: Page = e.page;
const bilan: Record<string, unknown> = { tp: "jauge", graine: Number(graine), fenetre: `${largeur} x ${hauteur}`, depart };
// le serveur de développement est partagé : si un fichier commun change pendant l'essai, la page se recharge et la
// paillasse repart de zéro. L'essai le dit au lieu d'échouer sans raison : il suffit alors de le relancer.
const recharges: string[] = [];
page.on("console", (m) => { if (/Fast Refresh|full reload/i.test(m.text())) recharges.push(m.text().slice(0, 120)); });
const echoue = async (erreur: unknown) => {
  await e.photo("erreur").catch(() => {});
  console.error(JSON.stringify({ ...bilan, erreur: String(erreur).slice(0, 600), paillasseOuverte: await page.locator(".pl-etabli").count().catch(() => -1), recharges, guide: await lisGuide(page).catch(() => null), message: await e.texte(".pl-message") }, null, 1));
  await e.nav.close().catch(() => {});
  process.exit(1);
};
process.on("uncaughtException", echoue);
process.on("unhandledRejection", echoue);
const fr = (x: number, decimales: number) => x.toFixed(decimales).replace(".", ",");

await page.goto(`${BASE}/app/tp/chantier/circuits?tp=jauge&graine=${graine}`);
await attends(500);
await e.photo("00-porte");
await page.getByRole("button", { name: "Ouvrir la paillasse" }).click();
await attends(900);
const scene: Locator = page.locator("svg.pl-scene");

/**
 * Ce qu'un élève lit dans la loupe : la graduation en face de la surface de l'eau, au centre de la loupe. Il part du
 * grand trait chiffré le plus proche et compte les petits traits jusqu'à la surface, à une demi-graduation près.
 * Sans eau, la loupe montre le fond de la cuve : le niveau est zéro.
 */
async function lisLaLoupe(): Promise<number> {
  const lu = await page.evaluate(() => {
    const loupe = document.querySelector(".pl-loupe");
    if (!loupe) return null;
    const menisque = loupe.querySelector("path.pl-menisque")?.getAttribute("d")?.match(/-?\d+(\.\d+)?/g)?.map(Number);
    if (!menisque) return 0;
    // la surface est une courbe : son bas est à mi-chemin entre ses bords et son point de contrôle
    const surface = (menisque[1] + menisque[3]) / 2;
    const traits = [...loupe.querySelectorAll(".pl-echelle line")].map((l) => ({ y: Number(l.getAttribute("y1")), grand: l.getAttribute("stroke-width") === "1.3" })).sort((a, b) => a.y - b.y);
    const chiffres = [...loupe.querySelectorAll("text.pl-loupe-chiffre")].map((t) => ({ v: Number((t.textContent ?? "").replace(",", ".")), y: Number(t.getAttribute("y")) }));
    const grands = traits.filter((t) => t.grand);
    if (traits.length < 2 || grands.length === 0 || chiffres.length === 0) return null;
    // chaque chiffre est écrit en face d'un grand trait ; l'élève part de celui qui est le plus près de la surface
    const reperes = chiffres.map((c) => ({ v: c.v, y: grands.reduce((m, g) => (Math.abs(g.y - c.y) < Math.abs(m - c.y) ? g.y : m), grands[0].y) }));
    const depart = reperes.reduce((m, r) => (Math.abs(r.y - surface) < Math.abs(m.y - surface) ? r : m));
    // l'écart entre deux petits traits, et ce qu'il vaut : dix petits traits entre deux grands, un millimètre chacun
    const ecart = (traits[traits.length - 1].y - traits[0].y) / (traits.length - 1);
    // la graduation monte vers le haut de la loupe
    return depart.v + ((depart.y - surface) / ecart) * 0.1;
  });
  if (lu === null) throw new Error("la loupe ne montre pas de quoi lire");
  return Math.round(lu * 20) / 20;
}

if (depart === "maladroit") {
  // le conducteur ohmique que le protocole ne demande pas : touché, puis piqué sur la plaque d'essai
  const voulu = ((await page.locator(".pl-cote ol li").first().textContent()) ?? "").match(/conducteur ohmique de (.+?) et le piquer/)?.[1] ?? "";
  const boite = scene.getByRole("button", { name: /^Le conducteur ohmique de .*, dans la boîte$/ });
  const noms = await boite.evaluateAll((tous) => tous.map((b) => b.getAttribute("aria-label") ?? ""));
  const autre = noms.findIndex((n) => !n.includes(`de ${voulu},`));
  if (!voulu || autre < 0) throw new Error("pas de conducteur ohmique à prendre de travers");
  await boite.nth(autre).click();
  await attends(250);
  await scene.getByRole("button", { name: /^Poser sur la plaque d'essai, entre les rangées 1 et 2/ }).click({ force: true });
  await attends(300);
  // un fil de la broche 5 V à la rangée 1 : le programme ne s'en sert pas
  await glisse(page, await centre(scene.getByRole("button", { name: /^la broche 5 V/ }).first()), await centre(scene.getByRole("button", { name: /^la rangée 1 de la plaque d'essai/ }).first()), 16);
  await attends(300);
  // une ligne écrite au hasard dans le carnet, sans mesure
  await page.getByRole("button", { name: "Noter la mesure" }).click();
  await attends(500);
  for (const valeur of ["9", "999"]) {
    for (const signe of valeur) await page.locator(".pl-pave").getByRole("button", { name: signe, exact: true }).click();
    await page.getByRole("button", { name: "Noter", exact: true }).click();
    await attends(500);
  }
  bilan.malParti = { pique: noms[autre], message: await e.texte(".pl-message") };
}

const vues = new Set<string>();
const journal: { cle: string; texte: string; ms: number }[] = [];
const releves: { niveau: string; duree: string }[] = [];
let depuis = Date.now();
let rang = 0;
for (let tour = 0; tour < 4000; tour++) {
  const p = await lisGuide(page);
  if (!p) throw new Error("le guide ne dit plus rien");
  if (journal[journal.length - 1]?.cle !== p.cle) {
    if (journal.length) journal[journal.length - 1].ms = Date.now() - depuis;
    depuis = Date.now();
    journal.push({ cle: p.cle, texte: p.texte, ms: 0 });
    if (!vues.has(p.cle)) { vues.add(p.cle); rang++; await attends(140); await e.photo(`${String(rang).padStart(2, "0")}-${p.cle}`); }
  } else if (Date.now() - depuis > 90000) {
    await e.photo("panne");
    throw new Error(`le guide reste sur « ${p.cle} » : ${p.texte}`);
  }
  if (p.cle === "lire-niveau") {
    // le regard se rapproche de la cuve : on laisse la vue se poser avant de lire
    await attends(500);
    const lu = fr(await lisLaLoupe(), 2).replace(/0$/, "").replace(/,0$/, "");
    for (const signe of lu) await page.locator(".pl-pave").getByRole("button", { name: signe, exact: true }).click();
    if (releves.length === 1) await e.photo(`${String(rang).padStart(2, "0")}-lire-niveau-saisie`);
    await page.getByRole("button", { name: "Noter", exact: true }).click();
    releves.push({ niveau: lu, duree: "" });
    await attends(500);
    continue;
  }
  if (p.cle === "lire-duree") {
    await attends(400);
    // ce que le moniteur affiche : des chiffres, puis l'unité
    const lu = ((await e.texte("svg.pl-scene .pl-afficheur-valeur")) ?? "").replace(/[^\d,]/g, "");
    if (!lu) throw new Error("le moniteur n'affiche pas de durée à recopier");
    for (const signe of lu) await page.locator(".pl-pave").getByRole("button", { name: signe, exact: true }).click();
    if (releves.length === 2) await e.photo(`${String(rang).padStart(2, "0")}-lire-duree-saisie`);
    await page.getByRole("button", { name: "Noter", exact: true }).click();
    if (releves.length) releves[releves.length - 1].duree = lu;
    await attends(500);
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
bilan.releves = releves;
bilan.score = await page.locator("[data-score]").getAttribute("data-score");
bilan.verdict = await e.texte(".tp-correction");
bilan.mesures = await e.texte("[data-mesures]");
bilan.consignes = journal.map((j) => `${j.cle} (${(j.ms / 1000).toFixed(1)} s)`).join(" · ");
bilan.duree = `${Math.round(journal.reduce((s, j) => s + j.ms, 0) / 1000)} s`;
bilan.largeur = await e.largeur();
bilan.erreurs = e.erreurs;
bilan.recharges = recharges;
await e.photo("99-verdict", true);
// ce que l'essai attend : le plafond du guide, aucune faute, la mention du guide, pas de défilement de côté, pas d'erreur
const attendu = bilan.score === "0.75" && /Aucune faute/.test(String(bilan.verdict)) && /Manipulation faite avec le guide/.test(String(bilan.verdict)) && Number(bilan.largeur) <= Number(largeur) && e.erreurs.length === 0;
bilan.conforme = attendu;
console.log(JSON.stringify(bilan, null, 1));
await e.ferme();
if (!attendu) process.exit(1);
