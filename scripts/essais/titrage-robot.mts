// Le robot du titrage : il suit la main du guide à la souris, lit la burette dans la loupe et place le repère sur la
// courbe comme un élève, puis appelle le professeur. Il ne sait rien du titrage : si la main montre le mauvais endroit,
// si une étape manque ou si une consigne tourne en rond, il échoue. Il sert à l'essai de la paillasse sur le banc
// (titrage-guide.mts) et à l'essai d'un TP entier dans son cadre (tp-eleve.mts).
import type { Locator, Page } from "@playwright/test";
import { attends, faisLeGeste, lisGuide, pointEcran, type Essai } from "./outils.mts";

export interface Suivi {
  /** les consignes du guide, dans l'ordre, avec le temps passé sur chacune */
  consignes: { cle: string; texte: string; ms: number }[];
  /** ce que le robot a lu dans la loupe, ou la place du repère sur la courbe */
  lu?: number;
  repere?: string | null;
  /** ce que l'établi dit avant d'appeler le professeur */
  confirmation: string | null;
}

/**
 * Suit le guide de la paillasse ouverte jusqu'à « Oui, j'ai fini ». `conducti` : la courbe se lit avec deux droites.
 * `photos` : une capture à chaque nouvelle consigne, nommée avec ce préfixe.
 */
export async function suisLeGuideDuTitrage(e: Essai, o: { conducti: boolean; photos?: string }): Promise<Suivi> {
  const page: Page = e.page;
  const scene: Locator = page.locator("svg.pl-scene");
  const photo = async (nom: string) => { if (o.photos !== undefined) await e.photo(`${o.photos}${nom}`); };
  const suivi: Suivi = { consignes: [], confirmation: null };

  /** Ce qu'un élève lit dans la loupe : la graduation en face du bas du ménisque, à une demi-graduation près. */
  async function lisLaLoupe(): Promise<number> {
    const lu = await page.evaluate(() => {
      const loupe = document.querySelector(".pl-loupe");
      const menisque = loupe?.querySelector("path.pl-menisque")?.getAttribute("d")?.match(/-?\d+(\.\d+)?/g)?.map(Number);
      if (!loupe || !menisque) return null;
      // le ménisque est une courbe : son bas est à mi-chemin entre ses bords et son point de contrôle
      const bas = (menisque[1] + menisque[3]) / 2;
      const grands = [...loupe.querySelectorAll(".pl-echelle line")].filter((l) => l.getAttribute("stroke-width") === "1.3").map((l) => Number(l.getAttribute("y1")));
      const chiffres = [...loupe.querySelectorAll("text.pl-loupe-chiffre")].map((t) => ({ v: Number((t.textContent ?? "").replace(",", ".")), y: Number(t.getAttribute("y")) }));
      // chaque chiffre est écrit en face d'un grand trait
      const reperes = chiffres.map((c) => ({ v: c.v, y: grands.reduce((m, y) => (Math.abs(y - c.y) < Math.abs(m - c.y) ? y : m), grands[0]) })).sort((a, b) => a.v - b.v);
      if (reperes.length < 2) return null;
      const [a, b] = [reperes[0], reperes[reperes.length - 1]];
      return a.v + ((bas - a.y) * (b.v - a.v)) / (b.y - a.y);
    });
    if (lu === null) throw new Error("la loupe ne montre pas de quoi lire");
    return Math.round(lu * 20) / 20;
  }

  /** Pose le repère de la courbe à l'abscisse donnée, dans les unités du dessin. */
  async function poseLeRepere(x: number): Promise<void> {
    const point = await pointEcran(scene, { x, y: 200 });
    await page.mouse.click(point.x, point.y);
    await attends(200);
  }

  /** Place le repère sur la courbe comme un élève : au milieu du saut de pH, ou là où les deux droites se croisent sur lui. */
  async function placeLeRepere(conducti: boolean): Promise<void> {
    const points = await page.evaluate(() => (document.querySelector("svg.pl-scene polyline")?.getAttribute("points") ?? "").split(" ").filter(Boolean).map((p) => p.split(",").map(Number)));
    if (points.length < 4) throw new Error("la courbe n'a pas assez de points");
    if (!conducti) {
      // le saut de pH : là où la courbe monte le plus vite
      let meilleur = 0, pente = 0;
      for (let i = 0; i + 1 < points.length; i++) {
        const p = Math.abs(points[i + 1][1] - points[i][1]) / Math.max(0.01, points[i + 1][0] - points[i][0]);
        if (p > pente) { pente = p; meilleur = i; }
      }
      await poseLeRepere((points[meilleur][0] + points[meilleur + 1][0]) / 2);
      return;
    }
    // la cassure se voit : c'est le creux de la courbe. Puis l'élève déplace le repère jusqu'à ce que les deux droites
    // tracées par la courbe se croisent sur lui.
    let x = points.reduce((m, p) => (p[1] > m[1] ? p : m))[0];
    for (let i = 0; i < 6; i++) {
      await poseLeRepere(x);
      const droites = await page.evaluate(() => [...document.querySelectorAll(".pl-droites line")].map((l) => ["x1", "y1", "x2", "y2"].map((a) => Number(l.getAttribute(a)))));
      if (droites.length < 2) throw new Error("la courbe ne trace pas ses deux droites");
      const [[a1, b1, a2, b2], [c1, d1, c2, d2]] = droites;
      const p1 = (b2 - b1) / (a2 - a1), p2 = (d2 - d1) / (c2 - c1);
      if (Math.abs(p1 - p2) < 1e-6) break;
      const croisement = (d1 - b1 + p1 * a1 - p2 * c1) / (p1 - p2);
      if (Math.abs(croisement - x) < 0.4) { x = croisement; await poseLeRepere(x); break; }
      x = croisement;
    }
  }


  const vues = new Set<string>();
  let depuis = Date.now();
  let rang = 0;
  const numero = () => String(rang).padStart(2, "0");
  for (let tour = 0; tour < 4000; tour++) {
    const p = await lisGuide(page);
    if (!p) throw new Error("le guide ne dit plus rien");
    const derniere = suivi.consignes[suivi.consignes.length - 1];
    if (derniere?.cle !== p.cle) {
      if (derniere) derniere.ms = Date.now() - depuis;
      depuis = Date.now();
      suivi.consignes.push({ cle: p.cle, texte: p.texte, ms: 0 });
      if (!vues.has(p.cle)) { vues.add(p.cle); rang++; await attends(140); await photo(`${numero()}-${p.cle}`); }
    } else if (Date.now() - depuis > 90000) {
      await e.photo("panne");
      throw new Error(`le guide reste sur « ${p.cle} » : ${p.texte}`);
    }
    if (p.cle === "lire") {
      suivi.lu = await lisLaLoupe();
      for (const signe of suivi.lu.toFixed(2).replace(".", ",")) await page.locator(".pl-pave").getByRole("button", { name: signe, exact: true }).click();
      await photo(`${numero()}-lire-saisie`);
      await page.getByRole("button", { name: "Noter", exact: true }).click();
      await attends(400);
      continue;
    }
    if (p.cle === "courbe-repere") {
      await placeLeRepere(o.conducti);
      suivi.repere = await e.texte("svg.pl-scene text.pl-fort >> nth=-1");
      await photo(`${numero()}-courbe-repere-pose`);
      await page.getByRole("button", { name: "Noter ce volume" }).click();
      await attends(400);
      continue;
    }
    if (await faisLeGeste(page, scene, p)) continue;
    if (p.touche) {
      const appel = p.cle === "fini";
      await page.locator(".pl-pied .pl-vise").first().click();
      await attends(350);
      if (appel) {
        await photo("98-confirmation");
        suivi.confirmation = await e.texte(".pl-confirme span");
        await page.getByRole("button", { name: "Oui, j'ai fini" }).click();
        return suivi;
      }
      continue;
    }
    await attends(60);
  }
  throw new Error("le guide n'arrive pas à « J'ai fini »");
}
