// Essai à la main du cadre des TP dans un vrai navigateur : chaque TP de la page est commencé, déroulé jusqu'au bilan
// avec des réponses prises au hasard et sans manipuler, comme un élève qui passerait vite. Il vérifie que toutes les
// étapes s'affichent, que le professeur corrige chacune, que la paillasse s'ouvre en plein écran, que le bilan arrive,
// que rien ne déborde en largeur et que la console reste propre. Puis il quitte un TP en route et le reprend.
// La justesse des réponses et des manipulations est vérifiée ailleurs : par les tests (tests/unitaires/tp/) et par
// l'essai de chaque paillasse sur le banc (scripts/essais/titrage.mts, etc.).
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/tp.mts <dossier des captures> [TP à jouer, séparés par des virgules]
import type { Page } from "@playwright/test";
import { BASE, attends, ouvre } from "./outils.mts";

const [sortie, seuls] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/tp.mts <dossier des captures> [TP]");
const e = await ouvre({ sortie });
const page: Page = e.page;
const bilan: Record<string, unknown> = {};

/** Le bouton visible qui porte ce nom, s'il existe. */
const bouton = (nom: string | RegExp) => page.getByRole("button", { name: nom }).first();
const present = async (nom: string | RegExp) => (await bouton(nom).count()) > 0 && (await bouton(nom).isVisible());

/** Répond à l'étape affichée, sans chercher à avoir juste. Rend le genre de l'étape, ou null au bilan. */
async function repond(photo: string | null): Promise<string | null> {
  if ((await page.locator(".tp-bilan").count()) > 0) return null;
  if (await present("J'ai lu, je commence")) { await bouton("J'ai lu, je commence").click(); return "lecture"; }
  if (await present("Ouvrir la paillasse")) {
    await bouton("Ouvrir la paillasse").click();
    await attends(900);
    if (photo) await e.photo(`${photo}-paillasse`);
    const plein = await page.locator(".pl-etabli").evaluate((el) => { const r = el.getBoundingClientRect(); return r.width >= window.innerWidth - 1 && r.height >= window.innerHeight - 1; }).catch(() => false);
    if (!plein) throw new Error("la paillasse ne prend pas tout l'écran");
    await bouton("J'ai fini").click();
    await bouton(/Oui, j'ai fini/).click();
    return "paillasse";
  }
  if ((await page.locator(".tp-tiroir").count()) > 0) { await page.locator(".tp-tiroir button").first().click(); await bouton("Appeler le professeur").click(); return "materiel"; }
  if ((await page.locator(".ordre-jeu").count()) > 0) { await bouton("Appeler le professeur").click(); return "ordre"; }
  if ((await page.locator(".tp-options").count()) > 0) { await page.locator(".tp-options button").first().click(); await bouton("Valider").click(); return "choix"; }
  if ((await page.locator(".tp-etape input[inputmode=decimal]").count()) > 0) { await page.locator(".tp-etape input[inputmode=decimal]").fill("1"); await bouton("Valider").click(); return "valeur"; }
  throw new Error("étape inconnue à l'écran");
}

/** Déroule le TP ouvert jusqu'à son bilan. */
async function deroule(id: string): Promise<Record<string, unknown>> {
  const genres: string[] = [];
  let largeur = 0;
  for (let i = 0; i < 40; i++) {
    await attends(350);
    largeur = Math.max(largeur, await e.largeur());
    const genre = await repond(genres.includes("paillasse") ? null : id);
    if (genre === null) break;
    genres.push(genre);
    if (genre !== "lecture") {
      // le professeur corrige : la correction s'affiche, puis « Continuer » ou « Voir mon bilan »
      await page.waitForSelector(".tp-correction", { timeout: 15000 });
      largeur = Math.max(largeur, await e.largeur());
      await bouton(/Continuer|Voir mon bilan/).click();
    }
  }
  await page.waitForSelector(".tp-bilan", { timeout: 15000 });
  await attends(500);
  await e.photo(`${id}-bilan`, true);
  return { etapes: genres.length, genres: genres.join(" "), niveaux: (await page.locator(".tp-bilan .tp-niveau").allInnerTexts()).join(" "), largeur };
}

// ---------- la page des TP ----------
await page.goto(`${BASE}/app/tp`);
await attends(700);
await e.photo("tp-accueil", true);
const titres = await page.locator("main h3").allInnerTexts();
bilan.accueil = { tp: titres.length, largeur: await e.largeur() };

// ---------- chaque TP, du début au bilan ----------
for (const titre of titres) {
  await page.goto(`${BASE}/app/tp`);
  await attends(500);
  const carte = page.locator("main li").filter({ has: page.getByRole("heading", { name: titre, exact: true }) }).first();
  await carte.getByRole("button").last().click();
  await page.waitForURL(/\/app\/tp\/essai\//);
  const id = titre.toLowerCase().normalize("NFD").replace(/[^a-z]+/g, "-").slice(0, 28);
  if (seuls && !seuls.split(",").some((s) => id.includes(s))) continue;
  try {
    bilan[titre] = await deroule(id);
  } catch (erreur) {
    await e.photo(`${id}-panne`, true);
    bilan[titre] = { panne: String(erreur).slice(0, 300) };
  }
}

// ---------- quitter un TP en route, puis le reprendre ----------
if (!seuls && titres.length > 0) {
  await page.goto(`${BASE}/app/tp`);
  await attends(500);
  const carte = () => page.locator("main li").filter({ has: page.getByRole("heading", { name: titres[0], exact: true }) }).first();
  await carte().getByRole("button").last().click();
  await page.waitForURL(/\/app\/tp\/essai\//);
  await attends(400);
  await repond(null); // la lecture
  await attends(500);
  const avant = await e.texte(".tp-rang");
  await page.goto(`${BASE}/app/tp`);
  await attends(600);
  const actions = await carte().locator(".actions").innerText().then((t) => t.replace(/\s+/g, " ").trim());
  await carte().getByRole("link", { name: "Reprendre le TP" }).click();
  await page.waitForURL(/\/app\/tp\/essai\//);
  await attends(500);
  bilan.reprise = { avant, actions, apres: await e.texte(".tp-rang") };
}

bilan.erreurs = e.erreurs;
console.log(JSON.stringify(bilan, null, 1));
await e.ferme();
