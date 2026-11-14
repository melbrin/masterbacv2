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
    texte: (selecteur) => page.locator(selecteur).first().innerText().then((t) => t.replace(/\s+/g, " ").trim()).catch(() => null),
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
