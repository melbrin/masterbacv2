// Essai à la main de la page d'accueil et de son test, dans un vrai navigateur, comme un visiteur sans compte :
// il arrive sur la page d'accueil, lance le test, coche deux chapitres, répond à toutes les questions (sans voir de
// correction), arrive sur « Tes résultats sont prêts », donne une adresse neuve, entre le code reçu dans la boîte
// locale, remplit son profil, et doit arriver sur son parcours avec le résultat de son test. Il vérifie aussi qu'un
// visiteur ne voit jamais son score avant d'avoir un compte, et que les anciennes adresses ne répondent plus.
// Usage : node scripts/essais/test-accueil.mts <dossier des captures> <adresse neuve> [largeur] [hauteur]
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import { BASE, attends, code } from "./outils.mts";

const [sortie, adresse, largeur = "390", hauteur = "844"] = process.argv.slice(2);
if (!sortie || !adresse) throw new Error("Usage : node scripts/essais/test-accueil.mts <dossier des captures> <adresse neuve> [largeur] [hauteur]");
mkdirSync(sortie, { recursive: true });
const L = Number(largeur);
const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: L, height: Number(hauteur) }, deviceScaleFactor: 2, locale: "fr-FR", timezoneId: "Europe/Paris", hasTouch: L < 700 });
const page = await ctx.newPage();
const erreurs: string[] = [];
page.on("pageerror", (e) => erreurs.push(`erreur de page : ${e.message.slice(0, 200)}`));
page.on("console", (m) => { if (m.type() === "error") erreurs.push(`console : ${m.text().slice(0, 200)}`); });
const ecarts: string[] = [];
const bilan: Record<string, unknown> = { adresse, fenetre: `${largeur} x ${hauteur}` };
const attendu = (vrai: boolean, quoi: string) => { if (!vrai) ecarts.push(quoi); };
let rang = 0;
const photo = async (nom: string) => { rang++; await page.screenshot({ path: `${sortie}/${String(rang).padStart(2, "0")}-${nom}.png`, fullPage: true }); };
const large = async (nom: string) => { const w = await page.evaluate(() => document.documentElement.scrollWidth); attendu(w <= L, `${nom} : le contenu fait ${w} points de large`); };
const texte = async (s: string) => (await page.locator(s).first().innerText().catch(() => "")).replace(/\s+/g, " ").trim();

try {
  // ----- la page d'accueil -----
  await page.goto(`${BASE}/`);
  await attends(500);
  await photo("accueil");
  await large("accueil");
  bilan.accueil = { titre: await texte("h1"), bouton: await texte(".accueil-bouton") };
  attendu((await texte("h1")).length > 10, "la page d'accueil n'a pas de titre");
  for (const ancienne of ["/quiz", "/results", "/elite"]) attendu((await page.request.get(`${BASE}${ancienne}`)).status() === 404, `l'ancienne adresse ${ancienne} répond encore`);
  // sans test commencé, la page des résultats renvoie au test
  await page.goto(`${BASE}/test/resultats`);
  attendu(new URL(page.url()).pathname === "/test", "la page des résultats s'ouvre sans test");

  // ----- le test : les chapitres, puis les questions, sans correction -----
  await page.goto(`${BASE}/`);
  await page.locator(".accueil-bouton").first().click();
  await page.waitForURL(`${BASE}/test`);
  await attends(400);
  await photo("chapitres");
  await large("chapitres");
  const cases = page.locator("label.case input[type=checkbox]");
  bilan.chapitres = await cases.count();
  await cases.nth(0).check();
  await cases.nth(Math.min(8, (await cases.count()) - 1)).check();
  await page.getByRole("button", { name: "Commencer le test" }).click();
  await page.locator("#quiz").waitFor({ timeout: 20000 });
  const genres: string[] = [];
  let fuite = false;
  for (let i = 0; i < 20; i++) {
    await attends(350);
    if (new URL(page.url()).pathname !== "/test") break;
    const avant = await texte(".progression-q span");
    if (i === 0) { await photo("question"); await large("question"); }
    genres.push(await texte(".meta span:last-child"));
    if ((await page.locator("#rep-trou").count()) > 0) { await page.fill("#rep-trou", "x"); await page.getByRole("button", { name: "Valider" }).click(); }
    else if ((await page.locator(".options button").count()) > 0) await page.locator(".options button").first().click();
    else await page.getByRole("button", { name: /Valider/ }).first().click();
    await page.waitForFunction((a) => location.pathname !== "/test" || document.querySelector(".progression-q span")?.textContent !== a, avant, { timeout: 20000 });
    // le visiteur ne doit voir ni verdict ni bonne réponse
    if (/bonne réponse|Ce n'est pas ça|Bien vu|Juste|Faux !/i.test(await page.locator("body").innerText())) fuite = true;
  }
  bilan.questions = { nombre: genres.length, genres: [...new Set(genres)] };
  attendu(!fuite, "le test montre une correction avant la création du compte");
  await page.waitForURL(`${BASE}/test/resultats`, { timeout: 20000 });
  await attends(400);
  await photo("resultats-prets");
  await large("résultats");
  bilan.fin = { titre: await texte("h1"), phrase: await texte(".sous-titre") };
  attendu(!/\d+\s*(sur|\/)\s*\d+/.test(await texte("main")), "la page de fin montre un score");
  // revenir sur le test ne le rouvre pas
  await page.goto(`${BASE}/test`);
  attendu(new URL(page.url()).pathname === "/test/resultats", "le test terminé se rouvre");

  // ----- le compte : adresse, code, profil, puis les résultats dans le parcours -----
  await page.fill("#adresse", adresse);
  const t0 = Date.now();
  await page.click("button[type=submit]");
  await page.waitForSelector("#code", { timeout: 15000 });
  await page.fill("#code", await code(adresse, t0));
  await page.click("button[type=submit]");
  await page.waitForURL(/\/compte\/profil/, { timeout: 20000 });
  await page.fill("#prenom", "Inès");
  await page.getByRole("radio", { name: "Oui" }).click();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL(/\/app\/parcours/, { timeout: 30000 });
  await attends(700);
  await photo("parcours-avec-le-resultat");
  await large("parcours");
  bilan.arrivee = { adresse: new URL(page.url()).pathname + new URL(page.url()).search, carte: await texte("section.carte.fete, section.carte"), paliers: await page.locator(".section-titre h2").allInnerTexts() };
  attendu(/résultat de ton test/i.test(await texte("main")), "le parcours ne montre pas le résultat du test");
  attendu(new RegExp(`/${genres.length}\\b`).test(await texte(".score-final")), `le score n'est pas sur ${genres.length} questions : ${await texte(".score-final")}`);
  // les réponses comptent dans les progrès, et les chapitres du test sont vus en classe
  await page.goto(`${BASE}/app/progres`);
  await attends(500);
  bilan.progres = (await page.locator(".chiffres-cles .carte").allInnerTexts()).map((t) => t.replace(/\s+/g, " ")).slice(0, 3);
  attendu(new RegExp(`^${genres.length} réponses? données?`).test(String((bilan.progres as string[])[1])), `les réponses du test ne comptent pas dans les progrès : ${(bilan.progres as string[])[1]}`);
  // l'accueil renvoie maintenant dans l'application
  await page.goto(`${BASE}/`);
  attendu(new URL(page.url()).pathname === "/app", "un élève connecté reste sur la page d'accueil");
} catch (panne) {
  bilan.arret = panne instanceof Error ? panne.message.slice(0, 500) : String(panne);
  ecarts.push("l'essai s'est arrêté avant la fin");
  await photo("arret").catch(() => {});
}
bilan.erreurs = erreurs;
bilan.ecarts = ecarts;
console.log(JSON.stringify(bilan, null, 1));
await nav.close();
