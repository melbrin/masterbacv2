// Essai à la main du hub Python (décision 0016) dans un vrai navigateur, en largeur téléphone, comme un élève :
// le sommaire, un exercice (vérifier le programme de départ, demander un indice, se tromper, demander la solution,
// la reprendre, réussir), le brouillon gardé sur l'appareil, l'atelier libre (un tracé, une erreur expliquée, une
// boucle sans fin arrêtée), puis la porte de « S'entraîner », l'accueil, les progrès et la fiche du chapitre.
// Il faut : le serveur sur le port 3457 et la base locale.
// Usage : ESSAI_SESSION=<fichier> node scripts/essais/python.mts <dossier des captures> [adresse d'un compte d'essai]
// L'adresse doit être neuve pour que les chiffres partent de zéro : change-la à chaque essai.
import { BASE, attends, ouvre } from "./outils.mts";

const [sortie, adresse] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/essais/python.mts <dossier des captures> [adresse]");
const ecarts: string[] = [];
const bilan: Record<string, unknown> = {};
const attendu = (vrai: boolean, quoi: string) => { if (!vrai) ecarts.push(quoi); };

const e = await ouvre({ sortie, adresse, prenom: "Lina" });
const page = e.page;
const pret = async (ms = 60_000) => {
  // Python est prêt quand le bouton « Lancer » répond
  await page.locator(".py-boutons button", { hasText: "Lancer" }).and(page.locator(":enabled")).waitFor({ timeout: ms });
};
const remplace = async (code: string) => {
  await page.locator(".py-code .cm-content").click();
  await page.keyboard.press("ControlOrMeta+A");
  // comme un collage : le texte arrive d'un bloc, sans décalage automatique des lignes
  await page.keyboard.insertText(code);
};
const contenu = () => page.evaluate(() => [...document.querySelectorAll(".py-code .cm-line")].map((l) => l.textContent ?? "").join("\n"));

// ---------- le sommaire ----------
await page.goto(`${BASE}/app/python`);
await page.waitForSelector(".py-sommaire");
const exercices = await page.locator(".py-sommaire > li").count();
bilan.sommaire = { exercices, bilan: await e.texte(".labo-bilan"), sousMenu: await page.locator(".sous-menu a").allInnerTexts(), largeur: await e.largeur() };
attendu(exercices > 0, "le sommaire ne montre aucun exercice");
attendu((await e.largeur()) <= 390, "le sommaire défile de côté");
attendu((await page.locator(".sous-menu a").allInnerTexts()).join(",") .includes("Python"), "le sous-menu n'a pas d'entrée Python");
await e.photo("1-sommaire", true);

// ---------- un exercice ----------
await page.locator(".py-depart a.btn-cuivre").click();
await page.waitForSelector(".py-code .cm-content");
const adresseExercice = page.url();
const depart = await contenu();
await pret();
await e.photo("2-exercice");
await page.getByRole("button", { name: "Vérifier" }).click();
await page.waitForSelector(".py-verifications");
const premier = { annonce: await e.texte(".py-etat"), verifications: await e.texte(".py-verifications h2") };
attendu(!(await page.locator(".py-reussite").count()), "le programme de départ est déclaré juste");
await page.getByRole("button", { name: /Un indice/ }).click();
attendu((await page.locator(".py-indices p").count()) === 1, "le premier indice ne s'affiche pas");
// une erreur d'élève : la vérification échoue, la ligne fautive est marquée
await remplace(`${depart}\nprint(vitesse_inconnue)\n`);
await page.getByRole("button", { name: "Vérifier" }).click();
await page.waitForSelector(".py-erreur");
const erreur = { titre: await e.texte(".py-erreur-titre"), explication: await e.texte(".py-erreur p:last-child"), ligneMarquee: await page.locator(".py-ligne-erreur").count() };
attendu(/NameError/.test(erreur.titre ?? ""), "l'erreur de nom n'est pas annoncée");
attendu(erreur.ligneMarquee === 1, "la ligne de l'erreur n'est pas marquée dans l'éditeur");
await e.photo("3-erreur", true);
// après deux vérifications, la solution se demande ; l'élève la reprend et vérifie
await page.getByRole("button", { name: "Voir une solution" }).click();
await page.waitForSelector(".py-solution pre");
const solution = await page.locator(".py-solution pre").innerText();
await remplace(solution);
await page.getByRole("button", { name: "Vérifier" }).click();
await page.waitForSelector(".py-reussite");
const reussite = { titre: await e.texte(".py-reussite h2"), verifications: await e.texte(".py-verifications h2"), retenir: await page.locator(".py-reussite .py-retenir li").count() };
attendu(reussite.titre === "Exercice réussi", `la réussite ne s'annonce pas (${reussite.titre})`);
await e.photo("4-reussi", true);
bilan.exercice = { adresse: adresseExercice, premier, erreur, reussite };

// le brouillon est gardé sur l'appareil : il revient après un rechargement, et « Recommencer » le défait
await remplace(`${solution}\n# mon brouillon\n`);
await attends(700);
await page.reload();
await page.waitForSelector(".py-code .cm-content");
const garde = (await contenu()).includes("# mon brouillon");
attendu(garde, "le brouillon n'est pas gardé après un rechargement");
attendu((await page.locator(".py-meta .puce-ok").count()) === 1, "la marque « Réussi » n'apparaît pas après rechargement");
await page.getByRole("button", { name: "Recommencer" }).click();
await page.getByRole("button", { name: "Oui, recommencer" }).click();
attendu((await contenu()).trim() === depart.trim(), "« Recommencer » ne remet pas le programme de départ");
bilan.brouillon = { garde };

// ---------- l'atelier libre ----------
await page.goto(`${BASE}/app/python/libre`);
await page.waitForSelector(".py-code .cm-content");
await pret();
await page.getByRole("button", { name: "Lancer" }).click();
await page.waitForSelector("svg.py-figure", { timeout: 30_000 });
const figure = { titre: await page.locator("svg.py-figure").getAttribute("aria-label"), points: await page.locator("svg.py-figure circle").count(), console: await e.texte(".py-console") };
attendu(figure.points > 5, "le tracé de l'atelier libre n'a pas ses points");
await e.photo("5-atelier-trace", true);
// une boucle sans fin : arrêtée au bout de dix secondes, puis Python repart
await remplace("print('début')\nwhile True:\n    x = 1\n");
const t0 = Date.now();
await page.getByRole("button", { name: "Lancer" }).click();
await page.waitForSelector(".py-erreur-titre", { timeout: 20_000 });
const arret = { apres: Math.round((Date.now() - t0) / 100) / 10, titre: await e.texte(".py-erreur-titre"), console: await e.texte(".py-console") };
await pret(30_000);
const reprise = Math.round((Date.now() - t0) / 100) / 10;
attendu(/arrêté/.test(arret.titre ?? ""), "la boucle sans fin n'est pas arrêtée");
attendu(arret.console === "début", "ce que le programme a affiché avant la boucle est perdu");
bilan.atelier = { figure, arret, reprise };
await remplace("import numpy as np\nprint(np.mean([1, 2, 3, 4]))\n");
await page.getByRole("button", { name: "Lancer" }).click();
await page.waitForFunction(() => document.querySelector(".py-console")?.textContent?.includes("2.5"), null, { timeout: 30_000 });
bilan.numpy = await e.texte(".py-console");

// ---------- ailleurs dans l'application ----------
await page.goto(`${BASE}/app/entrainement`);
const porte = page.locator(".porte-python");
attendu((await porte.count()) === 1, "pas de porte Python sur la page S'entraîner");
bilan.porte = { texte: await e.texte(".porte-python"), large: await porte.evaluate((el) => el.classList.contains("porte-large")) };
await e.photo("6-portes", true);
await page.goto(`${BASE}/app`);
bilan.accueil = await e.texte(".entrainement ul");
attendu(/Python/.test(String(bilan.accueil)), "le bloc S'entraîner de l'accueil n'a pas d'entrée Python");
await page.goto(`${BASE}/app/progres`);
bilan.progres = await page.locator("section.carte", { hasText: "En Python" }).first().innerText().catch(() => null);
attendu(bilan.progres !== null, "la page Progrès n'a pas de bloc Python");
await page.goto(`${BASE}/app/fiche/01`);
bilan.fiche = await page.locator(".carte-lien", { hasText: "Python" }).first().innerText().catch(() => null);

// ---------- en sombre ----------
await e.ctx.addCookies([{ name: "mb-theme", value: "sombre", url: BASE }]);
await page.goto(adresseExercice);
await page.waitForSelector(".py-code .cm-content");
await e.photo("7-exercice-sombre");

bilan.largeurs = await e.largeur();
bilan.erreurs = e.erreurs;
attendu(e.erreurs.length === 0, `erreurs de page ou de console : ${e.erreurs.join(" | ")}`);
await e.ferme();
console.log(JSON.stringify({ bilan, ecarts }, null, 2));
process.exit(ecarts.length ? 1 : 0);
