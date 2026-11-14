// Essai à la main de la section « S'entraîner » dans un vrai navigateur (le navigateur intégré à l'atelier met les
// animations en pause). Il parcourt la page de la section, ses quatre sous-sections par le sous-menu, le labo à ses
// adresses (une simulation, un défi, le basketteur en mode libre), un jeu de révision, puis la page « Aujourd'hui ».
// Il le fait en largeur téléphone (390 × 844), sur un grand écran (1280 × 800), puis dans les deux en thème sombre.
// Pour chaque page il relève : l'adresse, le titre, la largeur du contenu (plus large que la fenêtre, la page défile
// de côté), l'entrée allumée du menu, l'entrée en cours du sous-menu, les erreurs de console. Il vérifie aussi, à 390
// puis à 360 points de large, que le libellé de chaque onglet du bas tient dans son onglet et que les textes des portes
// et du bloc de la page « Aujourd'hui » tiennent dans leur largeur ; et que les anciennes adresses du labo ne répondent
// plus. Il ne joue rien et n'écrit rien. La liste « ecarts » du bilan dit ce qui ne va pas.
// À transformer en parcours Playwright (docs/04-tests-et-qualite.md).
// Il faut : le serveur sur le port 3457, la base locale, et un compte où le labo, les TP et la mémoire se montrent.
// Usage : ESSAI_SESSION=<fichier de session, hors du dépôt> node scripts/essais/sections.mts [dossier des captures]
// La session se prépare avec scripts/essais/session.mts : la demande de code est limitée (voir outils.mts).
import { BASE, attends, ouvre } from "./outils.mts";

const SORTIE = process.argv[2] ?? "sorties/sections";
const ecarts: string[] = [];

interface Releve {
  adresse: string;
  /** le titre de la page (son h1), puis celui de l'onglet du navigateur */
  titre: string | null;
  document: string;
  /** la largeur du contenu et celle de la fenêtre : si le contenu est plus large, la page défile de côté */
  largeur: number;
  fenetre: number;
  /** l'entrée allumée du menu : l'onglet du bas au téléphone, l'entrée de la barre latérale sur un grand écran */
  menu: string[];
  /** l'entrée en cours du sous-menu ; vide si la page ne le montre pas */
  sousMenu: string | null;
  erreurs: string[];
}

/** Ce qui est attendu de chaque page : l'entrée de la barre latérale, et l'entrée du sous-menu. Au téléphone, l'onglet du bas. */
const ATTENDU: Record<string, { lateral: string; sousMenu: string | null; bas: string }> = {
  "01-entrainement": { lateral: "S'entraîner", sousMenu: null, bas: "S'entraîner" },
  "02-labo": { lateral: "Labo", sousMenu: "Labo", bas: "S'entraîner" },
  "03-tp": { lateral: "TP", sousMenu: "TP", bas: "S'entraîner" },
  "04-memoire": { lateral: "Mémoire", sousMenu: "Mémoire", bas: "S'entraîner" },
  "05-jeux": { lateral: "Jeux", sousMenu: "Jeux", bas: "S'entraîner" },
  "06-labo-simulation": { lateral: "Labo", sousMenu: null, bas: "S'entraîner" },
  "07-labo-defi": { lateral: "Labo", sousMenu: null, bas: "S'entraîner" },
  "08-labo-mode-libre": { lateral: "Labo", sousMenu: null, bas: "S'entraîner" },
  "09-jeu-de-revision": { lateral: "Jeux", sousMenu: null, bas: "S'entraîner" },
  "10-aujourdhui": { lateral: "Aujourd'hui", sousMenu: null, bas: "Aujourd'hui" },
};

/** Le libellé de chaque onglet du bas tient-il dans son onglet, sans être coupé ni déborder sur le voisin ? */
const ONGLETS = `[...document.querySelectorAll(".onglets-bas a")].map((a) => {
  const s = a.querySelector("span"), ra = a.getBoundingClientRect(), rs = s.getBoundingClientRect();
  return { nom: s.textContent, onglet: Math.round(ra.width * 10) / 10, libelle: Math.round(rs.width * 10) / 10,
    tient: rs.left >= ra.left && rs.right <= ra.right && s.scrollWidth <= s.clientWidth + 1 && rs.height < 20 };
})`;
interface Onglet { nom: string; onglet: number; libelle: number; tient: boolean }
/** Les portes de la page « S'entraîner » : leur texte, leur taille, et si leur nom, leur phrase et leurs chiffres tiennent dans leur largeur. */
const PORTES = `[...document.querySelectorAll(".porte")].map((p) => {
  const b = p.getBoundingClientRect();
  return { texte: p.innerText.replace(/\\s+/g, " ").trim(), largeur: Math.round(b.width), hauteur: Math.round(b.height), bas: Math.round(b.bottom),
    tient: [...p.querySelectorAll(".porte-nom, .porte-phrase, .porte-chiffres")].every((e) => e.scrollWidth <= e.clientWidth + 1) };
})`;
interface Porte { texte: string; largeur: number; hauteur: number; bas: number; tient: boolean }
/** Les entrées du bloc « S'entraîner » de la page « Aujourd'hui » : leur nom et leur contenu tiennent-ils dans leur colonne ? */
const ENTREES = `[...document.querySelectorAll(".entrainement li")].map((li) => {
  const r = li.getBoundingClientRect();
  return { nom: li.querySelector("b").textContent, tient: [...li.querySelectorAll("b, span")].every((e) => e.getBoundingClientRect().right <= r.right + 0.5) };
})`;
interface Entree { nom: string; tient: boolean }

async function passe(nom: string, o: { largeur: number; hauteur: number; sombre: boolean }) {
  const essai = await ouvre({ sortie: SORTIE, ...o });
  const { page } = essai;
  const telephone = o.largeur < 960;
  const releves: Record<string, Releve> = {};
  const suite: Record<string, unknown> = {};
  let vues = essai.erreurs.length;
  const textes = (selecteur: string) => page.locator(selecteur).allInnerTexts().then((l) => l.map((t) => t.replace(/\s+/g, " ").trim()));

  /** Relève la page en cours, la compare à ce qui est attendu, et prend une capture de l'écran. */
  const releve = async (cle: string, capture = true) => {
    await attends(500);
    const r: Releve = {
      adresse: page.url().replace(BASE, ""),
      titre: (await textes("h1"))[0] ?? null,
      document: await page.title(),
      largeur: await essai.largeur(),
      fenetre: o.largeur,
      menu: await textes(telephone ? '.onglets-bas a[aria-current="page"]' : '.lateral nav a[aria-current="page"]'),
      sousMenu: (await textes('.sous-menu a[aria-current="page"]'))[0] ?? null,
      erreurs: essai.erreurs.slice(vues),
    };
    vues = essai.erreurs.length;
    releves[cle] = r;
    const attendu = ATTENDU[cle];
    if (r.largeur > r.fenetre) ecarts.push(`${nom}, ${cle} : le contenu fait ${r.largeur} points de large pour une fenêtre de ${r.fenetre}`);
    if (r.menu.join() !== (telephone ? attendu.bas : attendu.lateral)) ecarts.push(`${nom}, ${cle} : le menu allume « ${r.menu.join(", ")} » au lieu de « ${telephone ? attendu.bas : attendu.lateral} »`);
    if (r.sousMenu !== attendu.sousMenu) ecarts.push(`${nom}, ${cle} : le sous-menu marque « ${r.sousMenu} » au lieu de « ${attendu.sousMenu} »`);
    if (r.erreurs.length) ecarts.push(`${nom}, ${cle} : ${r.erreurs.length} erreur(s) de console`);
    if (capture) await essai.photo(`${nom}-${cle}`);
  };
  const va = async (chemin: string | RegExp) => page.waitForURL(typeof chemin === "string" ? `${BASE}${chemin}` : chemin);

  // ---- la page de la section : ses portes, ses onglets ----
  await page.goto(`${BASE}/app/entrainement`);
  await releve("01-entrainement");
  await essai.photo(`${nom}-01-entrainement-page`, true);
  const portes = (await page.evaluate(PORTES)) as Porte[];
  suite.portes = portes;
  for (const x of portes) if (!x.tient) ecarts.push(`${nom} : un texte de la porte « ${x.texte.slice(0, 30)} » dépasse de sa largeur`);
  if (telephone) {
    const onglets = (await page.evaluate(ONGLETS)) as Onglet[];
    suite.onglets = onglets;
    suite.hautDesOnglets = await page.locator(".onglets-bas").evaluate((el) => Math.round(el.getBoundingClientRect().top));
    for (const x of onglets) if (!x.tient) ecarts.push(`${nom} : le libellé « ${x.nom} » ne tient pas dans son onglet (${x.libelle} points pour ${x.onglet})`);
  }

  // ---- les quatre sous-sections : on entre par la porte du labo, puis on suit le sous-menu ----
  await page.locator(".porte-labo a").click();
  await va("/app/labo");
  await releve("02-labo");
  suite.sousMenu = await textes(".sous-menu a");
  for (const [cle, entree, chemin] of [["03-tp", "TP", "/app/tp"], ["04-memoire", "Mémoire", "/app/memoire"], ["05-jeux", "Jeux", "/app/jeux"]]) {
    await page.locator(".sous-menu").getByRole("link", { name: entree, exact: true }).click();
    await va(chemin);
    await releve(cle);
  }
  // le fil de l'en-tête ramène à la page de la section
  await page.locator(".fil a").first().click();
  await va("/app/entrainement");
  suite.fil = page.url().replace(BASE, "");

  // ---- le labo à ses adresses : une simulation, un défi, puis le basketteur en mode libre ----
  await page.goto(`${BASE}/app/labo`);
  await page.locator(".labo-fiche", { hasText: "Le basketteur" }).getByRole("link", { name: /défis$/ }).click();
  await va("/app/labo/basket");
  await releve("06-labo-simulation");
  await page.locator(".labo-defi .btn").first().click();
  await va("/app/labo/basket/1");
  await releve("07-labo-defi");
  await page.locator(".fil a").first().click();
  await va("/app/labo");
  await page.getByRole("link", { name: "Ouvrir la simulation" }).click();
  await va("/app/labo/basket/libre");
  await releve("08-labo-mode-libre");

  // ---- un jeu de révision ----
  await page.goto(`${BASE}/app/jeux`);
  await page.locator(".hub-carte", { has: page.getByRole("heading", { name: "Paires", exact: true }) }).getByRole("link", { name: "Jouer" }).click();
  await va(/\/app\/jeux\/paires\?fiches=/);
  await releve("09-jeu-de-revision");

  // ---- la page « Aujourd'hui » : le bloc « S'entraîner » et ses entrées ----
  await page.goto(`${BASE}/app`);
  await releve("10-aujourdhui", false);
  await essai.photo(`${nom}-10-aujourdhui-page`, true);
  await page.locator(".entrainement").scrollIntoViewIfNeeded();
  await essai.photo(`${nom}-10-aujourdhui-bloc`);
  const entrees = (await page.evaluate(ENTREES)) as Entree[];
  for (const x of entrees) if (!x.tient) ecarts.push(`${nom} : sur la page « Aujourd'hui », l'entrée « ${x.nom} » dépasse de sa colonne`);
  suite.bloc = { texte: await essai.texte(".entrainement"), liens: await page.locator(".entrainement a").evaluateAll((l) => l.map((a) => a.getAttribute("href"))), entrees };

  await essai.ferme();
  return { releves, ...suite };
}

const bilan: Record<string, unknown> = {};
bilan.telephone = await passe("telephone", { largeur: 390, hauteur: 844, sombre: false });
bilan.ordinateur = await passe("ordinateur", { largeur: 1280, hauteur: 800, sombre: false });
bilan.telephoneSombre = await passe("telephone-sombre", { largeur: 390, hauteur: 844, sombre: true });
bilan.ordinateurSombre = await passe("ordinateur-sombre", { largeur: 1280, hauteur: 800, sombre: true });

// ---- un téléphone étroit, à 360 points de large : les onglets du bas, les portes, le bloc de la page « Aujourd'hui » ;
//      et les anciennes adresses du labo ----
{
  const essai = await ouvre({ sortie: SORTIE, largeur: 360, hauteur: 780 });
  await essai.page.goto(`${BASE}/app/entrainement`);
  await attends(500);
  const onglets = (await essai.page.evaluate(ONGLETS)) as Onglet[];
  for (const x of onglets) if (!x.tient) ecarts.push(`360 points : le libellé « ${x.nom} » ne tient pas dans son onglet (${x.libelle} points pour ${x.onglet})`);
  const portes = (await essai.page.evaluate(PORTES)) as Porte[];
  for (const x of portes) if (!x.tient) ecarts.push(`360 points : un texte de la porte « ${x.texte.slice(0, 30)} » dépasse de sa largeur`);
  const largeur = await essai.largeur();
  if (largeur > 360) ecarts.push(`360 points : le contenu de la page « S'entraîner » fait ${largeur} points de large`);
  await essai.photo("etroit-01-entrainement");
  await essai.photo("etroit-01-entrainement-page", true);
  await essai.page.goto(`${BASE}/app`);
  await attends(500);
  const entrees = (await essai.page.evaluate(ENTREES)) as Entree[];
  for (const x of entrees) if (!x.tient) ecarts.push(`360 points : sur la page « Aujourd'hui », l'entrée « ${x.nom} » dépasse de sa colonne`);
  const accueil = await essai.largeur();
  if (accueil > 360) ecarts.push(`360 points : le contenu de la page « Aujourd'hui » fait ${accueil} points de large`);
  await essai.page.locator(".entrainement").scrollIntoViewIfNeeded();
  await essai.photo("etroit-10-aujourdhui-bloc");
  const anciennes: Record<string, number> = {};
  for (const chemin of ["/app/jeux/basket", "/app/jeux/labo/basket", "/app/jeux/labo/basket/1"]) {
    anciennes[chemin] = (await essai.page.request.get(`${BASE}${chemin}`, { maxRedirects: 0 })).status();
    if (anciennes[chemin] !== 404) ecarts.push(`l'ancienne adresse ${chemin} répond encore (${anciennes[chemin]})`);
  }
  bilan.etroit = { onglets, portes, entrees, largeur, accueil, erreurs: essai.erreurs };
  bilan.anciennes = anciennes;
  if (essai.erreurs.length) ecarts.push(`360 points : ${essai.erreurs.length} erreur(s) de console`);
  await essai.ferme();
}

bilan.ecarts = ecarts;
console.log(JSON.stringify(bilan, null, 1));
if (ecarts.length) process.exitCode = 1;
