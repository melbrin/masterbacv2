// Essai à la main du bouton de thème, dans un vrai navigateur dont le téléphone est réglé en mode sombre :
// la page s'ouvre sombre (elle suit le téléphone), le bouton la passe en clair sans recharger, le choix tient après
// un rechargement et sur une autre page, puis le bouton la repasse en sombre. En largeur téléphone (bouton en haut à
// droite), puis sur grand écran (bouton en bas du menu de gauche), puis sur la page d'accueil sans compte.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/theme.mts <dossier des captures>
import { chromium } from "@playwright/test";
import { BASE, attends, ouvre } from "./outils.mts";

const [sortie] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/theme.mts <dossier des captures>");
const ecarts: string[] = [];
const bilan: Record<string, unknown> = {};
const attendu = (vrai: boolean, quoi: string) => { if (!vrai) ecarts.push(quoi); };

for (const [nom, largeur, hauteur] of [["telephone", 390, 844], ["ordinateur", 1280, 800]] as const) {
  const e = await ouvre({ sortie, largeur, hauteur, sombre: true });
  const page = e.page;
  // l'essai part d'un navigateur sans choix : il suit le téléphone, réglé en sombre
  await e.ctx.clearCookies({ name: "mb-theme" });
  await page.goto(`${BASE}/app`);
  await attends(500);
  const fond = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const etat = async () => ({ attribut: await page.evaluate(() => document.documentElement.dataset.theme ?? null), fond: await fond(),
    cookie: (await e.ctx.cookies()).find((c) => c.name === "mb-theme")?.value ?? null });
  const depart = await etat();
  await e.photo(`${nom}-1-sombre-du-telephone`);
  const bouton = page.locator(nom === "telephone" ? ".barre-haut button[title^='Passer en']" : ".lateral .lateral-theme");
  attendu((await bouton.count()) === 1, `${nom} : pas de bouton de thème visible`);
  const urlAvant = page.url();
  await bouton.click();
  await attends(600);
  const clair = await etat();
  await e.photo(`${nom}-2-clair`);
  attendu(clair.attribut === "light" && clair.cookie === "clair", `${nom} : le bouton ne passe pas en clair (${JSON.stringify(clair)})`);
  attendu(page.url() === urlAvant, `${nom} : la page a changé d'adresse`);
  // le choix tient après un rechargement, et sur une autre page
  await page.goto(`${BASE}/app/progres`);
  await attends(500);
  const ailleurs = await etat();
  attendu(ailleurs.attribut === "light" && ailleurs.fond === clair.fond, `${nom} : le choix ne tient pas sur une autre page (${JSON.stringify(ailleurs)})`);
  await page.locator(nom === "telephone" ? ".barre-haut button[title^='Passer en']" : ".lateral .lateral-theme").click();
  await attends(600);
  const retour = await etat();
  await e.photo(`${nom}-3-sombre-choisi`, true);
  attendu(retour.attribut === "dark" && retour.cookie === "sombre", `${nom} : le bouton ne repasse pas en sombre`);
  bilan[nom] = { depart, clair, ailleurs, retour, libelle: await page.locator(nom === "telephone" ? ".barre-haut button[title^='Passer en']" : ".lateral .lateral-theme").getAttribute("title"), largeur: await e.largeur(), erreurs: e.erreurs };
  attendu(depart.fond !== clair.fond, `${nom} : le fond ne change pas`);
  await e.ferme();
}

// la page d'accueil, sans compte
const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "fr-FR", colorScheme: "dark" });
const page = await ctx.newPage();
await page.goto(`${BASE}/`);
await attends(400);
await page.screenshot({ path: `${sortie}/accueil-1-sombre.png` });
await page.locator(".accueil-barre button[title^='Passer en']").click();
await attends(500);
await page.screenshot({ path: `${sortie}/accueil-2-clair.png` });
const accueil = { attribut: await page.evaluate(() => document.documentElement.dataset.theme ?? null), cookie: (await ctx.cookies()).find((c) => c.name === "mb-theme")?.value ?? null };
attendu(accueil.attribut === "light" && accueil.cookie === "clair", `accueil : le bouton ne passe pas en clair (${JSON.stringify(accueil)})`);
bilan.accueil = accueil;
await nav.close();

bilan.ecarts = ecarts;
console.log(JSON.stringify(bilan, null, 1));
