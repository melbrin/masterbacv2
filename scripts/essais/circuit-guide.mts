// Essai à la main du guide de la paillasse Circuits, dans un vrai navigateur, à la souris seulement, sur son banc de
// chantier (/app/tp/chantier/circuits). Le robot ne sait rien du montage : il fait le geste que la main du guide montre,
// il ne touche à rien quand la consigne dit d'attendre, il place le repère sur la courbe comme un élève (la tension
// finale, puis le point où elle en vaut 0,63 fois), puis il appelle le professeur.
// Si la main montre le mauvais endroit, si une étape manque ou si une consigne tourne en rond, l'essai échoue.
// Il prend une capture à chaque nouvelle consigne : il faut les regarder.
// Avec « maladroit », l'élève commence seul et de travers (un autre conducteur ohmique, un fil entre les deux bornes du
// générateur, la carte lancée trop tôt), puis il suit le guide, qui doit tout rattraper.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/circuit-guide.mts <dossier des captures> [graine] [largeur] [hauteur] [propre|maladroit]
import type { Locator, Page } from "@playwright/test";
import { BASE, attends, centre, faisLeGeste, glisse, lisGuide, ouvre } from "./outils.mts";

const [sortie, graine = "1", largeur = "390", hauteur = "844", depart = "propre"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/circuit-guide.mts <dossier des captures> [graine] [largeur] [hauteur] [propre|maladroit]");
const e = await ouvre({ sortie, largeur: Number(largeur), hauteur: Number(hauteur), guide: true });
const page: Page = e.page;
const bilan: Record<string, unknown> = { tp: "condensateur", graine: Number(graine), fenetre: `${largeur} x ${hauteur}`, depart };
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

await page.goto(`${BASE}/app/tp/chantier/circuits?tp=condensateur&graine=${graine}`);
await attends(500);
await e.photo("00-porte");
await page.getByRole("button", { name: "Ouvrir la paillasse" }).click();
await attends(900);
const scene: Locator = page.locator("svg.pl-scene");

/** Ce que lit le repère de la courbe : son instant et sa tension. */
async function lisLeRepere(): Promise<{ t: number; u: number; texte: string }> {
  const texte = (await scene.getByRole("slider", { name: "Repère sur la courbe" }).getAttribute("aria-valuetext")) ?? "";
  const [t, u] = [...texte.matchAll(/[−-]?\d+(?:,\d+)?/g)].map((m) => Number(m[0].replace("−", "-").replace(",", ".")));
  return { t, u, texte };
}

/**
 * Place le repère comme un élève : tout au bout de la courbe pour lire la tension finale, puis vers le point où la
 * tension en vaut 0,63 fois, d'abord en touchant le graphe, puis avec les deux flèches, un point à la fois.
 */
async function placeLeRepere(): Promise<{ palier: number; cible: number; repere: string }> {
  const cadre = await scene.locator("rect.pl-circuit-ecran").boundingBox();
  if (!cadre) throw new Error("la courbe n'a pas de cadre");
  const touche = async (part: number) => { await page.mouse.click(cadre.x + part * cadre.width, cadre.y + cadre.height * 0.5); await attends(120); return lisLeRepere(); };
  const palier = (await touche(0.998)).u;
  const cible = 0.63 * palier;
  // la courbe monte : on resserre en touchant le graphe à gauche ou à droite du point lu
  let bas = 0, haut = 1;
  for (let i = 0; i < 7; i++) {
    const milieu = (bas + haut) / 2;
    if (Math.abs((await touche(milieu)).u) < Math.abs(cible)) bas = milieu; else haut = milieu;
  }
  // puis les flèches : on avance tant que la tension est sous la cible, on recule tant qu'elle est dessus
  const fleche = (nom: string) => scene.getByRole("button", { name: nom });
  let ici = await lisLeRepere();
  for (let i = 0; i < 40 && Math.abs(ici.u) < Math.abs(cible); i++) { await fleche("Avancer le repère d'un point").click(); await attends(60); ici = await lisLeRepere(); }
  for (let i = 0; i < 40 && Math.abs(ici.u) > Math.abs(cible); i++) { await fleche("Reculer le repère d'un point").click(); await attends(60); ici = await lisLeRepere(); }
  // le point juste avant la cible et le point juste après : on garde le plus proche
  const avant = ici;
  await fleche("Avancer le repère d'un point").click();
  await attends(60);
  const apres = await lisLeRepere();
  if (Math.abs(Math.abs(avant.u) - Math.abs(cible)) < Math.abs(Math.abs(apres.u) - Math.abs(cible))) { await fleche("Reculer le repère d'un point").click(); await attends(60); }
  return { palier, cible: Number(cible.toFixed(3)), repere: (await lisLeRepere()).texte };
}

if (depart === "maladroit") {
  // le conducteur ohmique que le protocole ne demande pas : touché, puis posé sur l'emplacement du milieu
  const voulu = ((await page.locator(".pl-cote ol li").first().textContent()) ?? "").match(/conducteur ohmique de ([^,]+),/)?.[1] ?? "";
  const boite = scene.getByRole("button", { name: /^Le conducteur ohmique de .*, dans la boîte$/ });
  const noms = await boite.evaluateAll((tous) => tous.map((b) => b.getAttribute("aria-label") ?? ""));
  const autre = noms.findIndex((n) => !n.includes(`de ${voulu},`));
  if (!voulu || autre < 0) throw new Error("pas de conducteur ohmique à prendre de travers");
  await boite.nth(autre).click();
  await attends(250);
  await scene.getByRole("button", { name: "Poser sur l'emplacement 2 de la plaque" }).click({ force: true });
  await attends(300);
  // un fil entre les deux bornes du générateur, encore à 0 V : il ne se met pas en sécurité
  await glisse(page, await centre(scene.getByRole("button", { name: /^la borne \+ du générateur/ }).first()), await centre(scene.getByRole("button", { name: /^la borne − du générateur/ }).first()), 16);
  await attends(300);
  // la carte lancée avant que le montage soit prêt
  await scene.getByRole("button", { name: "Lancer l'acquisition" }).click();
  await attends(300);
  bilan.malParti = { pose: noms[autre], message: await e.texte(".pl-message") };
}

const vues = new Set<string>();
const journal: { cle: string; texte: string; ms: number }[] = [];
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
  if (p.cle === "courbe-repere") {
    bilan.lecture = await placeLeRepere();
    await e.photo(`${String(rang).padStart(2, "0")}-courbe-repere-pose`);
    await page.getByRole("button", { name: "Noter ce temps" }).click();
    await attends(400);
    continue;
  }
  if (p.cle === "trace" && !bilan.traceVue) {
    // la courbe se trace : une capture en cours de route, sans toucher à rien
    await attends(1500);
    await e.photo(`${String(rang).padStart(2, "0")}-trace-en-cours`);
    bilan.traceVue = true;
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
