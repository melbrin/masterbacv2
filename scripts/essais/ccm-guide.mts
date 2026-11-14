// Essai à la main du guide de la paillasse « ccm », dans un vrai navigateur, à la souris seulement. Le robot ne sait
// rien de la chromatographie : il fait le geste que la main du guide montre, il garde l'appui tant que la consigne ne
// change pas, il lit la règle dans la loupe comme un élève, puis il appelle le professeur. Si la main montre le mauvais
// endroit, si une étape manque ou si une consigne tourne en rond, l'essai échoue.
// Il prend une capture à chaque nouvelle consigne : il faut les regarder.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/ccm-guide.mts <dossier des captures> [graine] [largeur] [hauteur]
import type { Locator, Page } from "@playwright/test";
import { BASE, attends, faisLeGeste, lisGuide, ouvre } from "./outils.mts";

const [sortie, graine = "1", largeur = "390", hauteur = "844"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/ccm-guide.mts <dossier des captures> [graine] [largeur] [hauteur]");
const e = await ouvre({ sortie, largeur: Number(largeur), hauteur: Number(hauteur), guide: true });
const page: Page = e.page;
const bilan: Record<string, unknown> = { graine: Number(graine), fenetre: `${largeur} x ${hauteur}` };
const photo = (nom: string) => e.photo(`guide-${largeur}-${nom}`);

await page.goto(`${BASE}/app/tp/chantier/synthese?tp=synthese&graine=${graine}`);
const banc = page.locator("section[data-banc]").filter({ hasText: ": ccm" });
await attends(500);
await banc.getByRole("button", { name: "Ouvrir la paillasse" }).click();
await attends(900);
const scene: Locator = page.locator("svg.pl-scene");

/** Ce qu'un élève lit dans la loupe : la graduation de la règle en face du trait du curseur, à un demi-millimètre près. */
async function lisLaLoupe(): Promise<number> {
  const lu = await page.evaluate(() => {
    const loupe = document.querySelector(".pl-loupe");
    const curseur = Number(loupe?.querySelector("line.pl-repere")?.getAttribute("y1"));
    if (!loupe || !Number.isFinite(curseur)) return null;
    const traits = [...new Set([...loupe.querySelectorAll(".pl-echelle line")].map((l) => Number(l.getAttribute("y1"))))].sort((a, b) => a - b);
    const chiffres = [...loupe.querySelectorAll("text.pl-loupe-chiffre")].map((t) => ({ v: Number((t.textContent ?? "").replace(",", ".")), y: Number(t.getAttribute("y")) - 3.5 }));
    if (traits.length < 2 || chiffres.length < 1) return null;
    // deux traits voisins sont séparés d'un millimètre ; les graduations montent
    const millimetre = Math.min(...traits.slice(1).map((y, i) => y - traits[i]));
    const repere = chiffres.reduce((m, c) => (Math.abs(c.y - curseur) < Math.abs(m.y - curseur) ? c : m), chiffres[0]);
    return repere.v + ((repere.y - curseur) / millimetre) * 0.1;
  });
  if (lu === null) throw new Error("la loupe ne montre pas de quoi lire");
  return Math.round(lu * 20) / 20;
}

const vues = new Set<string>();
const journal: { cle: string; ms: number }[] = [];
let depuis = Date.now();
let rang = 0;
for (let tour = 0; tour < 3000; tour++) {
  const p = await lisGuide(page);
  if (!p) throw new Error("le guide ne dit plus rien");
  if (journal[journal.length - 1]?.cle !== p.cle) {
    if (journal.length) journal[journal.length - 1].ms = Date.now() - depuis;
    depuis = Date.now();
    journal.push({ cle: p.cle, ms: 0 });
    // la vue finit de se rapprocher ou de s'éloigner avant la capture et le geste
    await attends(420);
    if (!vues.has(p.cle)) { vues.add(p.cle); rang++; await photo(`${String(rang).padStart(2, "0")}-${p.cle}`); }
    continue;
  } else if (Date.now() - depuis > 60000) {
    await photo("panne");
    throw new Error(`le guide reste sur « ${p.cle} » : ${p.texte}`);
  }
  if (p.cle === "lire") {
    const lu = await lisLaLoupe();
    bilan.lus = [...((bilan.lus as number[] | undefined) ?? []), lu];
    for (const signe of lu.toFixed(2).replace(".", ",")) await page.locator(".pl-pave").getByRole("button", { name: signe, exact: true }).click();
    if (!vues.has("lire-saisie")) { vues.add("lire-saisie"); await photo(`${String(rang).padStart(2, "0")}-lire-saisie`); }
    await page.getByRole("button", { name: "Noter", exact: true }).click();
    await attends(450);
    continue;
  }
  if (await faisLeGeste(page, scene, p)) continue;
  if (p.touche) {
    const appel = p.cle === "fini";
    await page.locator(".pl-pied .pl-vise").first().click();
    await attends(450);
    if (appel) { await photo("98-confirmation"); bilan.confirmation = await e.texte(".pl-confirme span"); await page.getByRole("button", { name: "Oui, j'ai fini" }).click(); break; }
    continue;
  }
  await attends(60);
}

await banc.locator("[data-score]").waitFor({ state: "attached", timeout: 15000 });
await page.getByRole("button", { name: "Quitter la paillasse" }).click().catch(() => {});
await attends(400);
bilan.score = await banc.locator("[data-score]").getAttribute("data-score");
bilan.verdict = (await banc.locator(".tp-correction").innerText()).replace(/\s+/g, " ").trim();
bilan.mesures = await banc.locator("[data-mesures]").textContent();
bilan.consignes = journal.map((j) => `${j.cle} (${(j.ms / 1000).toFixed(1)} s)`).join(" · ");
bilan.duree = `${Math.round(journal.reduce((s, j) => s + j.ms, 0) / 1000)} s`;
bilan.largeur = await e.largeur();
bilan.erreurs = e.erreurs;
await photo("99-verdict");
console.log(JSON.stringify(bilan, null, 1));
await e.ferme();
