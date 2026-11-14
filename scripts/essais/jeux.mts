// Essai à la main des sept jeux du navigateur et de la simulation, dans un vrai navigateur : le navigateur intégré
// à l'atelier met les animations en pause. Il se connecte par le code de la boîte locale, joue chaque jeu jusqu'à
// l'écran de fin, prend des captures et écrit un bilan. À transformer en parcours Playwright (docs/04-tests-et-qualite.md).
// Il faut : le serveur sur le port 3457, la base locale, et un compte local qui a coché les fiches 1, 2 et 3.
// Usage : node scripts/essais/jeux.mts <dossier des captures> [adresse du compte local]
import { chromium, type Page } from "@playwright/test";

const BASE = "http://localhost:3457";
const SORTIE = process.argv[2]!;
const ADRESSE = process.argv[3] ?? "theo.essai@exemple.fr";
const attends = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function code(apres: number): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const d = (await (await fetch("http://127.0.0.1:54324/api/v1/messages?limit=8")).json()) as { messages: { ID: string; Created: string; To: { Address: string }[] }[] };
    const m = d.messages.find((x) => x.To.some((t) => t.Address === ADRESSE) && Date.parse(x.Created) >= apres - 2000);
    if (m) {
      const c = (await (await fetch(`http://127.0.0.1:54324/api/v1/message/${m.ID}`)).json()) as { Text: string; HTML: string };
      const t = (c.Text + " " + c.HTML.replace(/<[^>]+>/g, " ")).match(/\b\d{6}\b/);
      if (t) return t[0];
    }
    await attends(400);
  }
  throw new Error("code introuvable");
}

const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "fr-FR", timezoneId: "Europe/Paris" });
const page = await ctx.newPage();
const erreurs: string[] = [];
page.on("pageerror", (e) => erreurs.push(`erreur de page : ${e.message.slice(0, 200)}`));
page.on("console", (m) => { if (m.type() === "error") erreurs.push(`console : ${m.text().slice(0, 200)}`); });
const photo = (nom: string) => page.screenshot({ path: `${SORTIE}/${nom}.png` });
const texte = (sel: string) => page.locator(sel).first().innerText().then((t) => t.replace(/\s+/g, " ").trim()).catch(() => null);
const bilan: Record<string, unknown> = {};

await page.goto(`${BASE}/compte/connexion`);
await page.fill("#adresse", ADRESSE);
const t0 = Date.now();
await page.click("button[type=submit]");
await page.waitForSelector("#code");
await page.fill("#code", await code(t0));
await page.click("button[type=submit]");
await page.waitForURL(/\/app/);

// ---- simulation ----
const regle = (rang: number, valeur: string) => page.locator("main input[type=range]").nth(rang).evaluate((el, v) => {
  const pose = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  pose.call(el, v);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}, valeur);
await page.goto(`${BASE}/app/labo/basket/libre`);
await page.getByRole("button", { name: "Sauter" }).click();
await attends(280);
await photo("simu-saut-en-vol");
const enVol = await texte(".simu-mesures");
await attends(1000);
await photo("simu-saut-fin");
bilan.saut = { enVol, fin: await texte(".simu-mesures"), statuts: await page.locator("main [role=status]").allInnerTexts() };
await page.getByRole("button", { name: "Le tir" }).click();
await regle(1, "7.45");
await regle(2, "45");
await photo("simu-tir-avant");
await page.getByRole("button", { name: "Tirer" }).click();
await attends(450);
await photo("simu-tir-en-vol");
await attends(1500);
await photo("simu-tir-panier");
const panier = (await page.locator("main [role=status]").allInnerTexts()).map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean);
await regle(1, "7");
await regle(2, "50");
await page.getByRole("button", { name: "Tirer" }).click();
await attends(2200);
await photo("simu-tir-court");
bilan.tir = { panier, court: (await page.locator("main [role=status]").allInnerTexts()).map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean), largeur: await page.evaluate(() => document.documentElement.scrollWidth) };

// ---- jeux à réponses proposées ----
async function joueOptions(id: string, fiches: string, tours: number, pause: number) {
  await page.goto(`${BASE}/app/jeux/${id}?fiches=${fiches}`);
  await attends(700);
  await photo(`jeu-${id}-debut`);
  const debut = await texte(".jeu-cadre");
  let reponses = 0;
  for (let i = 0; i < tours; i++) {
    if (await page.locator(".jeu-fin").count()) break;
    const o = page.locator('.jeu-option:not([aria-disabled="true"])').first();
    if (await o.count()) { await o.click().catch(() => {}); reponses += 1; if (i === 0) { await attends(350); await photo(`jeu-${id}-reponse`); } }
    await attends(pause);
  }
  await page.locator(".jeu-fin").waitFor({ timeout: 12000 }).catch(() => {});
  await photo(`jeu-${id}-fin`);
  return { debut: debut?.slice(0, 220), reponses, fin: await texte(".jeu-fin"), largeur: await page.evaluate(() => document.documentElement.scrollWidth) };
}

// Pluie : la formule descend-elle ?
await page.goto(`${BASE}/app/jeux/pluie?fiches=1,2,3`);
await attends(600);
const y1 = await page.locator(".jeu-goutte").first().boundingBox();
await attends(1800);
const y2 = await page.locator(".jeu-goutte").first().boundingBox();
await photo("jeu-pluie-chute");
bilan.pluieChute = { yDebut: Math.round(y1?.y ?? -1), yApres: Math.round(y2?.y ?? -1) };
bilan.pluie = await joueOptions("pluie", "1,2,3", 12, 1700);
bilan.indices = await joueOptions("indices", "1,2,3", 10, 1700);
bilan.chapitre = await joueOptions("chapitre", "1,2,3", 12, 1700);
bilan.notion = await joueOptions("notion", "1,2,3", 12, 1700);
bilan.pluieUneFiche = await joueOptions("pluie", "4", 12, 1700);

// ---- Cartes mémoire ----
await page.goto(`${BASE}/app/jeux/cartes?fiches=1`);
await attends(600);
await photo("jeu-cartes-recto");
await page.getByRole("button", { name: "Retourner la carte" }).click();
await attends(900);
await photo("jeu-cartes-verso");
for (let i = 0; i < 30 && !(await page.locator(".jeu-fin").count()); i++) {
  const r = page.getByRole("button", { name: "Retourner la carte" });
  if (await r.count()) { await r.click(); await attends(250); }
  const s = page.getByRole("button", { name: i % 4 === 1 ? "Pas encore" : "Je la savais" });
  if (await s.count()) await s.click();
  await attends(300);
}
await photo("jeu-cartes-fin");
bilan.cartes = { fin: await texte(".jeu-fin") };
// Rejouer repart sur une partie neuve
await page.getByRole("button", { name: "Rejouer" }).click();
await attends(500);
bilan.cartesRejouer = { plateau: await page.locator(".jeu-plateau").count(), fin: await page.locator(".jeu-fin").count() };

// ---- Paires ----
await page.goto(`${BASE}/app/jeux/paires?fiches=1,2,3`);
await attends(600);
await photo("jeu-paires-debut");
const cartes = page.locator(".jeu-paire");
const nb = await cartes.count();
await cartes.nth(0).click();
await attends(300);
await cartes.nth(1).click();
await attends(350);
await photo("jeu-paires-deux-cartes");
const retournees = await page.locator(".jeu-paire.jeu-retournee").count();
await attends(1300);
bilan.paires = { cartes: nb, retourneesApresDeuxClics: retournees, apresPause: await page.locator(".jeu-paire.jeu-retournee").count(), trouvees: await page.locator(".jeu-paire.jeu-trouvee").count(), bandeau: await texte(".jeu-bandeau") };
// finir la partie en essayant les paires une à une (au plus 70 essais)
for (let essais = 0; essais < 70 && !(await page.locator(".jeu-fin").count()); essais++) {
  const libres = page.locator('.jeu-paire:not(.jeu-trouvee)');
  const n = await libres.count();
  if (n < 2) break;
  const a = essais % n, b = (a + 1 + Math.floor(essais / n)) % n;
  if (a === b) continue;
  await libres.nth(a).click().catch(() => {});
  await libres.nth(b).click().catch(() => {});
  await attends(1050);
}
await photo("jeu-paires-suite");
bilan.pairesSuite = { trouvees: await page.locator(".jeu-paire.jeu-trouvee").count(), fin: await texte(".jeu-fin") };

// ---- Relie ----
await page.goto(`${BASE}/app/jeux/relie?fiches=1,2,3`);
await attends(600);
await photo("jeu-relie-debut");
for (let tour = 0; tour < 80 && !(await page.locator(".jeu-fin").count()); tour++) {
  const gauches = page.locator('.jeu-relie-colonne').nth(0).locator('.jeu-lien:not([aria-disabled="true"])');
  const droites = page.locator('.jeu-relie-colonne').nth(1).locator('.jeu-lien:not([aria-disabled="true"])');
  const ng = await gauches.count(), nd = await droites.count();
  if (!ng || !nd) { await attends(500); continue; }
  await gauches.nth(0).click().catch(() => {});
  await droites.nth(tour % nd).click().catch(() => {});
  await attends(450);
  if (tour === 1) await photo("jeu-relie-en-cours");
}
await photo("jeu-relie-fin");
bilan.relie = { fin: await texte(".jeu-fin"), largeur: await page.evaluate(() => document.documentElement.scrollWidth) };

bilan.erreurs = erreurs;
console.log(JSON.stringify(bilan, null, 1));
await nav.close();
