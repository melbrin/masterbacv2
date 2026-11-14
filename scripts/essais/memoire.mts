// Essai à la main des jeux de mémoire dans un vrai navigateur, en largeur téléphone (390 × 844) : le navigateur intégré
// à l'atelier met les animations et les minuteurs en pause. Il se connecte par le code de la boîte locale, puis joue
// chaque jeu jusqu'à l'écran de fin : quelques manches réussies (il lit ce qui s'affiche pour répondre juste, comme
// un élève), puis des erreurs. Il prend des captures (consigne, mémorisation, rappel, verdict, fin), vérifie la largeur
// de la page, le verdict de chaque manche, le score final et la console, et écrit un bilan.
// À transformer en parcours Playwright (docs/04-tests-et-qualite.md).
// Il faut : le serveur sur le port 3457, la base locale, et le compte local nina.essai@exemple.fr.
// Usage : node scripts/essais/memoire.mts <dossier des captures> [jeux séparés par des virgules, ou « tous »] [clair ou sombre] [adresse du compte]
// Trois réglages par variable d'environnement :
//   MEMOIRE_SESSION=<fichier hors du dépôt> garde la session du compte d'essai d'un essai à l'autre : la demande de code
//     est limitée à cinq par heure et par adresse ;
//   MEMOIRE_PAGES=<nombre> règle le nombre de pages qui jouent en même temps (4 sans réglage) ;
//   MEMOIRE_TOUT=1 joue chaque jeu sans erreur jusqu'au niveau le plus haut, avec une capture de ce niveau : la partie
//     doit alors finir à 100 points.
import { existsSync, mkdirSync } from "node:fs";
import { chromium, type Locator, type Page } from "@playwright/test";

const BASE = "http://localhost:3457";
const SORTIE = process.argv[2];
const SEULS = process.argv[3] && process.argv[3] !== "tous" ? process.argv[3].split(",") : null;
const THEME = process.argv[4] === "sombre" ? "dark" : "light";
const ADRESSE = process.argv[5] ?? "nina.essai@exemple.fr";
const SESSION = process.env.MEMOIRE_SESSION;
const PAGES = Math.max(1, Number(process.env.MEMOIRE_PAGES ?? 4) || 1);
const TOUT = process.env.MEMOIRE_TOUT === "1";
const LARGEUR = 390;
if (!SORTIE) throw new Error("Usage : node scripts/essais/memoire.mts <dossier des captures> [jeux] [clair|sombre] [adresse]");
mkdirSync(SORTIE, { recursive: true });
const attends = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------- connexion ----------

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

// Si un autre essai a demandé un code au même moment, le code lu n'est plus le bon : la connexion recommence.
async function connecte(page: Page): Promise<void> {
  for (let essai = 1; ; essai++) {
    try {
      await page.goto(`${BASE}/compte/connexion`);
      await page.fill("#adresse", ADRESSE);
      const t0 = Date.now();
      await page.click("button[type=submit]");
      await page.waitForSelector("#code", { timeout: 10000 });
      await page.fill("#code", await code(t0));
      await page.click("button[type=submit]");
      await page.waitForURL(/\/app/, { timeout: 10000 });
      return;
    } catch (erreur) {
      if (essai >= 4) throw erreur;
      await attends(1500 * essai);
    }
  }
}

const nav = await chromium.launch();
const ctx = await nav.newContext({
  viewport: { width: LARGEUR, height: 844 }, deviceScaleFactor: 2, locale: "fr-FR", timezoneId: "Europe/Paris", colorScheme: THEME,
  storageState: SESSION && existsSync(SESSION) ? SESSION : undefined,
});
const erreurs: string[] = [];
/** Une page du navigateur, dont les erreurs sont relevées. Toutes les pages partagent la session. */
async function ouvre(): Promise<Page> {
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreurs.push(`erreur de page : ${e.message.slice(0, 300)}`));
  page.on("console", (m) => { if (m.type() === "error") erreurs.push(`console : ${m.text().slice(0, 300)}`); });
  return page;
}
const accueil = await ouvre();
// une session gardée ouvre la page des jeux ; sinon la page renvoie à la connexion, et l'essai demande un code
await accueil.goto(`${BASE}/app/memoire`);
if (!accueil.url().includes("/app/memoire")) await connecte(accueil);
if (SESSION) await ctx.storageState({ path: SESSION });

interface Bilan { [cle: string]: unknown }

// ---------- ce que l'essai voit, et ce qu'il fait, dans une page ----------

/** Tout ce qu'il faut pour jouer dans une page : lire ce qui s'affiche, répondre, prendre les captures. */
function atelier(page: Page) {
  /** Ce qui est affiché à un instant : de quoi répondre juste, sans rien lire d'autre que l'écran. */
  interface Image {
    phase: string | null;
    /** le grand signe qui défile : un chiffre, une opération, un mot, un code */
    vedette: string;
    /** les deux mots d'une paire */
    paire: string[];
    /** les rangs des cases allumées, et des touches allumées */
    allumees: number[];
    touches: number[];
    /** le nom de chaque case de la grille, avec ce qu'elle porte */
    cases: string[];
    /** les objets d'une planche */
    tuiles: string[];
    /** les paquets montrés */
    paquets: string[];
    recit: string;
    /** ce que montre la scène quand elle n'est pas faite de pièces communes (cartes, personnages, pièces d'une maison) */
    reperes: string[];
  }

  // Un témoin dans la page note chaque changement de ce qui est affiché. Il se pose avant « Commencer ».
  async function poseTemoin(): Promise<void> {
    await page.evaluate(() => {
      const fenetre = window as unknown as { __memoire?: string[] };
      if (fenetre.__memoire) return;
      const vus: string[] = [];
      fenetre.__memoire = vus;
      const textes = (selecteur: string) => [...document.querySelectorAll(selecteur)].map((e) => (e.textContent ?? "").replace(/\s+/g, " ").trim());
      const rangs = (selecteur: string, classe: string) => [...document.querySelectorAll(selecteur)].flatMap((e, i) => (e.classList.contains(classe) ? [i] : []));
      const releve = () => {
        const image = JSON.stringify({
          phase: document.querySelector<HTMLElement>(".mem-scene")?.dataset.phase ?? null,
          vedette: textes(".mem-vedette")[0] ?? "",
          paire: textes(".mem-paire b"),
          allumees: rangs(".mem-grille .mem-case", "mem-case-allumee"),
          touches: rangs(".mem-pad .mem-couleur", "mem-allumee"),
          cases: [...document.querySelectorAll(".mem-grille .mem-case")].map((e) => e.getAttribute("aria-label") ?? ""),
          tuiles: textes(".mem-planche:not(.mem-cachee) .mem-tuile"),
          paquets: textes(".mem-paquet-lu:not(.mem-cachee)"),
          recit: textes(".mem-recit-texte")[0] ?? "",
          reperes: [...document.querySelectorAll("[data-repere]")].map((e) => e.getAttribute("data-repere") ?? ""),
        });
        if (image !== vus[vus.length - 1]) vus.push(image);
      };
      new MutationObserver(releve).observe(document.querySelector(".jeu-cadre")!, { subtree: true, childList: true, attributes: true, characterData: true });
      releve();
    });
  }

  /** Ce qui a été affiché depuis le dernier verdict : la manche en cours. */
  async function vus(): Promise<Image[]> {
    const tout = (await page.evaluate(() => (window as unknown as { __memoire: string[] }).__memoire)).map((x) => JSON.parse(x) as Image);
    return tout.slice(tout.map((i) => i.phase).lastIndexOf("verdict") + 1);
  }

  /**
   * Les valeurs qui se sont succédé pendant la mémorisation (ou pendant toute la manche, avec `tout`) :
   * une valeur nulle (un blanc) sépare deux éléments.
   */
  function defile<T>(images: Image[], lit: (image: Image) => T | null, tout = false): T[] {
    const suite: T[] = [];
    let avant: string | null = null;
    for (const image of images.filter((i) => tout || i.phase === "memorise")) {
      const valeur = lit(image);
      const cle = valeur === null ? null : JSON.stringify(valeur);
      if (cle !== null && cle !== avant) suite.push(valeur as T);
      avant = cle;
    }
    return suite;
  }
  const vedettes = (images: Image[]) => defile(images, (i) => i.vedette || null);
  /** Ce que la mémorisation a montré de particulier au jeu (cartes, formes, personnages, pièces) : la première image qui en porte. */
  const reperes = (images: Image[]) => images.filter((i) => i.phase === "memorise").map((i) => i.reperes).find((r) => r.some((x) => x !== "" && !x.endsWith("|")))!;

  const photo = (nom: string) => page.screenshot({ path: `${SORTIE}/${nom}.png` });
  const texte = (cible: Locator) => cible.first().innerText().then((t) => t.replace(/\s+/g, " ").trim()).catch(() => "");
  const largeur = () => page.evaluate(() => document.documentElement.scrollWidth);
  const libres = (selecteur: string) => page.locator(`${selecteur}:not([aria-disabled="true"])`);
  const exact = (mot: string) => new RegExp(`^\\s*${mot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i");

  /** Tape des signes sur le pavé ou le clavier affiché, puis valide. */
  async function tape(clavier: string, signes: readonly string[], valide = true): Promise<void> {
    for (const signe of signes) await page.locator(`${clavier} .mem-touche`, { hasText: exact(signe) }).click();
    if (valide) await page.getByRole("button", { name: "Valider" }).click();
  }
  /** Un autre signe que celui-ci, pour une réponse fausse de la même longueur. */
  const autreChiffre = (chiffre: string) => String((Number(chiffre) + 1) % 10);

  // ---------- les jeux ----------

  interface Jeu {
    id: string;
    /** le nombre de niveaux : le score attendu est la part des niveaux réussis */
    niveaux: number;
    /** le nombre de manches que l'essai réussit avant de se tromper ; `niveaux` pour aller jusqu'au niveau le plus haut */
    reussies: number;
    /** le temps laissé à ce qui est montré pour finir d'arriver, avant la capture de la mémorisation ; 220 millisecondes sans réglage */
    pose?: number;
    /** répond à la manche en cours : juste, ou faux. `avantValidation` est appelée quand la réponse est posée, avant de valider. */
    repond: (images: Image[], juste: boolean, avantValidation: () => Promise<void>) => Promise<void>;
  }

  const SIGNES = { "+": (a: number, b: number) => a + b, "−": (a: number, b: number) => a - b, "×": (a: number, b: number) => a * b } as const;
  const sansArticle = (nom: string) => nom.replace(/^(le |la |l')/, "");
  /** « Case ligne 1, colonne 2 : maison » : ce que porte la case, ou rien. */
  const contenuCase = (nom: string) => nom.split("\u00a0: ")[1]?.split(",")[0] ?? "";

  const chiffres = (envers: boolean): Jeu["repond"] => async (images, juste, avant) => {
    const suite = vedettes(images);
    const attendu = envers ? suite.slice().reverse() : suite;
    await tape(".mem-pave", juste ? attendu : [autreChiffre(attendu[0]), ...attendu.slice(1)], false);
    await avant();
    await page.getByRole("button", { name: "Valider" }).click();
  };

  const JEUX: Jeu[] = [
    { id: "chiffres", niveaux: 10, reussies: 3, repond: chiffres(false) },
    { id: "envers", niveaux: 9, reussies: 3, repond: chiffres(true) },
    {
      id: "couleurs", niveaux: 10, reussies: 3,
      async repond(images, juste, avant) {
        const suite = defile(images, (i) => (i.touches.length === 1 ? i.touches[0] : null));
        const touches = page.locator(".mem-pad .mem-couleur");
        if (!juste) { await avant(); await touches.nth((suite[0] + 1) % 4).click(); return; }
        for (const [rang, touche] of suite.entries()) {
          if (rang === suite.length - 1) await avant();
          await touches.nth(touche).click();
          // le temps que la touche s'éteigne : un appui sur une touche encore en mouvement est rejoué par Playwright,
          // qui fait alors défiler la page
          await attends(380);
        }
      },
    },
    {
      id: "calcul", niveaux: 7, reussies: 3,
      async repond(images, juste, avant) {
        const [depart, ...operations] = vedettes(images);
        const resultat = operations.reduce((total, o) => SIGNES[o[0] as keyof typeof SIGNES](total, Number(o.slice(1).trim())), Number(depart));
        await tape(".mem-pave", [...String(juste ? resultat : (resultat + 1) % 100)], false);
        await avant();
        await page.getByRole("button", { name: "Valider" }).click();
      },
    },
    {
      id: "cases", niveaux: 10, reussies: 3,
      async repond(images, juste, avant) {
        const allumees = defile(images, (i) => (i.allumees.length > 0 ? i.allumees : null))[0];
        const cases = page.locator(".mem-grille .mem-case");
        if (!juste) {
          const total = await cases.count();
          await avant();
          await cases.nth([...Array(total).keys()].find((rang) => !allumees.includes(rang))!).click();
          return;
        }
        for (const [n, rang] of allumees.entries()) {
          if (n === allumees.length - 1) await avant();
          await cases.nth(rang).click();
        }
      },
    },
    {
      id: "chemin", niveaux: 8, reussies: 3,
      async repond(images, juste, avant) {
        const chemin = defile(images, (i) => (i.allumees.length === 1 ? i.allumees[0] : null));
        const cases = page.locator(".mem-grille .mem-case");
        if (!juste) { await avant(); await cases.nth((chemin[0] + 1) % 16).click(); return; }
        for (const [n, rang] of chemin.entries()) {
          if (n === chemin.length - 1) await avant();
          await cases.nth(rang).click();
        }
      },
    },
    {
      id: "places", niveaux: 6, reussies: 3,
      async repond(images, juste, avant) {
        // pendant la mémorisation, chaque case dit l'objet qu'elle porte
        const pose = images.filter((i) => i.phase === "memorise").map((i) => i.cases.map(contenuCase)).find((cases) => cases.some(Boolean))!;
        const cases = page.locator(".mem-grille .mem-case");
        const nombre = pose.filter(Boolean).length;
        for (let n = 0; n < nombre; n++) {
          const demande = sansArticle(await texte(page.locator(".mem-question-objet")));
          const place = pose.indexOf(demande);
          if (place < 0) throw new Error(`objet demandé introuvable : « ${demande} » parmi ${pose.filter(Boolean).join(", ")}`);
          if (n === 0) await avant();
          if (!juste) { await cases.nth((place + 1) % pose.length).click(); return; }
          await cases.nth(place).click();
          // la question suivante arrive : le nom de l'objet demandé change
          if (n + 1 < nombre) await page.waitForFunction((ancien) => !document.querySelector(".mem-question-objet")?.textContent?.includes(ancien), demande);
        }
      },
    },
    {
      id: "manquant", niveaux: 6, reussies: 3,
      async repond(images, juste, avant) {
        const montres = images.filter((i) => i.phase === "memorise").map((i) => i.tuiles).find((tuiles) => tuiles.length > 0)!;
        const restants = (await vus()).filter((i) => i.phase === "rappel").at(-1)!.tuiles;
        const manquant = montres.find((objet) => !restants.includes(objet))!;
        await avant();
        const options = page.locator(".mem-choix .mem-option");
        if (juste) await options.filter({ hasText: exact(manquant) }).click();
        else await options.filter({ hasNotText: exact(manquant) }).first().click();
      },
    },
    {
      id: "change", niveaux: 8, reussies: 3,
      async repond(images, juste, avant) {
        const planche = images.filter((i) => i.phase === "memorise").map((i) => i.cases.map(contenuCase)).find((cases) => cases.some(Boolean))!;
        const apres = (await vus()).filter((i) => i.phase === "rappel").at(-1)!.cases.map(contenuCase);
        const change = planche.findIndex((forme, rang) => forme !== apres[rang]);
        await avant();
        await page.locator(".mem-grille .mem-case").nth(juste ? change : (change + 1) % planche.length).click();
      },
    },
    {
      // ce jeu est joué jusqu'au niveau le plus haut : la partie s'arrête sans erreur, à 100 points
      id: "flash", niveaux: 5, reussies: 5,
      async repond(images, juste, avant) {
        const signes = [...vedettes(images)[0]];
        await tape(".mem-clavier", juste ? signes : [signes[0] === "A" ? "C" : "A", ...signes.slice(1)], false);
        await avant();
        await page.getByRole("button", { name: "Valider" }).click();
      },
    },
    {
      id: "mots", niveaux: 7, reussies: 2,
      async repond(images, juste, avant) {
        const liste = vedettes(images);
        const mots = page.locator(".mem-mots .mem-mot");
        // pour se tromper : un mot hors de la liste à la place du premier
        for (const mot of juste ? liste : liste.slice(1)) await mots.filter({ hasText: exact(mot) }).click();
        if (!juste) for (const rang of [...Array(await mots.count()).keys()]) {
          if (!liste.includes(await texte(mots.nth(rang)))) { await mots.nth(rang).click(); break; }
        }
        await avant();
        await page.getByRole("button", { name: "Valider" }).click();
      },
    },
    {
      id: "associes", niveaux: 5, reussies: 2,
      async repond(images, juste, avant) {
        const paires = new Map(defile(images, (i) => (i.paire.length === 2 ? i.paire : null)).map(([premier, second]) => [premier, second]));
        for (let n = 0; n < paires.size; n++) {
          const premier = (await texte(page.locator(".mem-vedette-mot"))).replace(/\s*\?$/, "");
          const second = paires.get(premier)!;
          const options = libres(".mem-choix .mem-option");
          if (n === 0) await avant();
          if (!juste) { await options.filter({ hasNotText: exact(second) }).first().click(); return; }
          await options.filter({ hasText: exact(second) }).click();
          if (n + 1 < paires.size) await page.waitForFunction((ancien) => !document.querySelector(".mem-vedette-mot")?.textContent?.startsWith(ancien), premier);
        }
      },
    },
    {
      id: "tri", niveaux: 6, reussies: 3,
      async repond(images, juste, avant) {
        const ranges = [...vedettes(images).map(Number).sort((x, y) => x - y).join("")];
        await tape(".mem-pave", juste ? ranges : [autreChiffre(ranges[0]), ...ranges.slice(1)], false);
        await avant();
        await page.getByRole("button", { name: "Valider" }).click();
      },
    },
    {
      id: "retour", niveaux: 6, reussies: 2,
      async repond(_images, juste, avant) {
        // la consigne de la manche dit de combien de tours reculer ; elle s'affiche en capitales
        const consigne = (await texte(page.locator(".mem-scene .jeu-etiquette"))).toLocaleLowerCase("fr-FR");
        const recul = consigne.includes("trois") ? 3 : consigne.includes("deux") ? 2 : 1;
        const boutons = libres(".mem-deux .btn");
        let premier = true;
        for (let garde = 0; garde < 600 && !(await page.locator('.mem-scene[data-phase="verdict"], .jeu-fin').count()); garde++) {
          if ((await boutons.count()) < 2) { await attends(40); continue; }
          // tous les symboles montrés depuis le début de la manche, le dernier étant celui à juger
          const suite = defile(await vus(), (i) => i.reperes[0] || null, true);
          const pareil = suite.length > recul && suite.at(-1) === suite.at(-1 - recul);
          if (premier) { premier = false; await avant(); }
          // le premier bouton dit « Le même », le second « Pas le même »
          await boutons.nth(pareil === juste ? 0 : 1).click();
          await page.waitForFunction(() => document.querySelectorAll('.mem-deux .btn:not([aria-disabled="true"])').length === 0);
        }
      },
    },
    {
      // les cartes mettent une demi-seconde à se retourner
      id: "symboles", niveaux: 3, reussies: 1, pose: 700,
      async repond(images, juste, avant) {
        // pendant la mémorisation, toutes les cartes sont retournées
        const cartes = reperes(images);
        const boutons = page.locator(".mem-cartes .jeu-paire");
        // le temps que les cartes finissent de se retourner
        await attends(600);
        await avant();
        if (juste) {
          for (const symbole of new Set(cartes)) {
            for (const rang of cartes.flatMap((c, i) => (c === symbole ? [i] : []))) await boutons.nth(rang).click();
            await attends(120);
          }
          return;
        }
        // la même paire ratée, encore et encore, jusqu'à perdre la planche
        const autre = cartes.findIndex((c) => c !== cartes[0]);
        for (let n = 0; n < 40 && !(await page.locator('.mem-scene[data-phase="verdict"]').count()); n++) {
          await boutons.nth(0).click();
          await boutons.nth(autre).click();
          await attends(1100);
        }
      },
    },
    {
      id: "intrus", niveaux: 8, reussies: 3,
      async repond(images, juste, avant) {
        const planche = images.filter((i) => i.phase === "memorise").map((i) => i.cases.map(contenuCase)).find((cases) => cases.some(Boolean))!;
        const apres = (await vus()).filter((i) => i.phase === "rappel").at(-1)!.cases.map(contenuCase);
        const intrus = apres.findIndex((objet) => !planche.includes(objet));
        await avant();
        await page.locator(".mem-grille .mem-case").nth(juste ? intrus : (intrus + 1) % apres.length).click();
      },
    },
    {
      id: "duos", niveaux: 6, reussies: 3,
      async repond(images, juste, avant) {
        // chaque forme montrée dit sa couleur ; les quatre couleurs proposées sont toujours dans le même ordre
        const couleurs = new Map(reperes(images).map((r) => r.split(":") as [string, string]));
        const TEINTES = ["bleu", "vert", "rouge", "sable"];
        const options = page.locator(".mem-choix .mem-option");
        for (let n = 0; n < 3; n++) {
          const demandee = sansArticle(await texte(page.locator(".mem-question-objet")));
          const rang = TEINTES.indexOf(couleurs.get(demandee)!);
          if (rang < 0) throw new Error(`forme demandée introuvable : « ${demandee} »`);
          if (n === 0) await avant();
          if (!juste) { await options.nth((rang + 1) % 4).click(); return; }
          await options.nth(rang).click();
          if (n < 2) await page.waitForFunction((ancienne) => !document.querySelector(".mem-question-objet")?.textContent?.includes(ancienne), demandee);
        }
      },
    },
    {
      id: "file", niveaux: 6, reussies: 3,
      async repond(images, juste, avant) {
        const ordre = vedettes(images);
        const mots = page.locator(".mem-mots .mem-mot");
        await avant();
        // pour se tromper : le deuxième mot d'abord
        for (const mot of juste ? ordre : [ordre[1]]) await mots.filter({ hasText: exact(mot) }).click();
      },
    },
    {
      id: "prenoms", niveaux: 6, reussies: 3,
      async repond(images, juste, avant) {
        const prenoms = new Map(reperes(images).map((r) => r.split("|") as [string, string]));
        for (let n = 0; n < prenoms.size; n++) {
          const portrait = await texte(page.locator(".mem-portrait .jeu-sr"));
          const prenom = prenoms.get(portrait);
          if (!prenom) throw new Error(`personnage introuvable : « ${portrait} »`);
          const options = libres(".mem-choix .mem-option");
          if (n === 0) await avant();
          if (!juste) { await options.filter({ hasNotText: exact(prenom) }).first().click(); return; }
          await options.filter({ hasText: exact(prenom) }).click();
          if (n + 1 < prenoms.size) await page.waitForFunction((ancien) => document.querySelector(".mem-portrait .jeu-sr")?.textContent !== ancien, portrait);
        }
      },
    },
    {
      id: "palais", niveaux: 6, reussies: 3,
      async repond(images, juste, avant) {
        // pendant la mémorisation, chaque pièce dit l'objet qu'elle porte
        // le nom d'une pièce s'affiche en capitales : il se compare en minuscules
        const minuscules = (nom: string) => nom.toLocaleLowerCase("fr-FR");
        const rangement = new Map(reperes(images).map((r) => r.split("|")).map(([piece, objet]) => [minuscules(piece), objet]));
        const nombre = [...rangement.values()].filter(Boolean).length;
        for (let n = 0; n < nombre; n++) {
          const piece = await page.locator(".mem-piece-ici .mem-piece-nom").textContent() ?? "";
          const objet = rangement.get(minuscules(piece));
          if (!objet) throw new Error(`pièce demandée introuvable : « ${piece} »`);
          const options = libres(".mem-choix .mem-option");
          if (n === 0) await avant();
          if (!juste) { await options.filter({ hasNotText: exact(objet) }).first().click(); return; }
          await options.filter({ hasText: exact(objet) }).click();
          if (n + 1 < nombre) await page.waitForFunction((ancienne) => document.querySelector(".mem-piece-ici .mem-piece-nom")?.textContent !== ancienne, piece);
        }
      },
    },
    {
      id: "paquets", niveaux: 7, reussies: 2,
      async repond(images, juste, avant) {
        const nombre = [...vedettes(images)[0]];
        await tape(".mem-pave", juste ? nombre : [autreChiffre(nombre[0]), ...nombre.slice(1)], false);
        await avant();
        await page.getByRole("button", { name: "Valider" }).click();
      },
    },
  ];

  /** Attend l'écran de consigne, vérifie que rien ne défile avant « Commencer », puis lance la partie. */
  async function commence(id: string): Promise<string> {
    await page.goto(`${BASE}/app/memoire/${id}`);
    await page.waitForSelector(".mem-consigne");
    await attends(900);
    await photo(`${id}-1-consigne`);
    const consigne = await texte(page.locator(".mem-consigne-texte"));
    if (await page.locator(".mem-scene").count()) erreurs.push(`${id} : quelque chose est affiché avant « Commencer »`);
    await poseTemoin();
    await page.getByRole("button", { name: "Commencer" }).click();
    return consigne;
  }

  /** Attend que la mémorisation montre quelque chose, puis prend la capture. */
  async function photoMemorisation(id: string, pose = 220): Promise<void> {
    for (let i = 0; i < 100; i++) {
      const images = await vus();
      if (images.some((x) => x.phase === "memorise" && (x.vedette || x.paire.length || x.allumees.length || x.touches.length || x.tuiles.length || x.paquets.length
        || x.reperes.some((r) => r !== "" && !r.endsWith("|")) || x.cases.some(contenuCase)))) break;
      await attends(40);
    }
    // le temps que ce qui vient d'apparaître finisse d'arriver
    await attends(pose);
    await photo(`${id}-2-memorisation`);
  }

  /** Joue un jeu à niveaux jusqu'à l'écran de fin. */
  async function joue(jeu: Jeu): Promise<Bilan> {
    const debut = Date.now();
    const consigne = await commence(jeu.id);
    const largeurs = [await largeur()];
    const manches: string[] = [];
    let reussies = 0;
    let photos = { memorisation: false, rappel: false, verdict: false };
    for (let manche = 0; manche < 40 && !(await page.locator(".jeu-fin").count()); manche++) {
      if (!photos.memorisation) { await photoMemorisation(jeu.id, jeu.pose); photos = { ...photos, memorisation: true }; largeurs.push(await largeur()); }
      await page.waitForSelector('.mem-scene[data-phase="rappel"]', { timeout: 60000 });
      const juste = TOUT || manche < jeu.reussies;
      await jeu.repond(await vus(), juste, async () => {
        if (TOUT && manche === jeu.niveaux - 1) { await photo(`${jeu.id}-6-niveau-le-plus-haut`); largeurs.push(await largeur()); }
        if (photos.rappel) return;
        photos = { ...photos, rappel: true };
        await photo(`${jeu.id}-3-rappel`);
        largeurs.push(await largeur());
      });
      await page.waitForSelector('.mem-scene[data-phase="verdict"], .jeu-fin', { timeout: 15000 });
      const verdict = (await page.locator(".mem-verdict .puce-ok").count()) ? "juste" : (await page.locator(".mem-verdict .puce-ko").count()) ? "faux" : "fin";
      manches.push(verdict);
      if (verdict !== "fin" && (verdict === "juste") !== juste) erreurs.push(`${jeu.id}, manche ${manche + 1} : réponse ${juste ? "juste" : "fausse"} jugée « ${verdict} »`);
      if (verdict === "juste") reussies += 1;
      if (verdict === "faux") {
        await attends(350);
        if (!photos.verdict) { photos = { ...photos, verdict: true }; await photo(`${jeu.id}-4-verdict`); largeurs.push(await largeur()); }
        await page.locator(".mem-suite").click();
      }
      // la manche suivante, ou l'écran de fin
      await page.waitForSelector('.mem-scene[data-phase="memorise"], .jeu-fin', { timeout: 15000 });
    }
    return fin(jeu.id, { consigne, manches, attendu: Math.round((100 * reussies) / jeu.niveaux), largeurs, secondes: Math.round((Date.now() - debut) / 1000) });
  }

  /** L'écran de fin : la capture, le score lu, le record, et « Rejouer » qui ramène à la consigne. */
  async function fin(id: string, bilan: Bilan & { attendu: number; largeurs: number[] }): Promise<Bilan> {
    await page.locator(".jeu-fin").waitFor({ timeout: 15000 });
    // le record arrive du serveur un instant après le score
    await page.locator(".jeu-fin-record b, .jeu-fin-record .puce").first().waitFor({ timeout: 8000 }).catch(() => erreurs.push(`${id} : pas de record sur l'écran de fin`));
    await attends(400);
    await photo(`${id}-5-fin`);
    const score = Number(await texte(page.locator(".jeu-fin .score-final b")));
    if (score !== bilan.attendu) erreurs.push(`${id} : score ${score}, attendu ${bilan.attendu}`);
    const largeurs = [...bilan.largeurs, await largeur()];
    if (largeurs.some((l) => l !== LARGEUR)) erreurs.push(`${id} : la page déborde (${largeurs.join(", ")})`);
    const phrase = await texte(page.locator(".jeu-fin-phrase"));
    const record = await texte(page.locator(".jeu-fin-record"));
    await page.getByRole("button", { name: "Rejouer" }).click();
    const rejoue = (await page.locator(".mem-consigne").count()) === 1 && (await page.locator(".jeu-fin").count()) === 0;
    if (!rejoue) erreurs.push(`${id} : « Rejouer » ne ramène pas à la consigne`);
    return { ...bilan, largeurs: undefined, score, phrase, record };
  }

  // ---------- L'histoire : trois histoires, cinq questions chacune ----------

  /** Où lire, dans le texte, la réponse à chaque question : le premier groupe de l'expression. */
  const REPONSES: [RegExp, RegExp][] = [
    [/^Quel jour (se passe|a lieu le pique-nique)/, /^(\S+),/],
    [/^Qui prend le bus/, /, (\S+) prend le bus/],
    [/^Où va le bus/, /pour aller ([^.]+)\./],
    [/^De quelle couleur est le manteau/, /manteau (\S+) et/],
    [/^Quel objet est tenu/, /et tient ([^.]+)\./],
    [/^Combien de minutes dure le trajet/, /dure (\d+) minutes/],
    [/^Qui attend devant/, /À l'arrivée, (\S+) attend/],
    [/^Combien de billets/, /(\d+) billets/],
    [/^À quelle heure est prévu/, /prévu à (\d+) heures/],
    [/^Qui reçoit le colis/, /^(\S+) reçoit/],
    [/^Quel jour arrive le colis/, /un colis (\S+) matin/],
    [/^Qu'y a-t-il dans le colis/, /il y a (un \S+)/],
    [/^De quelle couleur est l'objet du colis/, /il y a un \S+ (\S+)\./],
    [/^De quelle ville vient/, /vient de (\S+)\./],
    [/^Qui a envoyé/, /(\S+) a envoyé/],
    [/^Combien de kilos/, /(\d+) kilos/],
    [/^Où le cadeau est-il rangé/, /range le cadeau ([^.]+)\./],
    [/^Qui organise/, /, (\S+) organise/],
    [/^Où a lieu le pique-nique/, /un pique-nique ([^.]+)\./],
    [/^Combien de sandwichs/, /(\d+) sandwichs/],
    [/^De quelle couleur est le panier/, /un panier (\S+)\./],
    [/^Qui rejoint/, /(\S+) arrive avec/],
    [/^Avec quel objet/, /arrive avec ([^.]+)\./],
    [/^À quelle heure se met-il à pleuvoir/, /Vers (\d+) heures/],
    [/^Sous quoi/, /s'abrite sous ([^.]+)\./],
    [/^Combien de minutes dure la pluie/, /au bout de (\d+) minutes/],
    [/^Qui a perdu/, /^(\S+) a perdu/],
    [/^Quel objet a été perdu/, /a perdu (un \S+)/],
    [/^De quelle couleur est l'objet perdu/, /a perdu un \S+ (\S+)/],
    [/^Où l'objet a-t-il été perdu/, /a perdu un \S+ \S+ ([^.]+)\./],
    [/^Quel jour l'objet/, /C'était (\S+) dernier/],
    [/^Qui a retrouvé/, /(\S+) l'a retrouvé/],
    [/^Où l'objet a-t-il été retrouvé/, /l'a retrouvé ([^.]+)\./],
    [/^Combien de chocolats/, /(\d+) chocolats/],
    [/^À quel numéro/, /au numéro (\d+)/],
    [/^À quel jeu/, /jouent ensemble ([^.]+)\./],
    [/^Qui prépare/, /^(\S+) prépare/],
    [/^À quoi est le gâteau/, /un gâteau (.+?) pour/],
    [/^Pour qui/, /pour (\S+)\./],
    [/^Combien d'œufs/, /(\d+) œufs/],
    [/^Combien de grammes/, /(\d+) grammes/],
    [/^Combien de minutes cuit/, /pendant (\d+) minutes/],
    [/^De quelle couleur est le plat/, /un plat (\S+)\./],
    [/^Quel jour a lieu la fête/, /La fête a lieu (\S+),/],
    [/^Où a lieu la fête/, /La fête a lieu \S+, ([^.]+)\./],
    [/^Combien y a-t-il d'invités/, /(\d+) invités/],
    [/^Qui part en voyage/, /^(\S+) part en voyage/],
    [/^Quel jour commence/, /part en voyage (\S+) avec/],
    [/^De quelle couleur est le sac/, /un sac (\S+)\./],
    [/^À quelle heure part le train/, /part à (\d+) heures/],
    [/^De quel quai/, /quai numéro (\d+)/],
    [/^Quel est le numéro de la place/, /à la place (\d+)/],
    [/^Que lit/, /lit ([^.]+)\./],
    [/^Dans quelle ville/, /À (\S+), \S+ monte/],
    [/^Qui monte/, /, (\S+) monte dans le train/],
    [/^Combien d'heures dure/, /dure (\d+) heures/],
  ];
  const pareil = (a: string, b: string) => a.replace(/\u00a0h$/, "").toLocaleLowerCase("fr-FR") === b.toLocaleLowerCase("fr-FR");

  async function joueHistoire(reussies: number): Promise<Bilan> {
    const debut = Date.now();
    const consigne = await commence("histoire");
    const largeurs = [await largeur()];
    const reponses: string[] = [];
    let bonnes = 0;
    let photos = { memorisation: false, rappel: false, verdict: false };
    for (let tour = 0; tour < 40 && !(await page.locator(".jeu-fin").count()); tour++) {
      await page.waitForSelector(".mem-recit-texte, .mem-scene-question, .jeu-fin");
      if (await page.locator(".jeu-fin").count()) break;
      if (await page.locator(".mem-recit-texte").count()) {
        await attends(500);
        if (!photos.memorisation) { photos = { ...photos, memorisation: true }; await photo("histoire-2-memorisation"); largeurs.push(await largeur()); }
        await page.getByRole("button", { name: "Passer aux questions" }).click();
        await page.waitForSelector(".mem-scene-question");
      }
      const recit = (await page.evaluate(() => (window as unknown as { __memoire: string[] }).__memoire)).map((x) => (JSON.parse(x) as Image).recit).filter(Boolean).at(-1)!;
      const question = await texte(page.locator(".mem-scene-question .mem-question"));
      const lecture = REPONSES.find(([q]) => q.test(question));
      const bonne = lecture ? recit.match(lecture[1])?.[1] : undefined;
      if (!bonne) { erreurs.push(`histoire : réponse introuvable pour « ${question} » dans « ${recit} »`); break; }
      const options = libres(".mem-choix .mem-option");
      const libelles = await options.allInnerTexts();
      const juste = reponses.length < reussies;
      const rang = libelles.findIndex((libelle) => pareil(libelle.trim(), bonne) === juste);
      if (rang < 0) { erreurs.push(`histoire : « ${bonne} » n'est pas proposé pour « ${question} » (${libelles.join(", ")})`); break; }
      if (!photos.rappel) { photos = { ...photos, rappel: true }; await photo("histoire-3-rappel"); largeurs.push(await largeur()); }
      await options.nth(rang).click();
      await page.waitForSelector('.mem-scene-question[data-phase="verdict"], .jeu-fin');
      const verdict = (await page.locator(".mem-verdict .puce-ok").count()) ? "juste" : "faux";
      reponses.push(verdict);
      if ((verdict === "juste") !== juste) erreurs.push(`histoire, question ${reponses.length} : réponse ${juste ? "juste" : "fausse"} jugée « ${verdict} »`);
      if (verdict === "juste") {
        bonnes += 1;
        // la question suivante, l'histoire suivante ou l'écran de fin (le texte se compare sans ses espaces insécables)
        await page.waitForFunction((ancienne) => (document.querySelector(".mem-scene-question .mem-question")?.textContent ?? "").replace(/\s+/g, " ").trim() !== ancienne
          || !!document.querySelector(".jeu-fin"), question);
        continue;
      }
      await attends(350);
      if (!photos.verdict) { photos = { ...photos, verdict: true }; await photo("histoire-4-verdict"); largeurs.push(await largeur()); }
      await page.locator(".mem-suite").click();
    }
    return fin("histoire", { consigne, manches: reponses, attendu: Math.round((100 * bonnes) / 15), largeurs, secondes: Math.round((Date.now() - debut) / 1000) });
  }

  return { JEUX, joue, joueHistoire };
}

// ---------- la liste des jeux, puis chaque jeu ----------

const bilan: Bilan = { theme: THEME === "dark" ? "sombre" : "clair", mode: TOUT ? "sans erreur, jusqu'au niveau le plus haut" : "quelques manches réussies, puis des erreurs" };
await accueil.goto(`${BASE}/app/memoire`);
await accueil.waitForSelector(".hub-liste");
await attends(600);
await accueil.screenshot({ path: `${SORTIE}/liste.png`, fullPage: true });
const liens = await accueil.locator('.hub-carte a[href^="/app/memoire/"]').evaluateAll((as) => as.map((a) => a.getAttribute("href")!.split("/").pop()!));
bilan.liste = { jeux: liens.length, largeur: await accueil.evaluate(() => document.documentElement.scrollWidth) };
const prevus = [...atelier(accueil).JEUX.map((j) => j.id), "histoire"];
for (const id of liens) if (!prevus.includes(id)) erreurs.push(`${id} : jeu de la liste que l'essai ne sait pas jouer`);
await accueil.close();

// Plusieurs pages jouent en même temps : chacune prend le jeu suivant de la file jusqu'à ce qu'elle soit vide.
const file = liens.filter((id) => !SEULS || SEULS.includes(id));
const resultats: Bilan = {};
await Promise.all(Array.from({ length: Math.min(PAGES, file.length) }, async () => {
  const page = await ouvre();
  const essai = atelier(page);
  for (let id = file.shift(); id !== undefined; id = file.shift()) {
    const jeu = essai.JEUX.find((j) => j.id === id);
    try {
      if (id === "histoire") resultats[id] = await essai.joueHistoire(TOUT ? 15 : 7);
      else if (jeu) resultats[id] = await essai.joue(jeu);
    } catch (erreur) {
      erreurs.push(`${id} : ${String(erreur).slice(0, 300)}`);
      await page.screenshot({ path: `${SORTIE}/${id}-erreur.png` }).catch(() => {});
    }
  }
  await page.close();
}));
// le bilan suit l'ordre de la liste, quel que soit l'ordre où les pages ont fini
for (const id of liens) if (resultats[id] !== undefined) bilan[id] = resultats[id];

bilan.erreurs = erreurs;
console.log(JSON.stringify(bilan, null, 1));
if (SESSION) await ctx.storageState({ path: SESSION });
await nav.close();
process.exitCode = erreurs.length > 0 ? 1 : 0;
