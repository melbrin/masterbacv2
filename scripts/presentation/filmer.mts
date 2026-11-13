// Filme une présentation de l'application en local, calée sur la voix de chaque scène,
// puis assemble l'image et le son. Tout se passe sur l'ordinateur : base locale, boîte locale.
// Usage : node scripts/presentation/filmer.mts <dossier de travail> <fichier de sortie .mp4>
// Il faut : le serveur sur le port 3457, la base locale démarrée, ffmpeg, et la voix déjà fabriquée
// dans <dossier de travail>/voix (voir voix.mts).
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Locator, type Page } from "@playwright/test";
import { TEXTES, type IdScene } from "./textes.mts";

const [travail, sortie] = process.argv.slice(2);
if (!travail || !sortie) {
  console.error("Il faut un dossier de travail et un fichier de sortie.");
  process.exit(1);
}
const BASE = "http://localhost:3457";
const BOITE = "http://127.0.0.1:54324";
const LARGEUR = 390;
const HAUTEUR = 844;
const ADRESSE = `lea.${Date.now().toString(36).slice(-4)}@exemple.fr`;
const attends = (ms: number) => new Promise((r) => setTimeout(r, ms));

function dureeDe(fichier: string): number {
  return Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", fichier]).toString().trim());
}
const durees = new Map<IdScene, number>(TEXTES.map((s) => [s.id, dureeDe(join(travail, "voix", `${s.id}.mp3`))]));

async function codeRecu(adresse: string, apres: number): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const liste = (await (await fetch(`${BOITE}/api/v1/messages?limit=10`)).json()) as { messages: { ID: string; Created: string; To: { Address: string }[] }[] };
    const m = liste.messages.find((x) => x.To.some((t) => t.Address === adresse) && Date.parse(x.Created) >= apres - 2000);
    if (m) {
      const c = (await (await fetch(`${BOITE}/api/v1/message/${m.ID}`)).json()) as { Text: string; HTML: string };
      const trouve = `${c.Text} ${c.HTML.replace(/<[^>]+>/g, " ")}`.match(/\b\d{6}\b/);
      if (trouve) return trouve[0];
    }
    await attends(400);
  }
  throw new Error("Le code n'est pas arrivé dans la boîte locale.");
}

// ---- gestes : un doigt visible, des déplacements et des défilements doux ----
const DOIGT = `
  (() => {
    const pose = () => {
      if (document.getElementById("doigt-film")) return;
      const s = document.createElement("style");
      s.textContent = "nextjs-portal{display:none!important}#doigt-film{position:fixed;z-index:2147483647;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;background:rgba(40,40,60,.28);border:2px solid rgba(255,255,255,.85);box-shadow:0 2px 10px rgba(0,0,0,.25);pointer-events:none;left:-60px;top:-60px;transition:transform .12s ease,background .12s ease}#doigt-film.appui{transform:scale(.72);background:rgba(40,40,60,.5)}html{scroll-behavior:auto!important}";
      document.documentElement.appendChild(s);
      const d = document.createElement("div");
      d.id = "doigt-film";
      document.documentElement.appendChild(d);
      const p = JSON.parse(sessionStorage.getItem("doigt-film") || "null");
      if (p) { d.style.left = p.x + "px"; d.style.top = p.y + "px"; }
      addEventListener("mousemove", (e) => { d.style.left = e.clientX + "px"; d.style.top = e.clientY + "px"; sessionStorage.setItem("doigt-film", JSON.stringify({ x: e.clientX, y: e.clientY })); }, true);
      addEventListener("mousedown", () => d.classList.add("appui"), true);
      addEventListener("mouseup", () => d.classList.remove("appui"), true);
    };
    if (document.documentElement) pose();
    document.addEventListener("DOMContentLoaded", pose);
  })();
`;

let doigt = { x: LARGEUR / 2, y: HAUTEUR * 0.6 };

async function defile(page: Page, y: number, ms = 900) {
  await page.evaluate(([cible, duree]) => new Promise<void>((fin) => {
    const depart = scrollY;
    const but = Math.max(0, Math.min(cible, document.documentElement.scrollHeight - innerHeight));
    const t0 = performance.now();
    const pas = (t: number) => {
      const k = Math.min(1, (t - t0) / duree);
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      scrollTo(0, depart + (but - depart) * e);
      if (k < 1) requestAnimationFrame(pas); else fin();
    };
    requestAnimationFrame(pas);
  }), [y, ms] as const);
}

async function defileDe(page: Page, dy: number, ms = 900) {
  const y = await page.evaluate(() => scrollY);
  await defile(page, y + dy, ms);
}

async function montre(page: Page, cible: Locator) {
  await cible.waitFor({ state: "visible", timeout: 15000 });
  const boite = await cible.boundingBox();
  if (!boite) return;
  const milieu = boite.y + boite.height / 2;
  if (milieu < 150 || milieu > HAUTEUR - 190) {
    const y = await page.evaluate(() => scrollY);
    await defile(page, y + milieu - HAUTEUR * 0.45, 700);
  }
}

async function touche(page: Page, cible: Locator, pause = 350) {
  await montre(page, cible);
  const boite = await cible.boundingBox();
  if (!boite) throw new Error("Élément introuvable à l'écran.");
  const x = boite.x + Math.min(boite.width / 2, 150);
  const y = boite.y + boite.height / 2;
  const pas = 18;
  for (let i = 1; i <= pas; i++) {
    const k = i / pas;
    const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    await page.mouse.move(doigt.x + (x - doigt.x) * e, doigt.y + (y - doigt.y) * e);
    await attends(16);
  }
  doigt = { x, y };
  await attends(140);
  await page.mouse.down();
  await attends(110);
  await page.mouse.up();
  await attends(pause);
}

async function ecrit(page: Page, cible: Locator, texte: string, delai = 70) {
  await touche(page, cible, 150);
  await page.keyboard.type(texte, { delay: delai });
  await attends(250);
}

async function pose(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await attends(350);
}

// ---- les scènes ----
type Scene = (page: Page) => Promise<void>;

const SCENES: Record<IdScene, Scene> = {
  "01-accueil": async (page) => {
    await attends(3800);
    await defile(page, 260, 1400);
    await attends(700);
    await defile(page, 0, 1000);
    await attends(400);
    await touche(page, page.getByRole("link", { name: "Se connecter", exact: true }));
    await page.waitForURL(/\/compte\/connexion/);
    await pose(page);
  },
  "02-connexion": async (page) => {
    await attends(1300);
    await ecrit(page, page.locator("#adresse"), ADRESSE, 45);
    const t0 = Date.now();
    await touche(page, page.getByRole("button", { name: "Recevoir mon code" }));
    await page.locator("#code").waitFor();
    const code = await codeRecu(ADRESSE, t0);
    await attends(500);
    await ecrit(page, page.locator("#code"), code, 150);
    await touche(page, page.getByRole("button", { name: "Me connecter" }));
    await page.waitForURL(/\/compte\/profil/);
    await pose(page);
  },
  "03-profil": async (page) => {
    await attends(600);
    await ecrit(page, page.locator("#prenom"), "Léa", 140);
    await attends(500);
    await touche(page, page.getByRole("radio", { name: "Viser 14" }), 700);
    await touche(page, page.getByRole("radio", { name: "Oui", exact: true }), 900);
    await attends(1200);
    await touche(page, page.getByRole("button", { name: "Créer mon compte" }));
    await page.waitForURL(/\/app$/);
    await pose(page);
  },
  "04-aujourdhui": async (page) => {
    await attends(2600);
    await defile(page, 330, 1600);
    await attends(2400);
    await defileDe(page, 260, 1500);
    await attends(1400);
  },
  "05-cours": async (page) => {
    await defile(page, 0, 700);
    await touche(page, page.locator("nav a[href='/app/cours']").last());
    await page.waitForURL(/\/app\/cours/);
    await pose(page);
    await attends(1200);
    await defile(page, 520, 2600);
    await attends(600);
    await defile(page, 60, 1300);
    await touche(page, page.locator("a[href='/app/fiche/01']").first());
    await page.waitForURL(/\/app\/fiche\/01/);
    await pose(page);
  },
  "06-fiche": async (page) => {
    await attends(900);
    await defile(page, 430, 1800);
    await attends(1300);
    await defileDe(page, 380, 1800);
    await attends(900);
    await defile(page, 0, 1000);
    await touche(page, page.locator("label:has-text('Vu en classe') input[type=checkbox], input[type=checkbox]").first(), 900);
  },
  "07-question": async (page) => {
    await touche(page, page.getByRole("link", { name: "Questions de cours" }));
    await page.waitForURL(/onglet=questions/);
    await pose(page);
    await defileDe(page, 330, 1500);
    await attends(1600);
    await touche(page, page.locator("a[href='/app/fiche/01/q1']"));
    await page.waitForURL(/\/q1/);
    await pose(page);
    await attends(1500);
    const indice = page.getByRole("button", { name: "Indice 1" });
    if (await indice.count()) {
      await touche(page, indice, 1800);
    } else {
      await attends(1500);
    }
    await touche(page, page.getByRole("button", { name: "Voir le corrigé" }), 900);
    await montre(page, page.getByRole("region", { name: "Corrigé" }));
    await defileDe(page, 220, 1400);
    await attends(1200);
    await touche(page, page.getByRole("button", { name: /En partie/ }), 1500);
  },
  "08-carnet": async (page) => {
    await page.goto(`${BASE}/app/carnet`);
    await pose(page);
    await attends(2600);
    await defile(page, 240, 1600);
    await attends(2200);
  },
  "09-quiz": async (page) => {
    await page.goto(`${BASE}/app/fiche/01?onglet=quiz`);
    await pose(page);
    await touche(page, page.getByRole("link", { name: "Lancer le quiz" }), 300);
    await page.waitForURL(/\/app\/quiz\/nouveau/);
    await pose(page);
    await attends(500);
    await touche(page, page.getByRole("button", { name: "Commencer le quiz" }), 300);
    await page.waitForURL(/\/app\/quiz\/[0-9a-f-]{8,}/);
    await pose(page);
    await attends(1700);
    await repondAuQuiz(page);
    await attends(1800);
  },
  "10-ds": async (page) => {
    await page.goto(`${BASE}/app/ds/nouveau`);
    await pose(page);
    await attends(900);
    // Le navigateur de tournage affiche les dates à l'américaine : on prend un jour qui se lit pareil
    // dans les deux sens (le 12 décembre, le 1er janvier...), au moins cinq jours plus tard.
    let j = new Date(Date.now() + 5 * 86400000);
    while (j.getUTCDate() !== j.getUTCMonth() + 1) j = new Date(j.getTime() + 86400000);
    const jour = j.toISOString().slice(0, 10);
    await montre(page, page.locator("#jour"));
    await touche(page, page.locator("label[for='jour'], legend:has-text('La date')").first(), 200).catch(() => {});
    await page.locator("#jour").fill(jour);
    await attends(700);
    await touche(page, page.getByRole("radio", { name: "2 h" }), 500);
    await touche(page, page.getByRole("radio", { name: "Viser 14" }), 500);
    await touche(page, page.locator("label.case", { hasText: "Fiche 1 ·" }).first(), 400);
    await touche(page, page.locator("label.case", { hasText: "Fiche 2 ·" }).first(), 500);
    await touche(page, page.getByRole("button", { name: "Construire mon plan" }));
    await page.waitForURL(/\/app\/ds\/[0-9a-f-]{8,}/);
    await pose(page);
    await attends(900);
    await defile(page, 420, 1800);
    await attends(900);
    await defileDe(page, 520, 2000);
    await attends(900);
  },
  "11-exercice": async (page) => {
    const exercice = page.locator("a.ligne[href*='/ex']").first();
    await touche(page, exercice);
    await page.waitForURL(/\/ex\d+/);
    await pose(page);
    await attends(1200);
    await defile(page, 300, 1500);
    await attends(700);
    await touche(page, page.getByRole("button", { name: "Me corriger au barème" }), 900);
    await montre(page, page.getByRole("region", { name: "Corrigé au barème" }));
    await defileDe(page, 260, 1400);
    for (let i = 0; i < 12; i++) {
      const libre = page.locator(".etape-bareme .ligne-b").nth(i);
      if (!(await libre.count())) break;
      const choix = libre.locator("button");
      if (!(await choix.count())) break;
      await touche(page, choix.nth(i % 3 === 1 ? 1 : 0), 200);
    }
    const valider = page.getByRole("button", { name: "Valider ma note" });
    if (await valider.count()) await touche(page, valider, 1500);
  },
  "12-progres": async (page) => {
    await page.goto(`${BASE}/app/progres`);
    await pose(page);
    await attends(2400);
    await defile(page, 380, 2000);
    await attends(2200);
  },
  "13-offres": async (page) => {
    await page.goto(`${BASE}/app/offres`);
    await pose(page);
    await attends(3000);
    await defile(page, 420, 2600);
    await attends(2200);
    await defile(page, 0, 1500);
    await attends(2500);
  },
};

// Répond à la question affichée, quel que soit son genre, puis laisse lire la correction.
async function repondAuQuiz(page: Page) {
  const zone = page.locator("main");
  const trou = zone.locator("#rep-trou");
  if (await trou.count()) {
    await ecrit(page, trou, "9,81", 120);
    await touche(page, zone.getByRole("button", { name: "Valider", exact: true }));
  } else if (await zone.getByRole("button", { name: /^V\s*Vrai$/ }).count()) {
    await touche(page, zone.getByRole("button", { name: /^V\s*Vrai$/ }));
  } else if (await zone.getByRole("button", { name: "Valider l'ordre" }).count()) {
    await touche(page, zone.getByRole("button", { name: "Valider l'ordre" }));
  } else if (await zone.locator("select").count()) {
    const listes = zone.locator("select");
    for (let i = 0; i < (await listes.count()); i++) await listes.nth(i).selectOption({ index: 1 + (i % 2) });
    await touche(page, zone.getByRole("button", { name: "Valider", exact: true }));
  } else {
    const connue = zone.locator("button:has(span.l)", { hasText: "9,81" });
    await touche(page, (await connue.count()) ? connue.first() : zone.locator("button:has(span.l)").first());
  }
  await page.locator(".retour-quiz").waitFor({ timeout: 15000 });
  await montre(page, page.locator(".retour-quiz"));
}

// ---- tournage ----
rmSync(join(travail, "brut"), { recursive: true, force: true });
mkdirSync(join(travail, "brut"), { recursive: true });
const navigateur = await chromium.launch({ args: ["--lang=fr-FR", "--force-device-scale-factor=2", `--window-size=${LARGEUR},${HAUTEUR}`, "--hide-scrollbars"] });

// Premier passage, non filmé : le serveur de développement compile chaque page à sa première visite.
{
  const ctx = await navigateur.newContext({ viewport: { width: LARGEUR, height: HAUTEUR } });
  const p = await ctx.newPage();
  for (const chemin of ["/", "/compte/connexion", "/compte/profil", "/app", "/app/cours", "/app/fiche/01", "/app/fiche/01/q1", "/app/fiche/01/ex1", "/app/carnet", "/app/ds", "/app/ds/nouveau", "/app/progres", "/app/offres"]) {
    await p.goto(BASE + chemin).catch(() => {});
  }
  await ctx.close();
}

const contexte = await navigateur.newContext({
  viewport: null,
  locale: "fr-FR",
  timezoneId: "Europe/Paris",
  colorScheme: "light",
});
await contexte.addInitScript(DOIGT);
const page = await contexte.newPage();
await page.goto(BASE);
await pose(page);

// Les images viennent du navigateur lui-même, en pixels réels (deux fois la largeur du téléphone),
// chacune avec son heure : le montage leur rend leur durée exacte.
const images: { fichier: string; heure: number }[] = [];
const protocole = await contexte.newCDPSession(page);
protocole.on("Page.screencastFrame", (e) => {
  const fichier = join(travail, "brut", `i${String(images.length).padStart(6, "0")}.jpg`);
  writeFileSync(fichier, Buffer.from(e.data, "base64"));
  images.push({ fichier, heure: e.metadata.timestamp ?? Date.now() / 1000 });
  protocole.send("Page.screencastFrameAck", { sessionId: e.sessionId }).catch(() => {});
});
await protocole.send("Page.startScreencast", { format: "jpeg", quality: 93, maxWidth: LARGEUR * 2, maxHeight: HAUTEUR * 2, everyNthFrame: 1 });
await page.mouse.move(doigt.x, doigt.y);
await attends(600);
const debut = Date.now();

const reperes: { id: IdScene; depart: number; duree: number }[] = [];
for (const scene of TEXTES) {
  const depart = (Date.now() - debut) / 1000;
  const duree = durees.get(scene.id)!;
  reperes.push({ id: scene.id, depart, duree });
  console.log(`${scene.id} à ${depart.toFixed(1)} s`);
  await SCENES[scene.id](page);
  const reste = depart + duree + 0.5 - (Date.now() - debut) / 1000;
  if (reste > 0) await attends(reste * 1000);
}
await attends(1200);
const total = (Date.now() - debut) / 1000;
await protocole.send("Page.stopScreencast").catch(() => {});
await contexte.close();
await navigateur.close();
writeFileSync(join(travail, "reperes.json"), JSON.stringify({ total, reperes }, null, 2));

// ---- montage : la vidéo du téléphone sur un fond, la voix posée au départ de chaque scène ----
const t0 = debut / 1000;
const utiles = images.filter((im, i) => im.heure >= t0 || (images[i + 1]?.heure ?? Infinity) > t0);
const liste = utiles.map((im, i) => {
  const depuis = Math.max(im.heure, t0);
  const jusqua = Math.min(utiles[i + 1]?.heure ?? t0 + total, t0 + total);
  return `file '${im.fichier.replaceAll("'", "'\\''")}'\nduration ${Math.max(0.001, jusqua - depuis).toFixed(4)}`;
});
liste.push(`file '${utiles.at(-1)!.fichier.replaceAll("'", "'\\''")}'`);
const brut = join(travail, "brut", "images.txt");
writeFileSync(brut, liste.join("\n"));
console.log(`${utiles.length} images, soit ${(utiles.length / total).toFixed(1)} par seconde en moyenne`);
const entrees = ["-f", "concat", "-safe", "0", "-i", brut];
for (const r of reperes) entrees.push("-i", join(travail, "voix", `${r.id}.mp3`));
const pistes = reperes.map((r, i) => `[${i + 1}:a]adelay=${Math.round(r.depart * 1000)}:all=1[a${i}]`);
const filtre = [
  `[0:v]fps=30,scale=-2:1760:flags=lanczos,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x14161f,format=yuv420p[v]`,
  ...pistes,
  `${reperes.map((_, i) => `[a${i}]`).join("")}amix=inputs=${reperes.length}:normalize=0,apad[a]`,
].join(";");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...entrees, "-filter_complex", filtre, "-map", "[v]", "-map", "[a]",
  "-t", total.toFixed(2), "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", sortie], { stdio: "inherit" });
console.log(`Film écrit : ${sortie} (${total.toFixed(0)} s)`);
