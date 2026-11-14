// Essai à la main de la paillasse « pointage » dans un vrai navigateur, sur son banc de chantier (/app/tp/chantier/ondes?tp=chute).
// Il manipule comme un élève : il glisse les repères de l'échelle sur l'étalon, dit sa longueur, glisse l'origine sur le
// sol, pointe la balle image par image (au doigt, en visant, puis au clavier), règle la droite sur la vitesse verticale,
// lit l'énergie mécanique au repère et la note. Puis il appelle le professeur et relève le jugement du serveur.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/pointage.mts <dossier des captures> [graine] [soignee|baclee] [largeur] [hauteur]
import type { Locator, Page } from "@playwright/test";
import { BASE, attends, centre, glisse, ouvre, pointEcran, type Point } from "./outils.mts";

const [sortie, graineTexte = "1", mode = "soignee", largeur = "390", hauteur = "844"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/pointage.mts <dossier des captures> [graine] [soignee|baclee] [largeur] [hauteur]");
const e = await ouvre({ sortie, largeur: Number(largeur), hauteur: Number(hauteur) });
const page: Page = e.page;
const graine = Number(graineTexte);
const bilan: Record<string, unknown> = { mode, graine, fenetre: `${largeur} x ${hauteur}` };

// le film tiré par la graine : les mêmes listes que lib/serveur/contenu/tp/chute.ts, et le même calcul du mouvement
// que lib/commun/tp/paillasses/pointage.ts
const variante = <V,>(choix: V[]): V => choix[Math.abs(Math.trunc(graine)) % choix.length];
const film = variante([
  { x0: 0.8, y0: 1.85, vx: 0, vy: 0, limite: 0, images: 15 },
  { x0: 0.8, y0: 1.8, vx: 0, vy: 0, limite: 4.6, images: 16 },
  { x0: 0.35, y0: 0.5, vx: 1.7, vy: 3.6, limite: 0, images: 16 },
  { x0: 0.35, y0: 0.45, vx: 2.2, vy: 4.2, limite: 6, images: 16 },
]);
const etalon = variante([1, 0.8, 0.5]);
const G = 9.81, DT = 0.04, CAMERA = { parMetre: 205, sol: 446, etalon: 40, l: 360, h: 480 };
interface Mobile { x: number; y: number; vx: number; vy: number }
function trajectoire(): Mobile[] {
  const k = film.limite > 0 ? G / film.limite ** 2 : 0;
  const derive = (m: Mobile): Mobile => { const v = Math.hypot(m.vx, m.vy); return { x: m.vx, y: m.vy, vx: -k * v * m.vx, vy: -G - k * v * m.vy }; };
  const avance = (m: Mobile, d: Mobile, h: number): Mobile => ({ x: m.x + d.x * h, y: m.y + d.y * h, vx: m.vx + d.vx * h, vy: m.vy + d.vy * h });
  const pas = DT / 40;
  let m: Mobile = { x: film.x0, y: film.y0, vx: film.vx, vy: film.vy };
  const images = [m];
  for (let i = 1; i < film.images; i++) {
    for (let j = 0; j < 40; j++) {
      const k1 = derive(m), k2 = derive(avance(m, k1, pas / 2)), k3 = derive(avance(m, k2, pas / 2)), k4 = derive(avance(m, k3, pas));
      m = { x: m.x + (pas / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x), y: m.y + (pas / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y), vx: m.vx + (pas / 6) * (k1.vx + 2 * k2.vx + 2 * k3.vx + k4.vx), vy: m.vy + (pas / 6) * (k1.vy + 2 * k2.vy + 2 * k3.vy + k4.vy) };
    }
    images.push(m);
  }
  return images;
}
/** Le centre de la balle sur chaque image, dans le dessin. */
const centres: Point[] = trajectoire().map((m) => ({ x: CAMERA.etalon + m.x * CAMERA.parMetre, y: CAMERA.sol - m.y * CAMERA.parMetre }));
const PIED: Point = { x: CAMERA.etalon, y: CAMERA.sol }, SOMMET: Point = { x: CAMERA.etalon, y: CAMERA.sol - etalon * CAMERA.parMetre };

await page.goto(`${BASE}/app/tp/chantier/ondes?tp=chute&graine=${graine}`);
await page.getByRole("button", { name: "Ouvrir la paillasse" }).click();
await attends(900);
const scene: Locator = page.locator("svg.pl-scene");
const ici = (p: Point) => pointEcran(scene, p);
const deplace = async (de: Point, vers: Point, pas = 16) => { await glisse(page, await ici(de), await ici(vers), pas); await attends(200); };
const message = () => e.texte(".pl-message");
const bouton = (nom: string | RegExp) => scene.getByRole("button", { name: nom }).first();
const virgule = (x: number, decimales: number) => x.toFixed(decimales).replace(".", ",");
const ecris = async (valeur: string) => {
  for (const c of valeur) await page.locator(".pl-pave").getByRole("button", { name: c, exact: true }).click();
  await page.getByRole("button", { name: "Noter", exact: true }).click();
  await attends(350);
};

await e.photo("01-film");

// ----- l'échelle : les deux repères glissés à la souris sur les bouts de l'étalon, puis la longueur -----
const decale = mode === "soignee" ? 0 : 24;
await deplace({ x: 232, y: 206 }, PIED);
await page.mouse.move((await ici({ x: 304, y: 262 })).x, (await ici({ x: 304, y: 262 })).y);
await page.mouse.down();
const versSommet = await ici({ x: SOMMET.x, y: SOMMET.y + decale });
for (let i = 1; i <= 16; i++) { const d = await ici({ x: 304, y: 262 }); await page.mouse.move(d.x + ((versSommet.x - d.x) * i) / 16, d.y + ((versSommet.y - d.y) * i) / 16); await attends(12); }
await e.photo("02-repere-vise");
await page.mouse.up();
await page.getByRole("button", { name: "Longueur de l'étalon" }).click();
await attends(300);
await e.photo("03-longueur");
await ecris(virgule(etalon, 2));
bilan.echelle = await message();

// ----- l'origine : glissée sur le sol, au pied de l'étalon (ou laissée où elle est) -----
await bouton("Outil Origine").click();
bilan.outil = await message();
if (mode === "soignee") await deplace({ x: 300, y: 380 }, PIED);
await e.photo("04-origine");

// ----- le pointage : image par image -----
await bouton("Outil Pointage").click();
const viser = bouton(/touche le centre de la balle/);
// l'écart de chaque pointé au centre de la balle : nul pour un élève soigneux, plusieurs unités pour un élève pressé
const ecart = (i: number): Point => (mode === "soignee" ? { x: 0, y: 0 } : { x: 6 * Math.cos(2.4 * i), y: 6 * Math.sin(2.4 * i) });
const sautees = mode === "soignee" ? [] : [3, 7, 8, 11];
let viseur: Point = { x: CAMERA.l / 2, y: CAMERA.h / 2 };
for (let i = 0; i < film.images; i++) {
  const cible = { x: centres[i].x + ecart(i).x, y: centres[i].y + ecart(i).y };
  if (sautees.includes(i)) { await bouton("Image suivante").click(); continue; }
  if (i === 2 || i === 9) {
    // viser : le doigt se pose à côté de la balle, glisse jusqu'à son centre en regardant la loupe, puis se lève
    const depart = await ici({ x: cible.x + 22, y: cible.y + 14 }), arrivee = await ici(cible);
    await page.mouse.move(depart.x, depart.y);
    await page.mouse.down();
    for (let k = 1; k <= 10; k++) { await page.mouse.move(depart.x + ((arrivee.x - depart.x) * k) / 10, depart.y + ((arrivee.y - depart.y) * k) / 10); await attends(14); }
    await e.photo(`05-viser-image-${i + 1}`);
    await page.mouse.up();
    viseur = cible;
  } else if (i === 5 || i === 6) {
    // au clavier : les flèches déplacent le viseur depuis le dernier pointé, Entrée pointe
    await viser.focus();
    const dx = Math.round(cible.x - viseur.x), dy = Math.round(cible.y - viseur.y);
    for (let k = 0; k < Math.floor(Math.abs(dy) / 10); k++) await page.keyboard.press(dy > 0 ? "PageDown" : "PageUp");
    for (let k = 0; k < Math.abs(dy) % 10; k++) await page.keyboard.press(dy > 0 ? "ArrowDown" : "ArrowUp");
    for (let k = 0; k < Math.floor(Math.abs(dx) / 10); k++) await page.keyboard.press(dx > 0 ? "End" : "Home");
    for (let k = 0; k < Math.abs(dx) % 10; k++) await page.keyboard.press(dx > 0 ? "ArrowRight" : "ArrowLeft");
    if (i === 5) await e.photo("06-viseur-du-clavier");
    await page.keyboard.press("Enter");
    viseur = { x: viseur.x + dx, y: viseur.y + dy };
  } else {
    // un toucher bref, juste sur le centre de la balle
    const p = await ici(cible);
    await page.mouse.click(p.x, p.y);
    viseur = cible;
  }
  await attends(120);
}
bilan.pointage = await message();
await e.photo("07-pointage-fini");

// ----- les courbes : la droite sur la vitesse verticale -----
await page.getByRole("button", { name: "Courbes", exact: true }).click();
await attends(400);
await e.photo("08-vitesse-avant");
if (mode === "soignee") {
  // l'élève règle chaque bout de la droite pour qu'elle passe au milieu des points : ici, là où passe la vraie vitesse verticale
  const vraies = trajectoire().map((m) => m.vy), duree = (film.images - 1) * DT;
  const pente = (vraies[film.images - 2] - vraies[1]) / (duree - 2 * DT);
  const cibles = { "Bout gauche de la droite": vraies[1] - pente * DT, "Bout droit de la droite": vraies[film.images - 2] + pente * DT };
  for (const [nom, cible] of Object.entries(cibles)) {
    const bout = scene.getByRole("slider", { name: nom });
    const bas = Number(await bout.getAttribute("aria-valuemin")), haut = Number(await bout.getAttribute("aria-valuemax"));
    const depart = await centre(bout);
    const unite = (await ici({ x: 0, y: 1 })).y - (await ici({ x: 0, y: 0 })).y;
    // à la souris, à peu près ; puis au clavier, par pas d'un vingtième de m/s
    await glisse(page, depart, { x: depart.x, y: depart.y - ((cible - Number(await bout.getAttribute("aria-valuenow"))) / (haut - bas)) * 312 * unite }, 14);
    await attends(150);
    const reste = Math.round((Math.round(cible * 20) / 20 - Number(await bout.getAttribute("aria-valuenow"))) * 20);
    await bout.focus();
    for (let k = 0; k < Math.abs(reste); k++) await page.keyboard.press(reste > 0 ? "ArrowUp" : "ArrowDown");
  }
} else {
  await scene.getByRole("slider", { name: "Bout droit de la droite" }).focus();
  for (let k = 0; k < 6; k++) await page.keyboard.press("PageDown");
}
bilan.droite = (await scene.locator(".pl-pointage-lecture").first().textContent())?.replace(/\s+/g, " ");
await e.photo("09-droite-reglee");
await page.getByRole("button", { name: "Garder cette droite" }).click();
bilan.gardee = await message();

// ----- les énergies : le repère sur le premier point, puis sur le dernier ; l'élève lit l'énergie mécanique affichée -----
await bouton("Courbes des énergies").click();
await attends(300);
const repere = scene.getByRole("slider", { name: "Repère sur les courbes des énergies" });
const lisEm = async () => Number((await scene.locator('[aria-label^="énergie mécanique au repère"] .pl-pointage-lecture').textContent())?.replace(/[^\d,]/g, "").replace(",", "."));
const noteEnergie = async (ligne: RegExp, valeur: number, photo?: string) => {
  await page.getByRole("button", { name: "Noter l'énergie" }).click();
  if (photo) await e.photo(`${photo}-carnet`);
  await page.getByRole("button", { name: ligne }).click();
  await attends(300);
  if (photo) await e.photo(`${photo}-saisie`);
  await ecris(virgule(valeur, 1));
};
await repere.focus();
if (mode === "soignee") await page.keyboard.press("Home"); else for (let k = 0; k < 4; k++) await page.keyboard.press("ArrowRight");
await e.photo("10-energies-debut");
await noteEnergie(/Énergie mécanique au début/, await lisEm(), "11-debut");
if (mode === "soignee") {
  // le repère glissé à la souris jusqu'au dernier point
  const haut = await centre(repere);
  await glisse(page, { x: haut.x - 100, y: haut.y - 150 }, { x: haut.x + 160, y: haut.y - 150 }, 20);
} else {
  await repere.focus();
  for (let k = 0; k < 3; k++) await page.keyboard.press("ArrowRight");
}
await attends(200);
await e.photo("12-energies-fin");
await noteEnergie(/Énergie mécanique à la fin/, await lisEm());
bilan.energie = await message();

// ----- l'appel au professeur -----
await e.photo("13-avant-l-appel");
await page.getByRole("button", { name: "J'ai fini" }).click();
await page.getByRole("button", { name: "Oui, j'ai fini" }).click();
await page.waitForSelector("[data-score]", { timeout: 15000 });
await page.getByRole("button", { name: "Quitter" }).click().catch(() => {});
await attends(400);
bilan.score = await page.locator("[data-score]").getAttribute("data-score");
bilan.verdict = await e.texte(".tp-correction");
bilan.mesures = await page.locator("[data-mesures]").textContent();
bilan.largeur = await e.largeur();
bilan.erreurs = e.erreurs;
await e.photo("14-verdict", true);
console.log(JSON.stringify(bilan, null, 1));
await e.ferme();
