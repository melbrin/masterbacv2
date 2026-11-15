// Essai à la main de l'entraînement dans le parcours et les progrès (décision 0015), dans un vrai navigateur, comme
// un élève qui vient d'ouvrir son compte. Avec une adresse neuve, il crée le profil, coche deux chapitres vus en classe
// (fiches 1 et 10), puis suit ce que son parcours lui propose : il ouvre l'étape « défi du labo » et réussit le défi,
// ouvre l'étape « TP », commence le TP, le laisse en route, le reprend depuis son parcours, puis le fait en entier avec
// le guide (scripts/essais/tp-eleve.mts) ; il joue une partie de mémoire (scripts/essais/memoire.mts). Entre chaque
// chose, il relit le parcours, l'accueil, les progrès, la section, le labo et la page des TP, et vérifie que tout a
// changé comme il faut. Il prend une capture de chaque page : il faut les regarder. La liste « ecarts » dit ce qui ne va pas.
//
// Avec « vite », il suit le même chemin, mais termine le TP sans manipuler (comme scripts/essais/tp.mts) et ne joue pas
// à la mémoire : rien n'y dépend du temps réel, donc il passe même sur un ordinateur ralenti. La manipulation n'est
// alors pas essayée, et la grille d'ECE qu'il lit est celle d'un TP bâclé.
// Avec « termine », il reprend un compte que « joue » ou « vite » a laissé avec un TP en route : il le rouvre depuis
// le parcours, le termine sans manipuler, puis fait les vérifications de la fin.
// Avec « regarde », il ne joue rien : il photographie les mêmes pages à la taille donnée, pour un compte déjà avancé ;
// avec « sombre » en plus, il le fait en thème sombre.
// Il faut : le serveur sur le port 3457, la base locale. Un seul essai à la fois par fichier de session.
// Usage : node scripts/essais/parcours-entrainement.mts <dossier des captures> <fichier de session, hors du dépôt> <adresse du compte local> [largeur] [hauteur] [joue, vite, termine ou regarde] [clair ou sombre]
import { execFileSync } from "node:child_process";
import { BASE, attends, ouvre, type Essai } from "./outils.mts";

const [sortie, session, adresse, largeur = "390", hauteur = "844", mode = "joue", theme = "clair"] = process.argv.slice(2);
if (!sortie || !session || !adresse) throw new Error("Usage : node scripts/essais/parcours-entrainement.mts <dossier des captures> <fichier de session> <adresse> [largeur] [hauteur] [joue, vite, termine ou regarde] [clair ou sombre]");
const L = Number(largeur), H = Number(hauteur);

/** Les bonnes valeurs des premiers défis des chapitres 1 et 10 (l'essai du labo, labo.mts, les calcule de la même façon). */
const fr = (x: number, d: number) => x.toFixed(d).replace(".", ",");
const g = 9.81;
const VALEURS: Record<string, string> = {
  "basket/1": fr(Math.sqrt(2 * g * 0.6), 2), "largage/1": fr(12 * Math.sqrt(40 / g), 1), "titrage/1": "16", "beer/1": "3,2",
};

const ecarts: string[] = [];
const bilan: Record<string, unknown> = { adresse, fenetre: `${L} x ${H}`, mode, theme };
const attendu = (vrai: boolean, quoi: string) => { if (!vrai) ecarts.push(quoi); };
let rang = 0;

interface Etape { type: string | null; titre: string; href: string | null }

/** Ce qu'un élève voit sur une page, relevé comme un texte. */
async function releve(e: Essai, chemin: string, nom: string): Promise<{ largeur: number }> {
  await e.page.goto(`${BASE}${chemin}`);
  await attends(700);
  rang += 1;
  await e.photo(`${String(rang).padStart(2, "0")}-${nom}`, true);
  const large = await e.largeur();
  attendu(large <= L, `${chemin} : le contenu fait ${large} points de large pour une fenêtre de ${L}`);
  return { largeur: large };
}
const textes = (e: Essai, selecteur: string) => e.page.locator(selecteur).evaluateAll((els) => els.map((el) => ((el as HTMLElement).innerText || el.textContent || "").replace(/\s+/g, " ").trim()));

/** Les étapes du parcours, dans l'ordre : la prochaine, puis la suite. */
async function etapes(e: Essai, nom: string): Promise<Etape[]> {
  await releve(e, "/app/parcours", nom);
  return e.page.locator("a[data-etape]").evaluateAll((liens) => liens.map((a) => {
    const carte = a.closest("section.carte");
    const titre = a.classList.contains("ligne") ? a.querySelector(".tit")?.textContent : carte?.querySelector("h2")?.textContent;
    return { type: a.getAttribute("data-etape"), titre: (titre ?? "").replace(/\s+/g, " ").trim(), href: a.getAttribute("href") };
  }));
}
const genres = (liste: Etape[]) => liste.map((x) => x.type).join(" ");

/** Les chiffres de l'entraînement, tels que l'accueil, la section, les progrès, le labo et les TP les montrent. */
async function chiffres(e: Essai, nom: string) {
  await releve(e, "/app", `${nom}-accueil`);
  const accueil = { bloc: await textes(e, ".entrainement li"), prochaine: await e.texte("a[data-etape]") };
  await releve(e, "/app/entrainement", `${nom}-section`);
  const portes = await textes(e, ".porte .porte-chiffres");
  await releve(e, "/app/progres", `${nom}-progres`);
  const progres = {
    mois: await textes(e, ".chiffres-cles .carte"),
    entrainement: await textes(e, "#entrainement > section"),
    grille: await textes(e, "#entrainement .grille-ece tbody tr"),
    semaine: (await textes(e, ".carte p.petit")).find((t) => t.startsWith("Cette semaine")) ?? null,
    chapitres: (await textes(e, "ul.liste .ligne .sous")).filter((t) => t.startsWith("Labo") || t.startsWith("TP")),
  };
  await releve(e, "/app/labo", `${nom}-labo`);
  const labo = await e.page.locator(".labo-fiche").evaluateAll((fiches) => fiches.filter((f) => f.querySelector(".puce-parcours")).map((f) => f.querySelector("h3")?.textContent ?? ""));
  await releve(e, "/app/tp", `${nom}-tp`);
  const tp = await e.page.locator(".tp-sommaire > li").evaluateAll((lignes) => lignes.filter((l) => l.querySelector(".puce-parcours")).map((l) => l.id));
  return { accueil, portes, progres, dansLeParcours: { labo, tp } };
}

/** Termine le TP ouvert sans manipuler et avec la première réponse venue, comme un élève qui passerait vite. */
async function finisVite(e: Essai): Promise<string[]> {
  const page = e.page;
  const bouton = (nom: string | RegExp) => page.getByRole("button", { name: nom }).first();
  const present = async (nom: string | RegExp) => (await bouton(nom).count()) > 0;
  for (let i = 0; i < 60; i++) {
    await attends(350);
    if ((await page.locator(".tp-bilan").count()) > 0) break;
    if (await present(/Continuer|Voir mon bilan/)) { await bouton(/Continuer|Voir mon bilan/).click(); continue; }
    if (await present("J'ai lu, je commence")) { await bouton("J'ai lu, je commence").click(); continue; }
    if (await present("Ouvrir la paillasse")) {
      await bouton("Ouvrir la paillasse").click();
      await attends(900);
      await bouton("J'ai fini").click();
      await bouton(/Oui, j'ai fini/).click();
    } else if ((await page.locator(".tp-tiroir").count()) > 0) { await page.locator(".tp-tiroir button").first().click(); await bouton("Appeler le professeur").click(); }
    else if ((await page.locator(".ordre-jeu").count()) > 0) await bouton("Appeler le professeur").click();
    else if ((await page.locator(".tp-options").count()) > 0) { await page.locator(".tp-options button").first().click(); await bouton("Valider").click(); }
    else if ((await page.locator(".tp-etape input[inputmode=decimal]").count()) > 0) { await page.locator(".tp-etape input[inputmode=decimal]").fill("1"); await bouton("Valider").click(); }
    else throw new Error("étape de TP inconnue à l'écran");
    await page.waitForSelector(".tp-correction", { timeout: 30000 });
  }
  await page.waitForSelector(".tp-bilan", { timeout: 30000 });
  await attends(500);
  rang += 1;
  await e.photo(`${String(rang).padStart(2, "0")}-bilan-du-tp`, true);
  return page.locator(".tp-bilan .tp-niveau").allInnerTexts();
}

let e = await ouvre({ sortie, session, adresse, largeur: L, hauteur: H, guide: true, sombre: theme === "sombre" });

try {
if (mode === "regarde") {
  bilan.etapes = await etapes(e, "parcours");
  bilan.chiffres = await chiffres(e, "regarde");
} else {
  let essai = "";
  let tp: Etape | undefined;
  if (mode !== "termine") {
  // ----- un compte neuf : rien à proposer tant qu'aucun chapitre n'est vu en classe -----
  const depart = await etapes(e, "parcours-compte-neuf");
  bilan.depart = genres(depart);
  attendu(!depart.some((x) => x.type === "defi" || x.type === "tp"), "un compte sans chapitre vu en classe reçoit déjà un défi ou un TP");

  // ----- il coche deux chapitres vus en classe -----
  for (const fiche of ["01", "10"]) {
    await e.page.goto(`${BASE}/app/fiche/${fiche}`);
    const texteAvant = await e.texte("label.case [role=status]");
    await e.page.locator("label.case input[type=checkbox]").first().check();
    await e.page.waitForFunction((avant) => document.querySelector("label.case [role=status]")?.textContent !== avant, texteAvant, { timeout: 10000 });
  }
  const debut = await etapes(e, "parcours-deux-chapitres");
  bilan.debut = debut;
  attendu(genres(debut).includes("objectif defi tp objectif defi tp"), `après deux chapitres cochés, les étapes attendues ne sont pas là : ${genres(debut)}`);
  const avant = await chiffres(e, "avant");
  bilan.avant = avant;
  attendu(avant.dansLeParcours.labo.length === 2, `le labo signale ${avant.dansLeParcours.labo.length} simulations « Dans ton parcours », 2 attendues`);
  attendu(avant.dansLeParcours.tp.length === 2, `la page des TP signale ${avant.dansLeParcours.tp.length} TP « Dans ton parcours », 2 attendus`);

  // ----- il suit l'étape « défi du labo » de son parcours, et réussit le défi -----
  await e.page.goto(`${BASE}/app/parcours`);
  const defi = debut.find((x) => x.type === "defi");
  if (!defi?.href) throw new Error("pas d'étape « défi du labo » dans le parcours");
  await e.page.locator(`a[data-etape=defi][href="${defi.href}"]`).first().click();
  await e.page.waitForURL(`${BASE}${defi.href}`);
  await attends(600);
  const cle = defi.href.replace("/app/labo/", "");
  if (!VALEURS[cle]) throw new Error(`l'essai ne connaît pas la valeur du défi ${cle}`);
  bilan.defi = { etape: defi.titre, adresse: defi.href, titre: await e.texte("h1") };
  await e.page.fill(".labo-saisie input", VALEURS[cle]);
  await e.page.click(".labo-lancer");
  await e.page.locator(".labo-verdict-ok, .labo-verdict-ko").waitFor({ timeout: 30000 });
  await attends(900);
  rang += 1;
  await e.photo(`${String(rang).padStart(2, "0")}-defi-reussi`, true);
  attendu((await e.page.locator(".labo-verdict-ok").count()) > 0, `le défi ${cle} n'est pas réussi avec ${VALEURS[cle]} : ${await e.texte(".labo-verdict")}`);
  const apresDefi = await etapes(e, "parcours-apres-le-defi");
  bilan.apresDefi = genres(apresDefi) + " | " + apresDefi.filter((x) => x.type === "defi").map((x) => x.href).join(" ");
  attendu(!apresDefi.some((x) => x.href === defi.href), "le défi réussi est encore proposé par le parcours");

  // ----- il suit l'étape « TP » : la page des TP s'ouvre à la hauteur du TP -----
  tp = apresDefi.filter((x) => x.type === "tp").find((x) => x.href?.includes("#tp-detartrant")) ?? apresDefi.find((x) => x.type === "tp");
  if (!tp?.href) throw new Error("pas d'étape « TP » dans le parcours");
  await e.page.locator(`a[data-etape=tp][href="${tp.href}"]`).first().click();
  await e.page.waitForURL(/\/app\/tp#tp-/);
  await attends(900);
  const ancre = tp.href.split("#")[1];
  const ligne = e.page.locator(`#${ancre}`);
  const boite = await ligne.boundingBox();
  rang += 1;
  await e.photo(`${String(rang).padStart(2, "0")}-page-des-tp-a-la-hauteur-du-tp`);
  bilan.tp = { etape: tp.titre, adresse: tp.href, haut: boite ? Math.round(boite.y) : null, marque: await ligne.locator(".puce-parcours").count() };
  attendu(!!boite && boite.y >= 40 && boite.y < H * 0.6, `le TP proposé n'est pas en haut de l'écran à l'arrivée (y = ${boite?.y})`);
  attendu((await ligne.locator(".puce-parcours").count()) === 1, "le TP proposé n'est pas signalé « Dans ton parcours »");

  // ----- il le commence, valide une étape, puis le laisse : le parcours propose de le terminer -----
  await ligne.getByRole("button").last().click();
  await e.page.waitForURL(/\/app\/tp\/essai\//);
  essai = new URL(e.page.url()).pathname;
  await e.page.getByRole("button", { name: "J'ai lu, je commence" }).click();
  await e.page.locator(".tp-options button").first().waitFor({ timeout: 10000 });
  await e.page.locator(".tp-options button").first().click();
  await e.page.getByRole("button", { name: "Valider" }).click();
  await e.page.waitForSelector(".tp-correction", { timeout: 20000 });
  }
  const enRoute = await etapes(e, "parcours-tp-en-route");
  const reprise = enRoute.find((x) => x.type === "tp" && (essai ? x.href === essai : x.href?.startsWith("/app/tp/essai/")));
  if (!essai && reprise?.href) essai = reprise.href;
  bilan.reprise = reprise ?? enRoute.filter((x) => x.type === "tp");
  attendu(!!reprise && reprise.titre.startsWith("Termine ton TP"), "le TP laissé en route n'est pas proposé à la reprise");
  if (reprise) {
    await e.page.locator(`a[data-etape=tp][href="${essai}"]`).first().click();
    await e.page.waitForURL(`${BASE}${essai}`);
    await attends(500);
    attendu((await e.page.locator(".tp-etape").count()) > 0, "la reprise n'ouvre pas le TP en cours");
  }
  if (mode === "vite" || mode === "termine") {
    // ----- il termine le TP sans manipuler : la suite ne dépend pas du temps réel -----
    const niveaux = await finisVite(e);
    bilan.tpJoue = { niveaux, maniere: "sans manipuler" };
    attendu(niveaux.length === 4, `le TP terminé ne finit pas sur un bilan à quatre compétences : ${niveaux.join(" ")}`);
  } else {
    await e.ferme();
    // ----- il fait le TP en entier, avec le guide, puis une partie de mémoire -----
    const lance = (script: string, args: string[], env: Record<string, string>) => execFileSync("node", [script, ...args], { env: { ...process.env, ...env }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 26 });
    const sortieTp = lance("scripts/essais/tp-eleve.mts", [`${sortie}/tp`, "detartrant", largeur, hauteur], { ESSAI_SESSION: session });
    const tpJoue = JSON.parse(sortieTp.slice(sortieTp.indexOf("{"))) as { niveaux: string[]; erreurs: string[]; VE: number };
    bilan.tpJoue = { niveaux: tpJoue.niveaux, VE: tpJoue.VE, erreurs: tpJoue.erreurs, maniere: "avec le guide" };
    attendu(tpJoue.niveaux.length === 4, "le TP joué en entier ne finit pas sur un bilan à quatre compétences");
    const sortieMemoire = lance("scripts/essais/memoire.mts", [`${sortie}/memoire`, "chiffres", "clair", adresse], { MEMOIRE_SESSION: session, MEMOIRE_PAGES: "1" });
    bilan.memoire = sortieMemoire.trim().split("\n").slice(-3).join(" ").slice(0, 400);
    e = await ouvre({ sortie, session, adresse, largeur: L, hauteur: H, guide: true });
  }

  // ----- tout a changé comme il faut -----
  const fin = await etapes(e, "parcours-a-la-fin");
  bilan.fin = fin;
  const termine = tp ? tp.href?.split("#")[1] : null;
  attendu(!fin.some((x) => (termine && x.href?.endsWith(`#${termine}`)) || x.href === essai), "le TP terminé est encore proposé par le parcours");
  attendu(fin.some((x) => x.type === "tp" && /#tp-/.test(x.href ?? "")), "le parcours ne propose pas le TP suivant du chapitre");
  bilan.tpDesChapitres = await textes(e, "section.carte .puce");
  const apres = await chiffres(e, "apres");
  bilan.apres = apres;
  const dit = (liste: string[], motif: RegExp) => liste.some((t) => motif.test(t));
  attendu(dit(apres.accueil.bloc, /Labo.*[123] étoiles? sur/), `l'accueil ne compte pas les étoiles du défi : ${apres.accueil.bloc.join(" | ")}`);
  attendu(dit(apres.accueil.bloc, /TP.*1 terminé sur/), `l'accueil ne compte pas le TP terminé : ${apres.accueil.bloc.join(" | ")}`);
  if (mode === "joue") attendu(dit(apres.accueil.bloc, /Mémoire.*1 jour sur 7/), `l'accueil ne compte pas le jour de mémoire : ${apres.accueil.bloc.join(" | ")}`);
  attendu(dit(apres.portes, /1 terminé/) && (mode !== "joue" || dit(apres.portes, /1 jour sur 7/)), `les portes de la section ne suivent pas : ${apres.portes.join(" | ")}`);
  attendu(dit(apres.progres.mois, /^1 défi du labo réussi$/) && dit(apres.progres.mois, /^1 TP terminé$/) && dit(apres.progres.mois, /^\d+ parties? jouées?$/), `le bilan du mois ne suit pas : ${apres.progres.mois.join(" | ")}`);
  attendu(apres.progres.grille.length === 4, `la grille d'ECE n'a pas ses quatre compétences : ${apres.progres.grille.join(" | ")}`);
  if (mode === "joue") attendu(dit(apres.progres.grille, /Réaliser.*B : ton niveau/), `la grille d'ECE n'est pas celle d'un TP fait avec le guide : ${apres.progres.grille.join(" | ")}`);
  attendu(apres.progres.chapitres.length === 2, `les chapitres des progrès ne montrent pas leur entraînement : ${apres.progres.chapitres.join(" | ")}`);
  attendu(!!apres.progres.semaine, "les progrès ne disent pas ce qui a été fait à l'entraînement cette semaine");
}
} catch (panne) {
  // l'essai dit jusqu'où il est allé : ce qu'il a relevé avant la panne reste dans le bilan
  bilan.panne = panne instanceof Error ? panne.message.slice(0, 600) : String(panne);
  ecarts.push("l'essai s'est arrêté avant la fin");
}

bilan.erreurs = e.erreurs;
bilan.ecarts = ecarts;
console.log(JSON.stringify(bilan, null, 1));
// après une panne, le navigateur peut déjà être fermé
await e.ferme().catch(() => {});
