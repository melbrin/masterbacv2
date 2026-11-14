// Essai à la main du guide de la paillasse Titrage, dans un vrai navigateur, à la souris seulement, sur le banc d'essai
// local. Le robot (titrage-robot.mts) fait le geste que la main du guide montre, garde l'appui tant que la consigne ne
// change pas, lit la burette dans la loupe et place le repère sur la courbe comme un élève, puis appelle le professeur.
// Attendu : aucune faute, et le score plafonné du guide (0,75). Il prend une capture à chaque nouvelle consigne : il
// faut les regarder.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/titrage-guide.mts <dossier des captures> [detartrant|vinaigre|serum] [graine] [largeur] [hauteur]
import { BASE, attends, ouvre } from "./outils.mts";
import { suisLeGuideDuTitrage } from "./titrage-robot.mts";

const [sortie, tp = "detartrant", graine = "1", largeur = "390", hauteur = "844"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/titrage-guide.mts <dossier des captures> [tp] [graine] [largeur] [hauteur]");
const e = await ouvre({ sortie, largeur: Number(largeur), hauteur: Number(hauteur), guide: true });
const page = e.page;
const bilan: Record<string, unknown> = { tp, graine: Number(graine), fenetre: `${largeur} x ${hauteur}` };

await page.goto(`${BASE}/app/tp/banc/${tp}?graine=${graine}`);
await attends(500);
await e.photo("00-porte");
await page.getByRole("button", { name: "Ouvrir la paillasse" }).click();
await attends(900);
const suivi = await suisLeGuideDuTitrage(e, { conducti: tp === "serum", photos: "" });

await page.waitForSelector("[data-score]", { timeout: 15000 });
await page.getByRole("button", { name: "Quitter la paillasse" }).click().catch(() => {});
await attends(400);
bilan.lu = suivi.lu ?? suivi.repere;
bilan.confirmation = suivi.confirmation;
bilan.score = await page.locator("[data-score]").getAttribute("data-score");
bilan.verdict = await e.texte(".tp-correction");
bilan.mesures = await e.texte("[data-mesures]");
bilan.consignes = suivi.consignes.map((c) => `${c.cle} (${(c.ms / 1000).toFixed(1)} s)`).join(" · ");
bilan.duree = `${Math.round(suivi.consignes.reduce((s, c) => s + c.ms, 0) / 1000)} s`;
bilan.largeur = await e.largeur();
bilan.erreurs = e.erreurs;
await e.photo("99-verdict", true);
console.log(JSON.stringify(bilan, null, 1));
await e.ferme();
