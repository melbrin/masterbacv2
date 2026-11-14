// Les outils communs des essais à la main dans un vrai navigateur (le navigateur intégré à l'atelier met les animations
// en pause). Ils ouvrent un navigateur en largeur téléphone, connectent le compte d'essai par le code de la boîte locale,
// et gardent sa session dans un fichier, hors du dépôt, d'un essai à l'autre : la demande de code est limitée à cinq
// par heure et par adresse, et à dix par heure et par poste.
// Il faut : le serveur sur le port 3457 et la base locale.
// Une session ne sert qu'à un essai à la fois : deux essais lancés en même temps avec le même fichier se déconnectent l'un l'autre.
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { chromium, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";

export const BASE = "http://localhost:3457";
export const attends = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Le code de connexion reçu par l'adresse dans la boîte locale, après l'instant donné. */
async function code(adresse: string, apres: number): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const d = (await (await fetch("http://127.0.0.1:54324/api/v1/messages?limit=8")).json()) as { messages: { ID: string; Created: string; To: { Address: string }[] }[] };
    const m = d.messages.find((x) => x.To.some((t) => t.Address === adresse) && Date.parse(x.Created) >= apres - 2000);
    if (m) {
      const c = (await (await fetch(`http://127.0.0.1:54324/api/v1/message/${m.ID}`)).json()) as { Text: string; HTML: string };
      const t = (c.Text + " " + c.HTML.replace(/<[^>]+>/g, " ")).match(/\b\d{6}\b/);
      if (t) return t[0];
    }
    await attends(400);
  }
  throw new Error("code introuvable dans la boîte locale");
}

export interface Essai {
  nav: Browser;
  ctx: BrowserContext;
  page: Page;
  /** les erreurs de page et de console relevées pendant l'essai */
  erreurs: string[];
  /** une capture dans le dossier de sortie */
  photo: (nom: string, entiere?: boolean) => Promise<void>;
  /** le texte du premier élément trouvé, espaces réduits ; null s'il n'existe pas */
  texte: (selecteur: string) => Promise<string | null>;
  /** la largeur du contenu de la page : plus grande que la fenêtre, la page défile de côté */
  largeur: () => Promise<number>;
  /** enregistre la session et ferme le navigateur */
  ferme: () => Promise<void>;
}

export interface OptionsEssai {
  /** le dossier des captures */
  sortie: string;
  adresse?: string;
  /** le fichier où la session est gardée, hors du dépôt ; par défaut, la variable ESSAI_SESSION */
  session?: string;
  largeur?: number;
  hauteur?: number;
  sombre?: boolean;
  /** demande moins d'animations, comme le réglage du téléphone */
  calme?: boolean;
  /** laisse le guide des paillasses en marche (une main montre chaque geste, et le score est plafonné) ; sans cela, l'essai le coupe */
  guide?: boolean;
}

/** Ouvre un navigateur connecté au compte d'essai. La page d'arrivée est « /app ». */
export async function ouvre(o: OptionsEssai): Promise<Essai> {
  const adresse = o.adresse ?? "theo.essai@exemple.fr";
  const session = o.session ?? process.env.ESSAI_SESSION;
  mkdirSync(o.sortie, { recursive: true });
  const nav = await chromium.launch();
  const ctx = await nav.newContext({
    viewport: { width: o.largeur ?? 390, height: o.hauteur ?? 844 }, deviceScaleFactor: 2, locale: "fr-FR", timezoneId: "Europe/Paris",
    colorScheme: o.sombre ? "dark" : "light", reducedMotion: o.calme ? "reduce" : "no-preference", hasTouch: (o.largeur ?? 390) < 700,
    storageState: session && existsSync(session) ? session : undefined,
  });
  // le guide des paillasses est en marche à la première visite : un essai qui manipule seul le coupe avant le chargement de la page
  await ctx.addInitScript((choix) => { try { window.localStorage.setItem("mb-guide", choix); } catch { /* sans stockage, le guide reste en marche */ } }, o.guide ? "oui" : "non");
  const page = await ctx.newPage();
  const erreurs: string[] = [];
  page.on("pageerror", (e) => erreurs.push(`erreur de page : ${e.message.slice(0, 300)}`));
  page.on("console", (m) => { if (m.type() === "error") erreurs.push(`console : ${m.text().slice(0, 300)}`); });
  // une session gardée ouvre l'application ; sinon la page renvoie à la connexion, et l'essai demande un code
  await page.goto(`${BASE}/app`);
  if (!new URL(page.url()).pathname.startsWith("/app")) {
    await page.goto(`${BASE}/compte/connexion`);
    await page.fill("#adresse", adresse);
    const t0 = Date.now();
    await page.click("button[type=submit]");
    await page.waitForSelector("#code", { timeout: 10000 }).catch(async () => {
      throw new Error(`Pas de code : ${await page.locator("[role=alert]").first().innerText().catch(() => "la page de connexion ne répond pas")}`);
    });
    await page.fill("#code", await code(adresse, t0));
    await page.click("button[type=submit]");
    await page.waitForURL(/\/app/);
  }
  const garde = async () => { if (session) { mkdirSync(dirname(session), { recursive: true }); await ctx.storageState({ path: session }); } };
  await garde();
  return {
    nav, ctx, page, erreurs,
    photo: async (nom, entiere = false) => { await page.screenshot({ path: `${o.sortie}/${nom}.png`, fullPage: entiere }); },
    // un élément dessiné (SVG) ou replié (dans un « details » fermé) n'a pas de texte affiché : on lit alors son contenu
    texte: (selecteur) => page.locator(selecteur).first().evaluate((el) => ((el as HTMLElement).innerText || el.textContent || "").replace(/\s+/g, " ").trim()).catch(() => null),
    largeur: () => page.evaluate(() => document.documentElement.scrollWidth),
    ferme: async () => { await garde(); await nav.close(); },
  };
}

// ---------- les gestes sur une scène dessinée ----------

export interface Point { x: number; y: number }

/** Le point de l'écran qui correspond à un point d'une scène SVG, donné dans les unités de son dessin. */
export async function pointEcran(scene: Locator, p: Point): Promise<Point> {
  return scene.evaluate((svg, q) => {
    const m = (svg as SVGSVGElement).getScreenCTM();
    if (!m) throw new Error("scène introuvable");
    return { x: m.a * q.x + m.c * q.y + m.e, y: m.b * q.x + m.d * q.y + m.f };
  }, p);
}

/** Glisse d'un point de l'écran à un autre, comme un doigt : appui, déplacement par petits pas, relâchement. */
export async function glisse(page: Page, de: Point, vers: Point, pas = 14, pause = 12): Promise<void> {
  await page.mouse.move(de.x, de.y);
  await page.mouse.down();
  for (let i = 1; i <= pas; i++) {
    await page.mouse.move(de.x + ((vers.x - de.x) * i) / pas, de.y + ((vers.y - de.y) * i) / pas);
    await attends(pause);
  }
  await page.mouse.up();
}

/** Appuie sur un point de l'écran et maintient l'appui pendant la durée donnée, en millisecondes. */
export async function maintiens(page: Page, p: Point, ms: number): Promise<void> {
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await attends(ms);
  await page.mouse.up();
}

/** Le centre d'un élément à l'écran. */
export async function centre(element: Locator): Promise<Point> {
  const b = await element.boundingBox();
  if (!b) throw new Error("élément introuvable ou caché");
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

// ---------- suivre le guide d'une paillasse ----------
// Le guide montre le prochain geste avec une main (components/tp/kit/guide.tsx). Un essai peut le suivre à la souris,
// sans rien savoir de la paillasse : il lit la phrase, le geste que la main montre, la touche mise en avant, et il fait
// ce geste. C'est l'essai de bout en bout d'un guide : si la main se trompe d'endroit ou d'ordre, la manipulation échoue.

/** Ce que le guide montre en ce moment. */
export interface PasVu {
  /** le nom du moment : il change quand le geste à faire change */
  cle: string;
  texte: string;
  /** le geste de la main dans la scène, s'il y en a un */
  geste: "glisser" | "maintenir" | "toucher" | "tourner" | "montrer" | null;
  /** où la main agit, dans les unités du dessin */
  x: number;
  y: number;
  /** pour « glisser » : où poser */
  versX: number;
  versY: number;
  /** pour « tourner » : les angles de départ et d'arrivée, et le rayon du geste */
  de: number;
  a: number;
  r: number;
  /** le nom de la touche du bas mise en avant, s'il y en a une */
  touche: string | null;
}

/** Lit le guide à l'écran ; null si le guide est coupé ou n'a rien à dire. */
export async function lisGuide(page: Page): Promise<PasVu | null> {
  return page.evaluate(() => {
    const phrase = document.querySelector<HTMLElement>(".pl-guide");
    if (!phrase) return null;
    const main = document.querySelector<SVGGElement>(".pl-main");
    const n = (nom: string) => Number(main?.getAttribute(nom) ?? 0);
    const touche = document.querySelector<HTMLElement>(".pl-pied .pl-vise");
    const geste = main?.getAttribute("data-geste") ?? null;
    return {
      cle: phrase.dataset.guide ?? "", texte: phrase.innerText.replace(/\s+/g, " ").trim(),
      geste: geste as "glisser" | "maintenir" | "toucher" | "tourner" | "montrer" | null,
      x: n("data-x"), y: n("data-y"), versX: n("data-vers-x"), versY: n("data-vers-y"), de: n("data-de"), a: n("data-a"), r: n("data-r"),
      touche: touche ? touche.innerText.replace(/\s+/g, " ").trim() : null,
    };
  });
}

/** Attend que le guide passe à un autre moment ; rend ce qu'il montre alors (le même s'il n'a pas changé à temps). */
export async function attendsLeGuide(page: Page, cle: string, ms = 30000): Promise<PasVu | null> {
  const fin = Date.now() + ms;
  for (;;) {
    const p = await lisGuide(page);
    if (!p || p.cle !== cle || Date.now() > fin) return p;
    await attends(30);
  }
}

/**
 * Fait à la souris le geste que la main du guide montre dans la scène : glisser, garder appuyé jusqu'à ce que la consigne
 * change, toucher, tourner. Rend faux si la main ne montre aucun geste à faire (une touche du bas, une lecture, une attente).
 */
export async function faisLeGeste(page: Page, scene: Locator, p: PasVu): Promise<boolean> {
  const ici = (x: number, y: number) => pointEcran(scene, { x, y });
  const surCercle = (deg: number, rayon: number) => ici(p.x + rayon * Math.sin((deg * Math.PI) / 180), p.y - rayon * Math.cos((deg * Math.PI) / 180));
  switch (p.geste) {
    case "glisser":
      await glisse(page, await ici(p.x, p.y), await ici(p.versX, p.versY), 16, 14);
      // le temps que l'objet se pose, et que la vue finisse de se rapprocher si le geste la déplace
      await attends(420);
      return true;
    case "maintenir": {
      const point = await ici(p.x, p.y);
      await page.mouse.move(point.x, point.y);
      await page.mouse.down();
      await attendsLeGuide(page, p.cle);
      await page.mouse.up();
      await attends(120);
      return true;
    }
    case "toucher": {
      const point = await ici(p.x, p.y);
      await page.mouse.click(point.x, point.y);
      await attends(220);
      return true;
    }
    case "tourner": {
      // le doigt se pose sur la poignée, puis suit l'arc jusqu'à l'angle d'arrivée
      const rayon = Math.max(10, p.r - 12);
      const depart = await surCercle(p.de, rayon);
      await page.mouse.move(depart.x, depart.y);
      await page.mouse.down();
      const pas = Math.max(4, Math.ceil(Math.abs(p.a - p.de) / 6));
      for (let i = 1; i <= pas; i++) {
        const q = await surCercle(p.de + ((p.a - p.de) * i) / pas, rayon);
        await page.mouse.move(q.x, q.y);
        await attends(16);
      }
      await page.mouse.up();
      await attends(120);
      return true;
    }
    default:
      return false;
  }
}
