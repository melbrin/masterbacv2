// Essai à la main du labo dans un vrai navigateur : le navigateur intégré à l'atelier met les animations en pause.
// Il se connecte par le code de la boîte locale, joue les quinze défis (une valeur fausse d'abord sur le premier défi
// de chaque simulation, puis la bonne), prend des captures et écrit un bilan.
// À transformer en parcours Playwright (docs/04-tests-et-qualite.md).
// Il faut : le serveur sur le port 3457, la base locale, et un compte local sans ligne dans la table `defis`
// pour les simulations jouées.
// Usage : node scripts/essais/labo.mts <dossier des captures> [adresse du compte local] [simulations à jouer, séparées par des virgules]
import { chromium } from "@playwright/test";

const BASE = "http://localhost:3457";
const SORTIE = process.argv[2]!;
const ADRESSE = process.argv[3] ?? "theo.essai@exemple.fr";
/** Pour ne jouer que certaines simulations : leurs identifiants, séparés par des virgules. */
const SEULES = process.argv[4]?.split(",") ?? null;
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

// les réponses, calculées ici avec les relations du cours, puis arrondies au pas de saisie
const g = 9.81;
const GM = 6.67e-11 * 5.97e24;
const rad = (deg: number) => (deg * Math.PI) / 180;
const tir = (angle: number, H: number) => Math.sqrt((g * 4.6 ** 2) / (2 * Math.cos(rad(angle)) ** 2 * (4.6 * Math.tan(rad(angle)) + H - 3.05)));
const fr = (x: number, decimales: number) => x.toFixed(decimales).replace(".", ",");
interface Defi { simulation: string; rang: number; bonne: string; fausse?: string; milieu: number }
const DEFIS: Defi[] = [
  { simulation: "basket", rang: 1, bonne: fr(Math.sqrt(2 * g * 0.6), 2), fausse: "3", milieu: 380 },
  { simulation: "basket", rang: 2, bonne: fr(tir(45, 2.2), 2), milieu: 600 },
  { simulation: "basket", rang: 3, bonne: fr(tir(52, 2.6), 2), milieu: 600 },
  { simulation: "largage", rang: 1, bonne: fr(12 * Math.sqrt(40 / g), 1), fausse: "30", milieu: 2100 },
  { simulation: "largage", rang: 2, bonne: fr(60 / Math.sqrt(90 / g), 1), milieu: 2600 },
  { simulation: "largage", rang: 3, bonne: fr((g * 30 ** 2) / (2 * 15 ** 2), 1), milieu: 2000 },
  { simulation: "rc", rang: 1, bonne: "2", fausse: "3", milieu: 2600 },
  { simulation: "rc", rang: 2, bonne: fr((10 / Math.log(3) / 470) * 1000, 1), milieu: 2600 },
  { simulation: "rc", rang: 3, bonne: fr((0.5 / Math.log(3) / 2) * 1000, 0), milieu: 2600 },
  { simulation: "temperature", rang: 1, bonne: fr((0.5 * 4180 * 70) / 2000, 0), fausse: "40", milieu: 2600 },
  { simulation: "temperature", rang: 2, bonne: fr(12 * Math.log(70 / 40), 1), milieu: 2600 },
  { simulation: "temperature", rang: 3, bonne: fr((((0.25 * 4180) / (25 * 0.03)) * Math.log(65 / 30)) / 60, 1), milieu: 2600 },
  { simulation: "doppler", rang: 1, bonne: fr(340 * (1 - 300 / 400), 1), fausse: "40", milieu: 3600 },
  { simulation: "doppler", rang: 2, bonne: fr((440 * 260) / 340, 1), milieu: 3600 },
  { simulation: "doppler", rang: 3, bonne: fr(340 * (1 - 400 / 425) * 3.6, 1), milieu: 3600 },
  { simulation: "satellite", rang: 1, bonne: fr(Math.sqrt(GM / 6.771e6) / 1000, 2), fausse: "7,2", milieu: 2200 },
  { simulation: "satellite", rang: 2, bonne: fr((2 * Math.PI * Math.sqrt(7.071e6 ** 3 / GM)) / 60, 1), milieu: 3600 },
  { simulation: "satellite", rang: 3, bonne: String(Math.round((Math.cbrt((GM * 86164 ** 2) / (4 * Math.PI ** 2)) / 1000 - 6371) / 10) * 10), milieu: 3600 },
  { simulation: "titrage", rang: 1, bonne: "16", fausse: "12", milieu: 3000 },
  { simulation: "titrage", rang: 2, bonne: "0,1", milieu: 3000 },
  { simulation: "titrage", rang: 3, bonne: "10", milieu: 3000 },
  { simulation: "radio", rang: 1, bonne: "16", fausse: "10", milieu: 3000 },
  { simulation: "radio", rang: 2, bonne: fr(Math.round((5730 * Math.log(1 / 0.6)) / Math.LN2 / 10) * 10, 0), milieu: 3000 },
  { simulation: "radio", rang: 3, bonne: fr((24 * Math.LN2) / Math.log(10), 1), milieu: 3000 },
  { simulation: "dilution", rang: 1, bonne: "20", fausse: "30", milieu: 3200 },
  { simulation: "dilution", rang: 2, bonne: "50", milieu: 3200 },
  { simulation: "dilution", rang: 3, bonne: fr(0.1 * 0.1 * 249.7, 2), milieu: 3200 },
  { simulation: "ph", rang: 1, bonne: "10", fausse: "5", milieu: 1500 },
  { simulation: "ph", rang: 2, bonne: fr(10 ** 0.4, 2), milieu: 1500 },
  { simulation: "ph", rang: 3, bonne: fr(10 ** 1.5, 1), milieu: 1500 },
  { simulation: "beer", rang: 1, bonne: "3,2", fausse: "2", milieu: 2200 },
  { simulation: "beer", rang: 2, bonne: "30", milieu: 2200 },
  { simulation: "beer", rang: 3, bonne: "10", milieu: 2200 },
  { simulation: "cinetique", rang: 1, bonne: fr(Math.LN2 / 0.023, 1), fausse: "20", milieu: 3000 },
  { simulation: "cinetique", rang: 2, bonne: fr(Math.log(10) / 0.05, 1), milieu: 3000 },
  { simulation: "cinetique", rang: 3, bonne: fr(Math.log(10) / 5, 3), milieu: 3000 },
  { simulation: "pile", rang: 1, bonne: "0,2", fausse: "0,5", milieu: 3000 },
  { simulation: "pile", rang: 2, bonne: fr(((0.5 * 3600) / 96500 / 2) * 65.4, 2), milieu: 3000 },
  { simulation: "pile", rang: 3, bonne: fr(((0.5 / 63.5) * 2 * 96500) / 0.8 / 60, 1), milieu: 3000 },
  { simulation: "synthese", rang: 1, bonne: "0,05", fausse: "0,03", milieu: 2500 },
  { simulation: "synthese", rang: 2, bonne: fr((5 / 180 / 0.8) * 138, 2), milieu: 2500 },
  { simulation: "synthese", rang: 3, bonne: "0,05", milieu: 2500 },
].filter((d) => !SEULES || SEULES.includes(d.simulation));

const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "fr-FR", timezoneId: "Europe/Paris" });
const page = await ctx.newPage();
const erreurs: string[] = [];
page.on("pageerror", (e) => erreurs.push(`erreur de page : ${e.message.slice(0, 200)}`));
page.on("console", (m) => { if (m.type() === "error") erreurs.push(`console : ${m.text().slice(0, 200)}`); });
const photo = (nom: string, entiere = false) => page.screenshot({ path: `${SORTIE}/${nom}.png`, fullPage: entiere });
const texte = (sel: string) => page.locator(sel).first().innerText().then((t) => t.replace(/\s+/g, " ").trim()).catch(() => null);
const largeur = () => page.evaluate(() => document.documentElement.scrollWidth);
const bilan: Record<string, unknown> = {};

await page.goto(`${BASE}/compte/connexion`);
await page.fill("#adresse", ADRESSE);
const t0 = Date.now();
await page.click("button[type=submit]");
await page.waitForSelector("#code");
await page.fill("#code", await code(t0));
await page.click("button[type=submit]");
await page.waitForURL(/\/app/);

// ---- la page du labo et la page d'une simulation, avant de jouer ----
await page.goto(`${BASE}/app/labo`);
await attends(500);
await photo("labo-hub-avant");
bilan.hub = { titre: await texte("h1"), bilan: await texte(".labo-bilan"), cartes: await page.locator(".labo-fiche").count(), largeur: await largeur() };
await page.goto(`${BASE}/app/labo/basket`);
await attends(400);
await photo("labo-basket-liste-avant", true);
bilan.listeAvant = { defis: await page.locator(".labo-defi").allInnerTexts().then((l) => l.map((x) => x.replace(/\s+/g, " ").trim())), largeur: await largeur() };
// un défi fermé renvoie à la liste
await page.goto(`${BASE}/app/labo/basket/2`);
bilan.defiFerme = page.url().replace(BASE, "");
await page.goto(`${BASE}/app/labo/inconnue`);
bilan.simulationInconnue = (await texte("h1")) ?? "pas de titre";

async function lance(valeur: string) {
  await page.fill(".labo-saisie input", valeur);
  await page.click(".labo-lancer");
}
const verdict = async () => {
  await page.locator(".labo-verdict-ok, .labo-verdict-ko").waitFor({ timeout: 20000 });
  await attends(900);
  return texte(".labo-verdict");
};

for (const d of DEFIS) {
  const nom = `${d.simulation}-${d.rang}`;
  const r: Record<string, unknown> = {};
  await page.goto(`${BASE}/app/labo/${d.simulation}/${d.rang}`);
  await attends(500);
  r.titre = await texte("h1");
  await photo(`${nom}-0-depart`, true);
  if (d.rang === 1) {
    // les relations du cours s'ouvrent et se ferment
    await page.click(".labo-aide");
    await attends(200);
    await photo(`${nom}-1-relations`, true);
    r.relations = await page.locator(".labo-relations > li b").allInnerTexts();
    await page.click(".labo-aide");
    // une saisie qui n'est pas un nombre, puis une valeur hors bornes
    await lance("abc");
    r.pasUnNombre = await texte(".labo-erreur");
    await lance("99999");
    r.horsBornes = await texte(".labo-erreur");
  }
  if (d.fausse) {
    await lance(d.fausse);
    await attends(d.milieu);
    await photo(`${nom}-2-faux-en-cours`);
    r.faux = await verdict();
    await photo(`${nom}-3-faux-fin`);
    // la même valeur ne se relance pas
    await page.click(".labo-lancer");
    r.memeValeur = await texte(".labo-erreur");
    r.regleApresEchec = await texte(".labo-regle");
  }
  // la valeur est saisie : la scène se règle dessus avant le lancement
  await page.fill(".labo-saisie input", d.bonne);
  await attends(250);
  await photo(`${nom}-4-regle`);
  await page.click(".labo-lancer");
  await attends(d.milieu);
  await photo(`${nom}-5-en-cours`);
  r.mesuresEnCours = await texte(".labo-mesures");
  r.juste = await verdict();
  r.mesuresFin = await texte(".labo-mesures");
  r.allure = await texte(".labo-barre span:last-child");
  await photo(`${nom}-6-reussi`);
  r.reussite = await texte(".labo-reussite");
  r.etoiles = await page.locator(".labo-reussite .labo-etoiles svg.est-gagnee").count();
  await photo(`${nom}-7-page`, true);
  r.largeur = await largeur();
  bilan[nom] = r;
}

// ---- rejouer un défi déjà réussi : les étoiles ne changent pas ----
await page.goto(`${BASE}/app/labo/${DEFIS[0].simulation}/1`);
await attends(400);
await lance(DEFIS[0].bonne);
bilan.rejoue = { verdict: await verdict(), reussite: await texte(".labo-reussite"), regle: await texte(".labo-regle") };
// le bouton « Défi suivant » mène au défi 2
await page.getByRole("link", { name: "Défi suivant" }).click();
await page.waitForURL(/labo\/[a-z]+\/2/);
bilan.suivant = page.url().replace(BASE, "");

// ---- après : la liste et la page du labo ----
await page.goto(`${BASE}/app/labo/basket`);
await attends(400);
await photo("labo-basket-liste-apres", true);
bilan.listeApres = await page.locator(".labo-defi").allInnerTexts().then((l) => l.map((x) => x.replace(/\s+/g, " ").trim()));
await page.goto(`${BASE}/app/labo`);
await attends(500);
await photo("labo-hub-apres");
await photo("labo-hub-page", true);
bilan.hubApres = { bilan: await texte(".labo-bilan"), largeur: await largeur() };
// le premier rayon défile au doigt : sa dernière carte se voit après un défilement
await page.locator(".labo-rayon").first().evaluate((el) => el.scrollTo({ left: el.scrollWidth, behavior: "instant" }));
await attends(300);
await photo("labo-hub-fin-du-rayon");

// ---- en thème sombre et sur un grand écran ----
await page.emulateMedia({ colorScheme: "dark" });
await page.goto(`${BASE}/app/labo/rc/2`);
await attends(500);
await photo("sombre-rc-2", true);
await page.emulateMedia({ colorScheme: "light" });
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(`${BASE}/app/labo/${DEFIS[0].simulation}/1`);
await attends(500);
await lance(DEFIS[0].bonne);
await attends(DEFIS[0].milieu);
await photo("large-defi-en-cours");
await verdict();
await photo("large-defi-reussi");
await page.goto(`${BASE}/app/labo`);
await attends(500);
await photo("large-hub");

bilan.erreurs = erreurs;
console.log(JSON.stringify(bilan, null, 1));
await nav.close();
