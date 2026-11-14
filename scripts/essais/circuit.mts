// Essai à la main des paillasses Circuits et Microcontrôleur dans un vrai navigateur, sur leur banc de chantier
// (/app/tp/chantier/circuits). Il manipule comme un élève : il glisse les composants de la boîte à la plaque (ou les
// touche, puis touche l'emplacement), tourne les molettes à la souris, tire les fils d'une borne à l'autre, en pose un en
// touchant deux bornes, un autre au clavier, retire un fil, maintient l'appui pour verser ou vider l'eau, lit les
// afficheurs, glisse le repère de la courbe, tape ses lectures au pavé de chiffres. Puis il appelle le professeur et
// relève le jugement du serveur.
// Deux TP : « condensateur » (la charge d'un condensateur suivie par une carte d'acquisition) et « jauge » (un capteur
// capacitif lu par un microcontrôleur). Deux manipulations : « soignee » (aucune faute attendue) et « fautive ».
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/circuit.mts <dossier des captures> [condensateur|jauge] [graine] [soignee|fautive] [largeur] [hauteur]
import type { Locator, Page } from "@playwright/test";
import { BASE, attends, centre, glisse, maintiens, ouvre, pointEcran, type Point } from "./outils.mts";

const [sortie, tp = "condensateur", graineTexte = "1", mode = "soignee", largeur = "390", hauteur = "844"] = process.argv.slice(2);
if (!sortie || !["condensateur", "jauge"].includes(tp)) throw new Error("Usage : node scripts/essais/circuit.mts <dossier des captures> [condensateur|jauge] [graine] [soignee|fautive] [largeur] [hauteur]");
const e = await ouvre({ sortie, largeur: Number(largeur), hauteur: Number(hauteur) });
const page: Page = e.page;
const graine = Number(graineTexte);
const bilan: Record<string, unknown> = { tp, graine, mode, fenetre: `${largeur} x ${hauteur}` };
const choix = <T,>(liste: T[]): T => liste[Math.abs(Math.trunc(graine)) % liste.length];
// le serveur de développement est partagé : si un fichier commun change pendant l'essai, la page se recharge et la
// paillasse repart de zéro. L'essai le dit au lieu d'échouer sans raison : il suffit alors de le relancer.
const recharges: string[] = [];
page.on("console", (m) => { if (/Fast Refresh|full reload/i.test(m.text())) recharges.push(m.text().slice(0, 120)); });
const echoue = async (erreur: unknown) => {
  await e.photo("erreur").catch(() => {});
  console.error(JSON.stringify({ ...bilan, erreur: String(erreur).slice(0, 600), paillasseOuverte: await page.locator(".pl-etabli").count().catch(() => -1), recharges, message: await e.texte(".pl-message") }, null, 1));
  await e.nav.close().catch(() => {});
  process.exit(1);
};
process.on("uncaughtException", echoue);
process.on("unhandledRejection", echoue);
const fr = (x: number, decimales: number) => x.toFixed(decimales).replace(".", ",");
const ohms = (R: number) => (R >= 1e6 ? `${fr(R / 1e6, Number.isInteger(R / 1e6) ? 0 : 1)} MΩ` : R >= 1000 ? `${fr(R / 1000, Number.isInteger(R / 1000) ? 0 : 1)} kΩ` : `${R} Ω`);

await page.goto(`${BASE}/app/tp/chantier/circuits?tp=${tp}&graine=${graine}`);
await page.getByRole("button", { name: "Ouvrir la paillasse" }).click();
await attends(900);
const scene: Locator = page.locator("svg.pl-scene");
const ici = (x: number, y: number) => pointEcran(scene, { x, y });
const message = () => e.texte(".pl-message");
const curseur = (nom: string | RegExp) => scene.getByRole("slider", { name: nom }).first();
const bouton = (nom: string | RegExp) => scene.getByRole("button", { name: nom }).first();
const touche = async (element: Locator, cle: string, fois = 1) => { await element.focus(); for (let i = 0; i < fois; i++) await page.keyboard.press(cle); await attends(150); };

// ---------- les gestes communs aux deux paillasses ----------
/** Glisse un composant de la boîte jusqu'à un endroit du dessin. */
const glisseComposant = async (nom: RegExp, vers: Point) => { await glisse(page, await centre(bouton(nom)), await ici(vers.x, vers.y), 16); await attends(300); };
/** Prend un composant en le touchant, puis touche la cible : sans glisser. */
const toucheComposant = async (nom: RegExp, cible: string | RegExp) => {
  await bouton(nom).click();
  await attends(250);
  await scene.getByRole("button", { name: cible }).click({ force: true });
  await attends(300);
};
/** Tire un fil d'une borne à l'autre, à la souris. */
const tire = async (a: Point, b: Point) => { await glisse(page, await ici(a.x, a.y), await ici(b.x, b.y), 18); await attends(300); };
/** Pose un fil en touchant une borne, puis l'autre. */
const toucheBornes = async (a: Point, b: Point) => { for (const p of [a, b]) { const q = await ici(p.x, p.y); await page.mouse.click(q.x, q.y); await attends(200); } };
/** Pose un fil au clavier : Entrée sur une borne, puis sur l'autre. */
const clavierBornes = async (a: RegExp, b: RegExp) => { for (const nom of [a, b]) { await bouton(nom).focus(); await page.keyboard.press("Enter"); await attends(200); } };
/**
 * Retire un fil : on le touche, puis on touche la croix qui apparaît en son milieu. `a` et `b` : les noms de ses deux
 * bornes ; `bornes` : la place de toutes les bornes, pour toucher le fil là où aucune ne le couvre.
 */
const retire = async (a: string, b: string, bornes: Record<string, Point>) => {
  const net = (nom: string) => nom.replace(/[+]/g, "\\$&");
  const fil = scene.getByRole("button", { name: new RegExp(`^Fil entre (${net(a)} et ${net(b)}|${net(b)} et ${net(a)})$`) });
  const points = await fil.evaluate((chemin) => {
    const c = chemin as SVGPathElement;
    return [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8].map((k) => { const q = c.getPointAtLength(c.getTotalLength() * k); return { x: q.x, y: q.y }; });
  });
  const libre = (p: Point) => Math.min(...Object.values(bornes).map((o) => Math.hypot(o.x - p.x, o.y - p.y)));
  const ou = points.reduce((meilleur, p) => (libre(p) > libre(meilleur) ? p : meilleur));
  const ecran = await ici(ou.x, ou.y + (libre(ou) < 24 ? 8 : 0));
  await page.mouse.click(ecran.x, ecran.y);
  await attends(250);
  const croix = await centre(scene.getByRole("button", { name: /^Retirer le fil/ }));
  await page.mouse.click(croix.x, croix.y);
  await attends(300);
};
/** Tourne une molette à la souris, le long d'un arc : les angles se comptent depuis le haut, dans le sens des aiguilles d'une montre. */
const tourne = async (c: Point, de: number, vers: number, rayon = 15) => {
  const sur = (angle: number) => ici(c.x + rayon * Math.sin((angle * Math.PI) / 180), c.y - rayon * Math.cos((angle * Math.PI) / 180));
  const debut = await sur(de);
  await page.mouse.move(debut.x, debut.y);
  await page.mouse.down();
  for (let i = 1; i <= 14; i++) { const p = await sur(de + ((vers - de) * i) / 14); await page.mouse.move(p.x, p.y); await attends(14); }
  await page.mouse.up();
  await attends(250);
};
/** Tape un nombre au pavé de chiffres de la saisie, puis le note. */
const tape = async (valeur: string) => {
  for (const c of valeur) await page.locator(".pl-pave").getByRole("button", { name: c, exact: true }).click();
  await page.getByRole("button", { name: "Noter", exact: true }).click();
  await attends(450);
};

await e.photo("01-paillasse");
// le protocole : une feuille à ouvrir sur le téléphone, une colonne toujours visible sur un écran large
const protocole = page.getByRole("button", { name: "Protocole" });
if (await protocole.isVisible()) {
  await protocole.click();
  await attends(400);
  await e.photo("00-protocole");
  await page.getByRole("button", { name: "Fermer" }).click();
  await attends(300);
}
bilan.protocole = ((await page.locator(".pl-cote ol").textContent()) ?? "").length;
if (tp === "condensateur") {
  // ========== la charge d'un condensateur ==========
  // la situation tirée par la graine : les mêmes listes que lib/serveur/contenu/tp/condensateur.ts
  const situation = choix([
    { R: 10_000, E: 5, C: 330 }, { R: 6_800, E: 6, C: 470 }, { R: 15_000, E: 4, C: 220 },
    { R: 10_000, E: 6, C: 470 }, { R: 6_800, E: 5, C: 220 }, { R: 15_000, E: 4, C: 330 },
  ]);
  const DUREES = [1, 2, 5, 10, 20, 50];
  /** La durée qui montre la montée et le palier : entre quatre et douze fois le temps caractéristique. */
  const dureePour = (R: number) => DUREES.find((d) => d >= 4 * R * situation.C * 1e-6 && d <= 12 * R * situation.C * 1e-6) ?? 50;
  // les places du dessin (components/tp/paillasses/Circuit.tsx)
  const SUPPORTS = [68, 180, 292], POSE = 232, RANGEE = 290, APPAREILS = 348;
  const B: Record<string, Point> = {
    "g+": { x: 46, y: APPAREILS }, "g-": { x: 114, y: APPAREILS }, voie: { x: 246, y: APPAREILS }, masse: { x: 314, y: APPAREILS },
    a1: { x: 34, y: RANGEE }, a2: { x: 102, y: RANGEE }, b1: { x: 146, y: RANGEE }, b2: { x: 214, y: RANGEE }, c1: { x: 258, y: RANGEE }, c2: { x: 326, y: RANGEE },
  };
  const MOLETTE_TENSION = { x: 136, y: 420 }, MOLETTE_DUREE = { x: 318, y: 406 };
  const place = (rang: number): Point => ({ x: SUPPORTS[rang], y: POSE });

  /** Règle la tension : la molette à la souris, puis les flèches du clavier s'il reste un cran d'écart. */
  const regleTension = async (E: number) => {
    const molette = curseur("Tension du générateur");
    await tourne(MOLETTE_TENSION, -135 + (Number(await molette.getAttribute("aria-valuenow")) / 12) * 270, -135 + (E / 12) * 270);
    const crans = Math.round((E - Number(await molette.getAttribute("aria-valuenow"))) / 0.5);
    await touche(molette, crans > 0 ? "ArrowRight" : "ArrowLeft", Math.abs(crans));
    return { souris: crans === 0 ? "juste" : `à ${crans} cran(s)`, afficheur: await scene.getByRole("img", { name: /Afficheur du générateur/ }).getAttribute("aria-label") };
  };
  /** Règle la durée de l'acquisition, à la souris puis au clavier. */
  const regleDuree = async (duree: number) => {
    const molette = curseur("Durée de l'acquisition");
    const rang = DUREES.indexOf(duree);
    await tourne(MOLETTE_DUREE, -135 + (Number(await molette.getAttribute("aria-valuenow")) / 5) * 270, -135 + (rang / 5) * 270);
    const crans = rang - Number(await molette.getAttribute("aria-valuenow"));
    await touche(molette, crans > 0 ? "ArrowRight" : "ArrowLeft", Math.abs(crans));
    return scene.getByRole("img", { name: /Durée de l'acquisition, sur la carte/ }).getAttribute("aria-label");
  };
  const lance = async () => { await bouton("Lancer l'acquisition").click(); await attends(300); return message(); };
  const bascule = async () => { await bouton(/^(Fermer|Ouvrir) l'interrupteur$/).click(); await attends(250); return message(); };
  /** Attend la fin de l'enregistrement : quelques secondes en temps réel, puis le reste au clavier, par pas fixes. */
  const attendsLaFin = async (secondes: number, photo?: string) => {
    await attends(secondes * 1000);
    if (photo) await e.photo(photo);
    const avancement = curseur("Avancement de l'acquisition");
    if (await avancement.count()) { await avancement.focus(); await page.keyboard.press("ArrowRight"); await page.keyboard.press("End"); }
    await attends(400);
  };
  const repere = () => page.getByRole("slider", { name: "Repère sur la courbe" });
  /** Lit le repère de la courbe : son instant et sa tension. */
  const lisRepere = async () => {
    const texte = (await repere().getAttribute("aria-valuetext")) ?? "";
    const [t, u] = [...texte.matchAll(/[−-]?\d+(?:,\d+)?/g)].map((m) => Number(m[0].replace("−", "-").replace(",", ".")));
    return { t, u, texte };
  };
  /** Ouvre la courbe et place le repère là où la tension vaut 63 % de sa valeur finale : à la souris, puis au clavier, point par point. */
  const liseTau = async (photos: string) => {
    await page.getByRole("button", { name: "Ouvrir la courbe" }).click();
    await attends(500);
    await e.photo(`${photos}-courbe`);
    await touche(repere(), "End");
    const palier = (await lisRepere()).u;
    const cible = 0.632 * palier;
    // le repère glissé à la souris, à peu près au quart de l'écran
    await glisse(page, await ici(330, 200), await ici(110, 200), 12);
    await attends(200);
    // puis au clavier : on recule tant que la tension dépasse la cible, on avance tant qu'elle est dessous, et on garde le point le plus proche
    for (let i = 0; i < 400 && Math.abs((await lisRepere()).u) > Math.abs(cible); i++) await page.keyboard.press("ArrowLeft");
    let avant = await lisRepere();
    for (let i = 0; i < 400; i++) {
      await page.keyboard.press("ArrowRight");
      const apres = await lisRepere();
      if (Math.abs(apres.u) >= Math.abs(cible) || apres.t === avant.t) {
        if (Math.abs(Math.abs(avant.u) - Math.abs(cible)) < Math.abs(Math.abs(apres.u) - Math.abs(cible))) await page.keyboard.press("ArrowLeft");
        break;
      }
      avant = apres;
    }
    const lu = await lisRepere();
    await e.photo(`${photos}-repere`);
    await bouton(/tangente/).click();
    await attends(300);
    await e.photo(`${photos}-tangente`);
    await page.getByRole("button", { name: "Noter ce temps" }).click();
    await attends(400);
    return { palier, cible: Number(cible.toFixed(2)), repere: lu.texte, note: await message() };
  };

  if (mode === "soignee") {
    // les composants : deux glissés, un touché puis posé
    await glisseComposant(/^L'interrupteur/, place(0));
    bilan.interrupteur = await message();
    await glisseComposant(new RegExp(`^Le conducteur ohmique de ${ohms(situation.R)},`), place(1));
    bilan.resistance = await message();
    await bouton(/^Le condensateur/).click();
    await attends(250);
    await e.photo("02-condensateur-en-main");
    await scene.getByRole("button", { name: "Poser sur l'emplacement 3 de la plaque" }).click({ force: true });
    await attends(300);
    bilan.condensateur = await message();
    // le générateur
    bilan.tension = await regleTension(situation.E);
    await e.photo("03-composants-et-tension");
    // la boucle : trois fils tirés à la souris, un posé en touchant deux bornes
    await tire(B["g+"], B.a1);
    bilan.fil = await message();
    await tire(B.a2, B.b1);
    await tire(B.b2, B.c1);
    await toucheBornes(B.c2, B["g-"]);
    bilan.filTouche = await message();
    // la carte : la voie au clavier, la masse à la souris
    await clavierBornes(/^la voie de la carte/, /^la borne gauche du condensateur/);
    bilan.filClavier = await message();
    await tire(B.masse, B.c2);
    await e.photo("04-cable");
    // la décharge : un fil entre les deux bornes du condensateur, puis on le retire
    await tire(B.c1, B.c2);
    bilan.decharge = await message();
    await e.photo("05-fil-de-decharge");
    await retire("la borne gauche du condensateur", "la borne droite du condensateur", B);
    bilan.retrait = await message();
    // une première acquisition, avec la durée d'origine : trop courte, le palier ne se voit pas
    bilan.pret = await lance();
    await e.photo("06-carte-prete");
    bilan.declenchement = await bascule();
    await attendsLaFin(1.2, "07-trace-en-cours");
    await e.photo("08-trop-court");
    // on recommence : interrupteur ouvert, décharge, durée plus longue
    await bascule();
    await tire(B.c1, B.c2);
    await retire("la borne gauche du condensateur", "la borne droite du condensateur", B);
    bilan.duree = await regleDuree(dureePour(situation.R));
    await lance();
    bilan.declenchement2 = await bascule();
    await attendsLaFin(Math.min(6, dureePour(situation.R) / 2), "09-la-courbe-se-trace");
    bilan.fin = await message();
    await e.photo("10-courbe-entiere");
    bilan.lecture = await liseTau("11");
    await e.photo("12-temps-note");
  } else {
    // le mauvais conducteur ohmique : dix fois trop petit
    await toucheComposant(new RegExp(`^Le conducteur ohmique de ${ohms(situation.R / 10)},`), "Poser sur l'emplacement 2 de la plaque");
    bilan.resistance = await message();
    await glisseComposant(/^Le condensateur/, place(2));
    await glisseComposant(/^L'interrupteur/, place(0));
    // un fil entre les deux bornes du générateur, puis la tension : il se met en sécurité
    await tire(B["g+"], B["g-"]);
    bilan.tension = await regleTension(12);
    bilan.securite = await message();
    await e.photo("02-generateur-en-securite");
    await retire("la borne + du générateur", "la borne − du générateur", B);
    bilan.repart = await message();
    // la boucle, puis la voie et la masse inversées ; pas de décharge
    await tire(B["g+"], B.a1);
    await tire(B.a2, B.b1);
    await tire(B.b2, B.c1);
    await tire(B.c2, B["g-"]);
    await tire(B.voie, B.c2);
    await tire(B.masse, B.c1);
    await e.photo("03-voie-et-masse-inversees");
    // la carte lancée, interrupteur fermé : la durée d'origine, 2 s
    bilan.pret = await lance();
    bilan.declenchement = await bascule();
    await attendsLaFin(1, "04-courbe-negative-en-cours");
    await e.photo("05-courbe-negative");
    bilan.lecture = await liseTau("06");
  }
} else {
  // ========== le capteur de niveau et le microcontrôleur ==========
  // la situation tirée par la graine : les mêmes listes que lib/serveur/contenu/tp/jauge.ts
  const situation = choix([{ R: 1_000_000 }, { R: 2_200_000 }, { R: 1_500_000 }, { R: 1_000_000 }, { R: 2_200_000 }, { R: 1_500_000 }]);
  // les places du dessin (components/tp/paillasses/Microcontroleur.tsx)
  const BROCHE = 148, RANGEE = 222, LAME = 236, FOND = 396, PAR_CM = 12;
  const B: Record<string, Point> = {
    v5: { x: 40, y: BROCHE }, d2: { x: 92, y: BROCHE }, a0: { x: 144, y: BROCHE }, a1: { x: 196, y: BROCHE }, gnd: { x: 248, y: BROCHE },
    l1: { x: 30, y: RANGEE }, l2: { x: 86, y: RANGEE }, l3: { x: 142, y: RANGEE }, p1: { x: 200, y: LAME }, p2: { x: 244, y: LAME },
  };
  const POSES = [{ x: 58, y: 276 }, { x: 114, y: 326 }], VERSER = { x: 288, y: 358 }, VIDER = { x: 332, y: 358 };
  const resistance = (R: number) => new RegExp(`^Le conducteur ohmique de ${ohms(R)},`);

  /** Maintient l'appui sur « Verser » ou « Vider », comme un doigt posé ; une capture peut se prendre pendant que l'eau coule. */
  const maintient = async (ou: Point, ms: number, photo?: string) => {
    if (!photo) { await maintiens(page, await ici(ou.x, ou.y), ms); await attends(350); return; }
    const p = await ici(ou.x, ou.y);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await attends(Math.min(900, ms));
    await e.photo(photo);
    await attends(Math.max(0, ms - 900));
    await page.mouse.up();
    await attends(350);
  };
  /** Lit le niveau comme un œil sur la graduation : la hauteur de l'eau dessinée dans la cuve, au millimètre. */
  const lisNiveau = async () => Math.round(((FOND - Number(await scene.locator("rect.pl-circuit-eau").getAttribute("y"))) / PAR_CM) * 10) / 10;
  /** Lit le moniteur : ce que la dernière mesure affiche. */
  const lisMoniteur = async () => ((await scene.getByRole("img", { name: /Moniteur série/ }).getAttribute("aria-label")) ?? "").replace(/^.* : /, "");
  const mesure = async () => { await bouton(/lancer une mesure/).click(); await attends(350); return lisMoniteur(); };
  /** Note une ligne dans le carnet : le niveau lu sur la cuve, puis la durée lue sur le moniteur, au pavé de chiffres. */
  const note = async (niveau: number, duree: string, photos?: string) => {
    await page.getByRole("button", { name: "Noter la mesure" }).click();
    await attends(600);
    if (photos) await e.photo(`${photos}-niveau`);
    await tape(fr(niveau, 1));
    await attends(300);
    if (photos) await e.photo(`${photos}-duree`);
    await tape(duree.replace(/\D/g, "") || "0");
    return message();
  };
  /** Un relevé : la mesure, puis la ligne du carnet. */
  const releve = async (niveau: number, photos?: string) => {
    const affiche = await mesure();
    return { niveau, affiche, note: await note(niveau, affiche, photos) };
  };

  if (mode === "soignee") {
    // le conducteur ohmique du protocole, glissé jusqu'à la plaque d'essai
    await glisseComposant(resistance(situation.R), POSES[0]);
    bilan.resistance = await message();
    // les fils : D2 tirée à la souris, A0 posée en touchant deux bornes, une lame au clavier, l'autre à la souris
    await tire(B.d2, B.l1);
    bilan.fil = await message();
    await toucheBornes(B.a0, B.l2);
    bilan.filTouche = await message();
    await clavierBornes(/^la lame gauche du capteur/, /^la rangée 2 de la plaque d'essai/);
    bilan.filClavier = await message();
    await tire(B.p2, B.gnd);
    await e.photo("02-cable");
    // la cuve : on la vide en maintenant l'appui, puis on mesure
    await maintient(VIDER, 4500, "03-vidange");
    bilan.vide = { niveau: await lisNiveau(), message: await message() };
    const releves = [await releve(0, "04-saisie")];
    await e.photo("05-cuve-vide-notee");
    // un niveau versé au clavier, par pas fixes
    await touche(bouton("Verser de l'eau dans la cuve"), "ArrowRight", 6);
    releves.push(await releve(await lisNiveau()));
    // un niveau versé en maintenant l'appui : on lit le niveau sur la cuve
    await maintient(VERSER, 1800, "06-on-verse");
    releves.push(await releve(await lisNiveau()));
    // le dernier niveau : au-dessus de 8 cm
    await touche(bouton("Verser de l'eau dans la cuve"), "ArrowRight", Math.max(1, Math.ceil((8.3 - (await lisNiveau())) / 0.5)));
    releves.push(await releve(await lisNiveau()));
    bilan.releves = releves;
    await e.photo("07-carnet-rempli");
  } else {
    // le mauvais conducteur ohmique : dix fois trop petit, touché puis posé
    await toucheComposant(resistance(situation.R / 10), /^Poser sur la plaque d'essai, entre les rangées 1 et 2/);
    bilan.resistance = await message();
    // la broche 5 V reliée à GND : la carte se coupe
    await tire(B.v5, B.gnd);
    bilan.coupee = await message();
    await bouton(/lancer une mesure/).click();
    await attends(300);
    bilan.sansReponse = await message();
    await e.photo("02-carte-coupee");
    await retire("la broche 5 V", "la broche GND", B);
    bilan.repart = await message();
    // A0 du côté de D2 : le programme affiche 0 µs
    await tire(B.d2, B.l1);
    await tire(B.a0, B.l1);
    await tire(B.p1, B.l2);
    await tire(B.p2, B.gnd);
    const releves = [await releve(await lisNiveau())];
    await e.photo("03-zero-microseconde");
    // A0 remise à sa place ; la cuve n'est pas vidée, le niveau est lu de travers, puis elle déborde
    await retire("la broche A0", "la rangée 1 de la plaque d'essai", B);
    await tire(B.a0, B.l2);
    releves.push(await releve((await lisNiveau()) + 0.6));
    await maintient(VERSER, 7500);
    bilan.deborde = await message();
    releves.push(await releve(await lisNiveau()));
    bilan.releves = releves;
    await e.photo("04-cuve-pleine");
    // une ligne de trop, effacée
    await note(1, "999");
    await page.getByRole("button", { name: "Effacer une ligne" }).click();
    bilan.efface = await message();
  }
}

// ----- l'appel au professeur -----
await page.getByRole("button", { name: "J'ai fini" }).click();
await attends(300);
await e.photo("13-appel");
await page.getByRole("button", { name: "Oui, j'ai fini" }).click();
await page.waitForSelector("[data-score]", { timeout: 15000 });
await page.getByRole("button", { name: "Quitter" }).click().catch(() => {});
await attends(400);
bilan.score = await page.locator("[data-score]").getAttribute("data-score");
bilan.verdict = await e.texte(".tp-correction");
bilan.mesures = await page.locator("[data-mesures]").textContent();
bilan.gestes = ((await page.locator("[data-gestes]").textContent()) ?? "").length;
bilan.largeur = await e.largeur();
bilan.erreurs = e.erreurs;
await e.photo("14-verdict", true);
console.log(JSON.stringify(bilan, null, 1));
await e.ferme();
