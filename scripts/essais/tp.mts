// Essai à la main des TP virtuels dans un vrai navigateur. Il se connecte par le code de la boîte locale, fait chaque TP
// une fois avec soin (tout doit être au niveau A), une fois sans soin, prend des captures et écrit un bilan.
// À transformer en parcours Playwright (docs/04-tests-et-qualite.md).
// Il faut : le serveur sur le port 3457 et la base locale.
// Usage : node scripts/essais/tp.mts <dossier des captures> [adresse du compte local] [TP à jouer, séparés par des virgules]
// La demande de code est limitée (cinq par heure et par adresse, dix par heure et par poste). Pour enchaîner les essais,
// la variable ESSAI_SESSION donne un fichier, hors du dépôt, où la session du compte d'essai est gardée d'un essai à l'autre :
//   ESSAI_SESSION=/tmp/session-tp.json node scripts/essais/tp.mts sorties/tp
import { existsSync, mkdirSync } from "node:fs";
import { chromium, type Page } from "@playwright/test";

const BASE = "http://localhost:3457";
const SORTIE = process.argv[2]!;
const ADRESSE = process.argv[3] ?? "theo.essai@exemple.fr";
const SEULS = process.argv[4]?.split(",") ?? null;
const SESSION = process.env.ESSAI_SESSION;
if (!SORTIE) throw new Error("Usage : node scripts/essais/tp.mts <dossier des captures> [adresse] [TP]");
mkdirSync(SORTIE, { recursive: true });
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
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "fr-FR", timezoneId: "Europe/Paris", storageState: SESSION && existsSync(SESSION) ? SESSION : undefined });
const page: Page = await ctx.newPage();
const erreurs: string[] = [];
page.on("pageerror", (e) => erreurs.push(`erreur de page : ${e.message.slice(0, 200)}`));
page.on("console", (m) => { if (m.type() === "error") erreurs.push(`console : ${m.text().slice(0, 200)}`); });
const photo = (nom: string, entiere = false) => page.screenshot({ path: `${SORTIE}/${nom}.png`, fullPage: entiere });
const texte = (sel: string) => page.locator(sel).first().innerText().then((t) => t.replace(/\s+/g, " ").trim()).catch(() => null);
const largeur = () => page.evaluate(() => document.documentElement.scrollWidth);
const bilan: Record<string, unknown> = {};
const fr = (x: number, d: number) => x.toFixed(d).replace(".", ",");

// une session gardée ouvre la page des TP ; sinon la page renvoie à la connexion, et l'essai demande un code
await page.goto(`${BASE}/app/tp`);
if (!page.url().includes("/app/tp")) {
  await page.goto(`${BASE}/compte/connexion`);
  await page.fill("#adresse", ADRESSE);
  const t0 = Date.now();
  await page.click("button[type=submit]");
  await page.waitForSelector("#code", { timeout: 10000 }).catch(async () => { throw new Error(`Pas de code : ${await page.locator("[role=alert]").first().innerText().catch(() => "la page de connexion ne répond pas")}`); });
  await page.fill("#code", await code(t0));
  await page.click("button[type=submit]");
  await page.waitForURL(/\/app/);
}
if (SESSION) await ctx.storageState({ path: SESSION });

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

// ---------- TP 2 : un titrage suivi au pH-mètre ----------
async function vinaigre(soigne: boolean) {
  const nom = `vinaigre-${soigne ? "soigne" : "bacle"}`;
  const r: Record<string, unknown> = {};
  await demarre("Le degré d'un vinaigre");
  await bouton("J'ai lu, je commence").click();
  await attends(350);
  r.eau = await choisis(soigne ? "Pour que la sonde du pH-mètre soit bien immergée" : "Pour colorer la solution", `${nom}-1-eau`);
  for (const objet of soigne ? ["Burette graduée de 25 mL", "Pipette jaugée de 10,0 mL", "Bécher de 100 mL", "pH-mètre étalonné", "Éprouvette graduée de 50 mL", "Agitateur magnétique"] : ["Burette graduée de 25 mL", "Pipette jaugée de 10,0 mL", "Bécher de 100 mL", "pH-mètre étalonné", "Agitateur magnétique"]) await page.getByRole("button", { name: objet }).click();
  await bouton("Appeler le professeur").click();
  r.materiel = (await corrige(`${nom}-2-materiel`))?.slice(0, 60);
  r.ajouts = await choisis(soigne ? "Par ajouts plus petits quand le pH monte vite, en continuant après le saut" : "D'un seul trait, jusqu'à 25 mL", `${nom}-3-ajouts`);
  if (soigne) await ordonne(["Rincer", "Prélever", "Plonger", "Verser", "Tracer"]);
  await bouton("Appeler le professeur").click();
  r.ordre = (await corrige(`${nom}-4-ordre`))?.slice(0, 40);
  for (const g of ["Rincer la burette", "Remplir la burette", "Ajuster le zéro", "Prélever 10,0 mL", "Plonger la sonde", "Lancer l'agitation"]) await bouton(g).click();
  if (soigne) {
    for (let i = 0; i < 12; i++) await bouton("1 mL").click();
    await photo(`${nom}-5-paillasse-avant`);
    for (let i = 0; i < 10; i++) await bouton("0,2 mL").click();
    for (let i = 0; i < 3; i++) await bouton("1 mL").click();
  } else {
    for (let i = 0; i < 4; i++) await bouton("5 mL").click();
  }
  await page.fill("#tp-lecture", soigne ? "13,1" : "12");
  await bouton("Noter ce volume").click();
  await attends(300);
  await photo(`${nom}-5-paillasse-fin`);
  r.message = await texte(".tp-paillasse .labo-verdict");
  r.releves = await page.locator(".tp-releves li").count();
  r.largeurPaillasse = await largeur();
  await bouton("J'ai fini").click();
  r.manipulation = await corrige(`${nom}-5-manipulation`, true);
  const VE = soigne ? 13.1 : 12;
  const C = (10 * 0.1 * VE) / 10;
  r.diluee = await saisis(fr(C / 10, 3), `${nom}-6-diluee`);
  r.flacon = await saisis(fr(C, 2), `${nom}-7-flacon`);
  r.masse = await saisis(fr(C * 60, 1), `${nom}-8-masse`);
  r.degre = await saisis(fr((C * 60 * 100) / 1010, 1), `${nom}-9-degre`, soigne);
  r.conclusion = await choisis(soigne ? "Oui" : "Non", `${nom}-10-conclusion`);
  await attends(700);
  await photo(`${nom}-bilan`, true);
  Object.assign(r, await fin());
  bilan[nom] = r;
}
// ---------- TP 3 et 4 : la paillasse Circuits ----------
/** Pose un fil entre deux bornes, nommées comme la paillasse les annonce. */
async function fil(a: string, b: string) {
  await page.locator(`.tp-borne[aria-label="Borne : ${a}"]`).click();
  await page.locator(`.tp-borne[aria-label="Borne : ${b}"]`).click();
}
const glisse = (valeur: string) => page.locator("#tp-curseur").evaluate((el, v) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, v);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}, valeur);

async function condensateur(soigne: boolean) {
  const nom = `condensateur-${soigne ? "soigne" : "bacle"}`;
  const r: Record<string, unknown> = {};
  await demarre("Un condensateur sans étiquette");
  await bouton("J'ai lu, je commence").click();
  await attends(350);
  r.grandeur = await choisis("La tension aux bornes du condensateur", `${nom}-1`);
  r.serie = await choisis(soigne ? "En série : une seule boucle" : "En dérivation : chacun aux bornes du générateur", `${nom}-2`);
  r.voie = await choisis(soigne ? "Aux deux bornes du condensateur" : "Aux deux bornes de la résistance", `${nom}-3`);
  r.seuil = await saisis(soigne ? "3,15" : "2,5", `${nom}-4`);
  if (soigne) await ordonne(["Relier", "Brancher", "Lancer", "Attendre", "Lire"]);
  await bouton("Appeler le professeur").click();
  r.ordre = (await corrige(`${nom}-5`))?.slice(0, 30);
  await photo(`${nom}-6-paillasse-debut`);
  // une acquisition sans aucun fil : le circuit est ouvert
  await bouton("Lancer l'acquisition").click();
  await attends(600);
  r.sansFil = await texte(".tp-paillasse .labo-verdict");
  await bouton("Le montage").click();
  await fil("la borne + du générateur", "l'interrupteur, à gauche");
  await fil("l'interrupteur, à droite", "la résistance, à gauche");
  await fil("la résistance, à droite", "le condensateur, en haut");
  await fil("le condensateur, en bas", "la borne − du générateur");
  if (soigne) { await fil("la voie de mesure", "le condensateur, en haut"); await fil("la masse", "le condensateur, en bas"); }
  else { await fil("la voie de mesure", "la résistance, à gauche"); await fil("la masse", "la résistance, à droite"); }
  await attends(200);
  await photo(`${nom}-6-paillasse-montage`);
  r.fils = await page.locator(".tp-fils li").count();
  await bouton("Lancer l'acquisition").click();
  await attends(1500);
  await photo(`${nom}-6-paillasse-acquisition`);
  await attends(2300);
  r.apresAcquisition = await texte(".tp-paillasse .labo-verdict");
  await glisse(soigne ? "3.3" : "6");
  await attends(200);
  await bouton("Noter ce temps").click();
  await attends(200);
  await photo(`${nom}-6-paillasse-fin`);
  r.largeurPaillasse = await largeur();
  await bouton("J'ai fini").click();
  r.manipulation = await corrige(`${nom}-6-manipulation`, true);
  const tau = soigne ? 3.3 : 6;
  const C = (tau / 10000) * 1e6;
  const proche = [220, 330, 470].reduce((m, c) => (Math.abs(c - C) < Math.abs(m - C) ? c : m));
  r.capacite = await saisis(fr(C, 0), `${nom}-7`);
  r.lequel = await choisis(`${proche} µF`, `${nom}-8`);
  r.ecart = await saisis(fr((100 * Math.abs(C - proche)) / proche, 1), `${nom}-9`);
  r.compatible = await choisis((100 * Math.abs(C - proche)) / proche <= 10 ? "Oui" : "Non", `${nom}-10`);
  await attends(700);
  await photo(`${nom}-bilan`, true);
  Object.assign(r, await fin());
  bilan[nom] = r;
}

async function jauge() {
  const r: Record<string, unknown> = {};
  await demarre("Une jauge de niveau d'eau");
  await photo("jauge-0-situation", true);
  await bouton("J'ai lu, je commence").click();
  await attends(350);
  r.mesure = await choisis("Le temps caractéristique de la charge du capteur", "jauge-1");
  r.seuil = await choisis("3,15 V", "jauge-2");
  r.a0 = await choisis("Au point commun à la résistance et au capteur", "jauge-3");
  await ordonne(["Câbler", "Lancer", "Ajouter", "Recommencer", "Comparer"]);
  await bouton("Appeler le professeur").click();
  r.ordre = (await corrige("jauge-4"))?.slice(0, 30);
  // une mesure avec un montage incomplet : le microcontrôleur n'affiche rien
  await fil("la broche D2", "la résistance, à gauche");
  await fil("la résistance, à droite", "la plaque gauche du capteur");
  await bouton("Lancer la mesure").click();
  r.incomplet = await texte(".tp-paillasse .labo-verdict");
  await fil("la plaque droite du capteur", "la broche GND");
  await fil("la broche A0", "la plaque gauche du capteur");
  await bouton("Lancer la mesure").click();
  for (const niveau of ["4 cm", "8 cm"]) { await page.getByRole("button", { name: niveau, exact: true }).click(); await bouton("Lancer la mesure").click(); }
  await attends(300);
  await photo("jauge-5-paillasse");
  r.mesures = await page.locator(".tp-releves li").allInnerTexts();
  r.largeurPaillasse = await largeur();
  await bouton("J'ai fini").click();
  r.manipulation = await corrige("jauge-5-manipulation", true);
  r.vide = await saisis("100", "jauge-6");
  r.pente = await saisis("40", "jauge-7");
  r.loi = await choisis("Oui : τ augmente de la même valeur chaque fois que le niveau monte de 2 cm", "jauge-8");
  r.niveau = await saisis("5,25", "jauge-9");
  await attends(700);
  await photo("jauge-bilan", true);
  Object.assign(r, await fin());
  bilan.jauge = r;
}
if (!SEULS || SEULS.includes("condensateur")) {
  await condensateur(true);
  await condensateur(false);
}
if (!SEULS || SEULS.includes("jauge")) await jauge();

if (!SEULS || SEULS.includes("vinaigre")) {
  await vinaigre(true);
  await vinaigre(false);
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
  const rechargee = { etape: await texte(".tp-rang"), titre: await texte(".tp-etape h2") };
  // puis on revient par la page des TP, qui propose de reprendre
  await page.goto(`${BASE}/app/tp`);
  await attends(500);
  const carte = page.locator(".hub-carte", { hasText: "Un détartrant à contrôler" });
  const boutons = await carte.locator(".actions").innerText().then((t) => t.replace(/\s+/g, " ").trim());
  await carte.getByRole("link", { name: "Reprendre le TP" }).click();
  await page.waitForURL(/\/app\/tp\/essai\//);
  await attends(500);
  bilan.reprise = { rechargee, boutons, parLaPage: { etape: await texte(".tp-rang"), titre: await texte(".tp-etape h2") } };
}

await page.goto(`${BASE}/app/tp`);
await attends(500);
await photo("tp-liste-apres", true);
bilan.listeApres = await texte(".hub-liste");
bilan.erreurs = erreurs;
console.log(JSON.stringify(bilan, null, 1));
await nav.close();
