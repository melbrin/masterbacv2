// Essai à la main de la page de panne et de la page introuvable, dans un vrai navigateur.
//
// 1. Des adresses qui ne mènent à rien : la page introuvable est en français, garde le menu, et renvoie à « Aujourd'hui ».
// 2. La base coupée pendant que l'élève se promène : l'essai ouvre une page, ARRÊTE le conteneur
//    `supabase_rest_app-masterbac` (la porte de la base locale), puis touche un lien du menu. La page de panne doit
//    s'afficher en français, avec le menu ; hors connexion, elle doit le dire. L'essai relance le conteneur, touche
//    « Réessayer » : la page demandée s'affiche.
// 3. La base coupée dès l'arrivée : la lecture du profil échoue avant le menu. La page de panne s'affiche seule, et
//    l'élève n'est pas renvoyé vers la création de son profil. Conteneur relancé, « Réessayer » ouvre « Aujourd'hui ».
//
// L'essai relance toujours le conteneur à la fin, même en cas d'échec. S'il est interrompu pendant une coupure :
//   docker start supabase_rest_app-masterbac
// Il ne touche qu'à la base locale. Les erreurs de console pendant les coupures sont attendues ; elles sont relevées à part.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/panne.mts <dossier des captures> [largeur] [hauteur]
import { execFileSync } from "node:child_process";
import { BASE, attends, ouvre } from "./outils.mts";

const [sortie, largeur = "390", hauteur = "844"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/panne.mts <dossier des captures> [largeur] [hauteur]");
const CONTENEUR = "supabase_rest_app-masterbac";
const L = Number(largeur);

const e = await ouvre({ sortie, largeur: L, hauteur: Number(hauteur) });
const page = e.page;
const ecarts: string[] = [];
const bilan: Record<string, unknown> = { fenetre: `${largeur} x ${hauteur}` };
const attendu = (vrai: boolean, quoi: string) => { if (!vrai) ecarts.push(quoi); };
const docker = (...args: string[]) => execFileSync("docker", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
/** Vrai quand la porte de la base répond (même par un refus : elle est là). */
const baseLa = async () => fetch("http://127.0.0.1:54321/rest/v1/", { signal: AbortSignal.timeout(3000) }).then((r) => r.status < 500, () => false);
async function coupe() { docker("stop", "-t", "2", CONTENEUR); for (let i = 0; i < 40 && (await baseLa()); i++) await attends(250); }
async function relance() { docker("start", CONTENEUR); for (let i = 0; i < 120 && !(await baseLa()); i++) await attends(250); await attends(800); }
/** Ce que la page dit : son titre, sa phrase, ses boutons, le menu, la langue. */
const etat = async () => ({
  adresse: new URL(page.url()).pathname,
  titre: await e.texte("h1"),
  phrase: await e.texte(".panne .sous-titre"),
  boutons: await page.locator(".panne .actions :is(a, button)").allInnerTexts(),
  numero: await e.texte(".panne-numero"),
  menu: (await page.locator("nav a[href='/app/cours']").count()) > 0,
  anglais: /could not be found|couldn.t load|server error|something went wrong/i.test(await page.locator("body").innerText()),
  largeur: await e.largeur(),
});
const controle = (nom: string, x: Awaited<ReturnType<typeof etat>>, titre: string) => {
  attendu(x.titre === titre, `${nom} : le titre est « ${x.titre} », attendu « ${titre} »`);
  attendu(!x.anglais, `${nom} : la page parle anglais`);
  attendu(x.largeur <= L, `${nom} : le contenu fait ${x.largeur} points de large pour une fenêtre de ${L}`);
};

try {
  // ----- 1. des adresses qui ne mènent à rien -----
  const introuvables: Record<string, unknown> = {};
  for (const chemin of ["/app/labo/inconnue", "/app/tp/essai/pas-un-identifiant", "/app/fiche/99"]) {
    const reponse = await page.goto(`${BASE}${chemin}`);
    await attends(400);
    const x = await etat();
    introuvables[chemin] = { code: reponse?.status(), ...x };
    controle(chemin, x, "Cette page n'existe pas");
    attendu(reponse?.status() === 404, `${chemin} : le serveur répond ${reponse?.status()}, 404 attendu`);
    attendu(x.menu, `${chemin} : la page introuvable n'a pas le menu de l'application`);
  }
  await e.photo("1-page-introuvable");
  await page.getByRole("link", { name: "Revenir à Aujourd'hui" }).click();
  await page.waitForURL(`${BASE}/app`);
  bilan.introuvables = introuvables;

  // ----- 2. la base coupée pendant que l'élève se promène : la panne s'affiche dans la page, le menu reste -----
  await page.goto(`${BASE}/app/cours`);
  await attends(500);
  const erreursAvant = e.erreurs.length;
  await coupe();
  // le lien visible du menu : la barre du bas au téléphone, le menu de côté sur un grand écran
  let depart = Date.now();
  await page.locator("nav a[href='/app/progres'] >> visible=true").first().click();
  await page.locator(".panne").waitFor({ timeout: 30000 });
  const attenteDansLaPage = (Date.now() - depart) / 1000;
  attendu(attenteDansLaPage < 10, `panne dans la page : elle met ${attenteDansLaPage.toFixed(1)} s à s'afficher`);
  await attends(400);
  const dansLaPage = await etat();
  await e.photo("2-panne-dans-la-page");
  controle("panne dans la page", dansLaPage, "Cette page n'a pas pu s'afficher");
  attendu(dansLaPage.menu, "panne dans la page : le menu a disparu");
  attendu(dansLaPage.boutons.includes("Réessayer"), `panne dans la page : pas de bouton « Réessayer » (${dansLaPage.boutons.join(", ")})`);
  // hors connexion, la page le dit
  await e.ctx.setOffline(true);
  await attends(400);
  const horsLigne = await e.texte(".panne .sous-titre");
  await e.photo("3-panne-hors-connexion");
  attendu(/plus de connexion/.test(horsLigne ?? ""), `hors connexion, la page dit : « ${horsLigne} »`);
  await e.ctx.setOffline(false);
  await relance();
  await page.getByRole("button", { name: "Réessayer" }).click();
  await page.locator("h1", { hasText: "Tes progrès" }).waitFor({ timeout: 30000 });
  await attends(400);
  const revenue = await etat();
  await e.photo("4-page-revenue");
  attendu(revenue.adresse === "/app/progres" && revenue.titre === "Tes progrès", `après « Réessayer », la page est ${revenue.adresse} « ${revenue.titre} »`);
  bilan.dansLaPage = { attente: `${attenteDansLaPage.toFixed(1)} s`, ...dansLaPage, horsLigne, apres: revenue };

  // ----- 3. la base coupée dès l'arrivée : la page de panne s'affiche seule, sans renvoi vers le profil -----
  await coupe();
  depart = Date.now();
  const reponse = await page.goto(`${BASE}/app`);
  await page.locator(".panne").waitFor({ timeout: 30000 });
  const attenteALArrivee = (Date.now() - depart) / 1000;
  attendu(attenteALArrivee < 10, `panne à l'arrivée : elle met ${attenteALArrivee.toFixed(1)} s à s'afficher`);
  await attends(400);
  const aLArrivee = await etat();
  await e.photo("5-panne-a-l-arrivee");
  controle("panne à l'arrivée", aLArrivee, "Cette page n'a pas pu s'afficher");
  attendu(aLArrivee.adresse === "/app", `panne à l'arrivée : l'élève est renvoyé vers ${aLArrivee.adresse}`);
  attendu(aLArrivee.boutons.includes("Réessayer"), "panne à l'arrivée : pas de bouton « Réessayer »");
  await relance();
  await page.getByRole("button", { name: "Réessayer" }).click();
  await page.locator(".salut").waitFor({ timeout: 30000 });
  await attends(400);
  const accueil = await etat();
  await e.photo("6-accueil-revenu");
  attendu(accueil.adresse === "/app" && accueil.menu, "après « Réessayer », « Aujourd'hui » ne s'affiche pas avec son menu");
  bilan.aLArrivee = { code: reponse?.status(), attente: `${attenteALArrivee.toFixed(1)} s`, ...aLArrivee, apres: { adresse: accueil.adresse, menu: accueil.menu } };
  bilan.erreursPendantLesCoupures = e.erreurs.length - erreursAvant;
} catch (panne) {
  bilan.arret = panne instanceof Error ? panne.message.slice(0, 500) : String(panne);
  ecarts.push("l'essai s'est arrêté avant la fin");
} finally {
  // quoi qu'il arrive, la base locale repart
  if (!(await baseLa())) await relance();
  bilan.baseRelancee = await baseLa();
}
bilan.ecarts = ecarts;
console.log(JSON.stringify(bilan, null, 1));
await e.ferme().catch(() => {});
