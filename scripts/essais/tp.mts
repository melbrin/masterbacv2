// Essai à la main des TP virtuels dans un vrai navigateur. Il se connecte par le code de la boîte locale, fait chaque TP
// une fois avec soin (tout doit être au niveau A), une fois sans soin, prend des captures et écrit un bilan.
// À transformer en parcours Playwright (docs/04-tests-et-qualite.md).
// Il faut : le serveur sur le port 3457 et la base locale.
// Usage : node scripts/essais/tp.mts <dossier des captures> [adresse du compte local] [TP à jouer, séparés par des virgules]
import { chromium, type Page } from "@playwright/test";

const BASE = "http://localhost:3457";
const SORTIE = process.argv[2]!;
const ADRESSE = process.argv[3] ?? "theo.essai@exemple.fr";
const SEULS = process.argv[4]?.split(",") ?? null;
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
const page: Page = await ctx.newPage();
const erreurs: string[] = [];
page.on("pageerror", (e) => erreurs.push(`erreur de page : ${e.message.slice(0, 200)}`));
page.on("console", (m) => { if (m.type() === "error") erreurs.push(`console : ${m.text().slice(0, 200)}`); });
const photo = (nom: string, entiere = false) => page.screenshot({ path: `${SORTIE}/${nom}.png`, fullPage: entiere });
const texte = (sel: string) => page.locator(sel).first().innerText().then((t) => t.replace(/\s+/g, " ").trim()).catch(() => null);
const largeur = () => page.evaluate(() => document.documentElement.scrollWidth);
const bilan: Record<string, unknown> = {};
const fr = (x: number, d: number) => x.toFixed(d).replace(".", ",");

await page.goto(`${BASE}/compte/connexion`);
await page.fill("#adresse", ADRESSE);
const t0 = Date.now();
await page.click("button[type=submit]");
await page.waitForSelector("#code");
await page.fill("#code", await code(t0));
await page.click("button[type=submit]");
await page.waitForURL(/\/app/);

// ---------- les gestes communs ----------
const bouton = (nom: string | RegExp) => page.getByRole("button", { name: nom }).first();
/** Attend la correction du professeur, la lit, puis continue. */
async function corrige(nom: string, capture = false): Promise<string | null> {
  await page.locator(".tp-correction").waitFor({ timeout: 15000 });
  await attends(350);
  if (capture) await photo(`${nom}-correction`, true);
  const lu = await texte(".tp-correction");
  await bouton(/^(Continuer|Voir mon bilan)$/).click();
  await attends(350);
  return lu;
}
async function choisis(option: string, nom: string, capture = false) {
  await page.getByRole("button", { name: option, exact: true }).click();
  await bouton("Valider").click();
  return corrige(nom, capture);
}
async function saisis(valeur: string, nom: string, capture = false) {
  await page.fill(".tp-etape .labo-saisie input", valeur);
  await bouton("Valider").click();
  return corrige(nom, capture);
}
/** Remet les étapes d'un protocole dans l'ordre donné par le début de chaque étape. */
async function ordonne(debuts: string[]) {
  for (let cible = 0; cible < debuts.length; cible++) {
    const lignes = await page.locator(".ordre-jeu li .tp-ordre span:last-child").allInnerTexts();
    let place = lignes.findIndex((l) => l.trim().startsWith(debuts[cible]));
    while (place > cible) { await page.getByRole("button", { name: `Monter l'étape ${place + 1}` }).click(); place -= 1; }
  }
}
async function demarre(titre: string) {
  await page.goto(`${BASE}/app/tp`);
  await attends(400);
  const carte = page.locator(".hub-carte", { hasText: titre });
  await carte.getByRole("button").click();
  await page.waitForURL(/\/app\/tp\/essai\//);
  await attends(400);
}
const fin = async () => ({ bilan: await texte(".tp-bilan"), niveaux: await page.locator(".tp-bilan .tp-niveau").allInnerTexts(), largeur: await largeur() });

// ---------- la page des TP ----------
await page.goto(`${BASE}/app/tp`);
await attends(500);
await photo("tp-liste", true);
bilan.liste = { cartes: await page.locator(".hub-carte h3").allInnerTexts(), largeur: await largeur() };

// ---------- TP 1 : un titrage colorimétrique ----------
async function detartrant(soigne: boolean) {
  const nom = `detartrant-${soigne ? "soigne" : "bacle"}`;
  const r: Record<string, unknown> = {};
  await demarre("Un détartrant à contrôler");
  if (soigne) await photo(`${nom}-0-situation`, true);
  await bouton("J'ai lu, je commence").click();
  await attends(350);
  r.objet = await choisis(soigne ? "La concentration en acide chlorhydrique du détartrant" : "Le pH du détartrant", `${nom}-1-objet`);
  // le matériel
  if (soigne) await photo(`${nom}-2-materiel`, true);
  for (const objet of soigne ? ["Burette graduée de 25 mL", "Pipette jaugée de 10,0 mL", "Erlenmeyer de 100 mL", "Agitateur magnétique"] : ["Burette graduée de 25 mL", "Éprouvette graduée de 10 mL", "Balance"]) await page.getByRole("button", { name: objet }).click();
  await bouton("Appeler le professeur").click();
  r.materiel = await corrige(`${nom}-2-materiel`, true);
  r.indicateur = await choisis(soigne ? "Le bleu de bromothymol" : "L'hélianthine", `${nom}-3-indicateur`);
  // le protocole
  if (soigne) { await ordonne(["Rincer", "Prélever", "Ajouter", "Verser", "Noter"]); await photo(`${nom}-4-ordre`, true); }
  await bouton("Appeler le professeur").click();
  r.ordre = await corrige(`${nom}-4-ordre`, soigne);
  // la manipulation
  await photo(`${nom}-5-paillasse-debut`, true);
  r.refus = await (async () => { await bouton("1 mL").click(); return texte(".tp-paillasse .labo-verdict"); })();
  for (const g of soigne ? ["Rincer la burette", "Remplir la burette", "Ajuster le zéro", "Prélever 10,0 mL", "Ajouter l'indicateur", "Lancer l'agitation"] : ["Remplir la burette", "Prélever 10,0 mL", "Ajouter l'indicateur"]) await bouton(g).click();
  if (soigne) {
    for (let i = 0; i < 9; i++) await bouton("1 mL").click();
    await photo(`${nom}-5-paillasse-avant`);
    for (let i = 0; i < 3; i++) await bouton("0,2 mL").click();
    for (let i = 0; i < 4; i++) await bouton("1 goutte").click();
  } else {
    for (let i = 0; i < 2; i++) await bouton("5 mL").click();
    await bouton("1 mL").click();
  }
  await attends(300);
  await bouton("Noter le volume").click();
  await photo(`${nom}-5-paillasse-fin`);
  r.message = await texte(".tp-paillasse .labo-verdict");
  r.largeurPaillasse = await largeur();
  await bouton("J'ai fini").click();
  r.manipulation = await corrige(`${nom}-5-manipulation`, true);
  // l'exploitation : avec le volume noté (9,80 mL avec soin ; 11,60 mL sans : 11 mL versés, zéro non réglé)
  const VE = soigne ? 9.8 : 11.6;
  r.mesures = await texte(".tp-mesures");
  if (soigne) await photo(`${nom}-6-exploitation`, true);
  r.diluee = await saisis(soigne ? fr((0.1 * VE) / 10, 4) : "0,5", `${nom}-6-diluee`, soigne);
  r.flacon = await saisis(fr((25 * 0.1 * VE) / 10, 2), `${nom}-7-flacon`);
  r.ecart = await saisis(fr((100 * Math.abs((25 * 0.1 * VE) / 10 - 2.5)) / 2.5, 1), `${nom}-8-ecart`);
  r.conclusion = await choisis(soigne ? "Oui" : "Oui", `${nom}-9-conclusion`, true);
  await attends(700);
  await photo(`${nom}-bilan`, true);
  Object.assign(r, await fin());
  bilan[nom] = r;
}

if (!SEULS || SEULS.includes("detartrant")) {
  await detartrant(true);
  await detartrant(false);
  // reprendre un TP en cours : on recharge la page au milieu
  await demarre("Un détartrant à contrôler");
  await bouton("J'ai lu, je commence").click();
  await attends(350);
  await choisis("La concentration en acide chlorhydrique du détartrant", "reprise");
  await page.reload();
  await attends(600);
  bilan.reprise = { etape: await texte(".tp-rang"), titre: await texte(".tp-etape h2") };
}

await page.goto(`${BASE}/app/tp`);
await attends(500);
await photo("tp-liste-apres", true);
bilan.listeApres = await texte(".hub-liste");
bilan.erreurs = erreurs;
console.log(JSON.stringify(bilan, null, 1));
await nav.close();
