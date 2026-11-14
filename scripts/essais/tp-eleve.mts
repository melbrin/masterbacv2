// Essai à la main d'un TP de titrage entier, dans son vrai cadre, comme un bon élève qui se sert du guide : il part de
// la page des TP, lit la situation, répond juste aux questions, choisit le matériel, remet le protocole dans l'ordre,
// manipule à la souris en suivant la main du guide (titrage-robot.mts), puis calcule avec SA mesure, lue dans la
// correction de la manipulation. Attendu : A partout, sauf B pour « Réaliser » (le guide a servi), et une correction
// qui le dit. C'est l'essai de bout en bout d'un TP : chaque étape, du début au bilan.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/tp-eleve.mts <dossier des captures> [detartrant|vinaigre|serum] [largeur] [hauteur]
import type { Page } from "@playwright/test";
import { BASE, attends, ouvre } from "./outils.mts";
import { suisLeGuideDuTitrage } from "./titrage-robot.mts";

const [sortie, tp = "detartrant", largeur = "390", hauteur = "844"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/tp-eleve.mts <dossier des captures> [tp] [largeur] [hauteur]");

/** Ce que sait le bon élève d'un TP : le début de chaque question, et sa réponse. `VE` : son volume à l'équivalence, en mL. */
interface Savoir {
  titre: string;
  /** le début de la question, et le début de la bonne option (qui peut dépendre de la mesure) */
  choix: [string, string | ((VE: number) => string)][];
  /** le début du nom de chaque objet utile */
  materiel: string[];
  /** le début de chaque étape du protocole, dans le bon ordre */
  ordre: string[];
  /** le début de la question, et le calcul à partir de la mesure */
  valeurs: [string, (VE: number) => number][];
}
const SAVOIRS: Record<string, Savoir> = {
  detartrant: {
    titre: "Un détartrant à contrôler",
    choix: [["Que cherche-t-on", "La concentration en acide chlorhydrique"], ["Quel indicateur", "Le bleu de bromothymol"],
      ["D'après ta mesure", (VE) => (Math.abs(25 * 0.1 * VE / 10 - 2.5) / 2.5 <= 0.05 ? "Oui" : "Non")]],
    materiel: ["Burette", "Pipette jaugée", "Erlenmeyer", "Agitateur"],
    ordre: ["Rincer la burette", "Prélever", "Ajouter quelques gouttes", "Verser la soude", "Noter le volume"],
    valeurs: [["Calcule la concentration en acide", (VE) => 0.1 * VE / 10], ["Déduis-en la concentration du détartrant", (VE) => 25 * 0.1 * VE / 10],
      ["Calcule l'écart relatif", (VE) => 100 * Math.abs(25 * 0.1 * VE / 10 - 2.5) / 2.5]],
  },
  vinaigre: {
    titre: "Le degré d'un vinaigre",
    choix: [["Pourquoi ajoute-t-on", "Pour que la sonde"], ["Comment verser la soude", "Par ajouts plus petits"],
      ["D'après ta mesure", (VE) => (Math.abs(0.1 * VE * 60 / 1010 * 100 - 8) / 8 <= 0.05 ? "Oui" : "Non")]],
    materiel: ["Burette", "Pipette jaugée", "Bécher", "pH-mètre", "Éprouvette", "Agitateur"],
    ordre: ["Rincer la burette", "Prélever", "Plonger la sonde", "Verser la soude", "Tracer la courbe"],
    valeurs: [["Calcule la concentration en acide éthanoïque", (VE) => 0.1 * VE / 10], ["Déduis-en la concentration du vinaigre", (VE) => 0.1 * VE],
      ["Calcule la masse d'acide", (VE) => 0.1 * VE * 60], ["Calcule le degré", (VE) => 0.1 * VE * 60 / 1010 * 100]],
  },
  serum: {
    titre: "Un sérum physiologique à contrôler",
    choix: [["Quels ions", "Les ions chlorure"], ["Avant l'équivalence", "Elle baisse un peu"], ["Comment verser le nitrate", "Par ajouts réguliers"],
      ["D'après ta mesure", (VE) => (Math.abs(0.01 * VE * 58.5 - 9) / 9 <= 0.05 ? "Oui" : "Non")]],
    materiel: ["Burette", "Pipette jaugée", "Bécher", "Conductimètre", "Pissette", "Agitateur"],
    ordre: ["Rincer la burette", "Prélever", "Plonger la sonde", "Verser le nitrate", "Tracer la courbe"],
    valeurs: [["Calcule la concentration en ions chlorure", (VE) => 0.01 * VE / 10], ["Déduis-en la concentration en masse", (VE) => 0.01 * VE * 58.5],
      ["Calcule l'écart relatif", (VE) => 100 * Math.abs(0.01 * VE * 58.5 - 9) / 9]],
  },
};
const savoir = SAVOIRS[tp];
if (!savoir) throw new Error(`TP inconnu : ${tp}`);

const e = await ouvre({ sortie, largeur: Number(largeur), hauteur: Number(hauteur), guide: true });
const page: Page = e.page;
const bilan: Record<string, unknown> = { tp, fenetre: `${largeur} x ${hauteur}` };
const bouton = (nom: string | RegExp) => page.getByRole("button", { name: nom }).first();
const visible = async (selecteur: string) => (await page.locator(selecteur).count()) > 0;
const etapes: string[] = [];
let VE = 0;
let largeurMax = 0;
let rang = 0;
const photo = async (nom: string) => { rang++; await e.photo(`${String(rang).padStart(2, "0")}-${nom}`, true); };

// ----- de la page des TP jusqu'au TP -----
await page.goto(`${BASE}/app/tp`);
await attends(600);
await photo("page-des-tp");
const carte = page.locator("main li").filter({ has: page.getByRole("heading", { name: savoir.titre, exact: true }) }).first();
await carte.getByRole("button").last().click();
await page.waitForURL(/\/app\/tp\/essai\//);

/** Le texte de la question affichée. */
const question = async () => (await e.texte(".tp-etape h2")) ?? "";
/** La réponse du bon élève à ce qui est à l'écran. Rend le genre de l'étape, ou null au bilan. */
async function repond(): Promise<string | null> {
  if (await visible(".tp-bilan")) return null;
  if ((await bouton("J'ai lu, je commence").count()) > 0) { await photo("situation"); await bouton("J'ai lu, je commence").click(); return "lecture"; }
  if ((await bouton("Ouvrir la paillasse").count()) > 0) {
    await photo("avant-la-paillasse");
    await bouton("Ouvrir la paillasse").click();
    await attends(900);
    const suivi = await suisLeGuideDuTitrage(e, { conducti: tp === "serum" });
    bilan.manipulation = { consignes: suivi.consignes.length, duree: `${Math.round(suivi.consignes.reduce((s, c) => s + c.ms, 0) / 1000)} s`, lu: suivi.lu ?? suivi.repere, confirmation: suivi.confirmation };
    return "paillasse";
  }
  if (await visible(".tp-tiroir")) {
    for (const nom of savoir.materiel) await page.locator(".tp-tiroir button").filter({ hasText: new RegExp(`^${nom}`) }).first().click();
    await photo("materiel");
    await bouton("Appeler le professeur").click();
    return "materiel";
  }
  if (await visible(".ordre-jeu")) {
    // il remonte chaque étape à sa place, avec les flèches
    for (const [place, debut] of savoir.ordre.entries()) {
      const textes = await page.locator(".ordre-jeu .tp-ordre span:last-child").allInnerTexts();
      const ici = textes.findIndex((t) => t.startsWith(debut));
      if (ici < 0) throw new Error(`étape du protocole introuvable : ${debut}`);
      for (let i = ici; i > place; i--) { await page.getByRole("button", { name: `Monter l'étape ${i + 1}`, exact: true }).click(); await attends(60); }
    }
    await photo("protocole-en-ordre");
    await bouton("Appeler le professeur").click();
    return "ordre";
  }
  if (await visible(".tp-options")) {
    const q = await question();
    const connu = savoir.choix.find(([debut]) => q.startsWith(debut));
    if (!connu) throw new Error(`question inconnue : ${q}`);
    const reponse = typeof connu[1] === "function" ? connu[1](VE) : connu[1];
    await page.locator(".tp-options button").filter({ hasText: new RegExp(`^${reponse}`) }).first().click();
    await bouton("Valider").click();
    return "choix";
  }
  if (await visible(".tp-etape input[inputmode=decimal]")) {
    const q = await question();
    const connu = savoir.valeurs.find(([debut]) => q.startsWith(debut));
    if (!connu) throw new Error(`calcul inconnu : ${q}`);
    // il calcule avec sa mesure, et écrit quatre chiffres significatifs, à la française
    await page.locator(".tp-etape input[inputmode=decimal]").fill(Number(connu[1](VE).toPrecision(4)).toString().replace(".", ","));
    await bouton("Valider").click();
    return "valeur";
  }
  throw new Error("étape inconnue à l'écran");
}

// ----- chaque étape, jusqu'au bilan -----
const verdicts: string[] = [];
for (let i = 0; i < 40; i++) {
  await attends(350);
  largeurMax = Math.max(largeurMax, await e.largeur());
  const genre = await repond();
  if (genre === null) break;
  etapes.push(genre);
  if (genre === "lecture") continue;
  await page.waitForSelector(".tp-correction", { timeout: 20000 });
  await attends(300);
  const verdict = (await e.texte(".tp-correction .verdict b")) ?? "";
  verdicts.push(`${genre} : ${verdict}`);
  if (genre === "paillasse") {
    await photo("correction-de-la-manipulation");
    bilan.correction = await e.texte(".tp-correction");
    // sa mesure : « Ton volume à l'équivalence : VE = 10,05 mL. »
    const lu = ((await e.texte(".tp-correction .tp-mesures")) ?? "").match(/=\s*(\d+,\d+)\s*mL/);
    if (!lu) throw new Error("la correction ne donne pas le volume à l'équivalence");
    VE = Number(lu[1].replace(",", "."));
    bilan.VE = VE;
  } else if (genre === "valeur" || genre === "choix") await photo(`correction-${genre}-${etapes.length}`);
  largeurMax = Math.max(largeurMax, await e.largeur());
  await bouton(/Continuer|Voir mon bilan/).click();
}
await page.waitForSelector(".tp-bilan", { timeout: 15000 });
await attends(600);
await photo("bilan");
bilan.etapes = etapes.join(" ");
bilan.verdicts = verdicts;
bilan.niveaux = (await page.locator(".tp-bilan .tp-niveaux li").allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim());
bilan.largeur = largeurMax;
bilan.erreurs = e.erreurs;
console.log(JSON.stringify(bilan, null, 1));
await e.ferme();
