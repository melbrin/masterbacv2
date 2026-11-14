"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { nombre } from "@/lib/commun/format";
import {
  dureeSaut, finDuVol, hauteurMaxSaut, hauteurSaut, instantSommetSaut, PANIER, PESANTEUR, positionTir, sommetTir, TOLERANCE_PANIER,
  verdictTir, vitesseSaut, vitesseTir, type Tir, type VerdictTir,
} from "@/lib/commun/physique";

// La simulation du basketteur : « Le saut » (mouvement vertical) et « Le tir » (mouvement d'un projectile).
// Les calculs sont dans lib/commun/physique.ts. Ici : l'horloge du mouvement, le dessin et les réglages.

// ---------- écriture des nombres ----------

const ESPACE = String.fromCharCode(160); // espace insécable (U+00A0), entre un nombre et son unité
// Dans une équation, une ligne trop longue ne se coupe qu'avant un « + » ou un « − ».
const FOIS = `${ESPACE}×${ESPACE}`;
const PLUS = ` +${ESPACE}`;
const MOINS = ` −${ESPACE}`;

/** Un nombre à la française, avec le signe moins à la place du trait d'union. « -0,00 » s'écrit « 0,00 ». */
function ecrit(x: number, decimales: number): string {
  const texte = nombre(x, decimales);
  return texte.replace(/^[-−]/, /[1-9]/.test(texte) ? "−" : "");
}

/** Un nombre et son unité : « 0,46 m », « 3,00 m/s ». Un angle s'écrit sans espace : « 52° ». */
const mesure = (x: number, decimales: number, unite: string): string => `${ecrit(x, decimales)}${unite === "°" ? "" : ESPACE}${unite}`;

/** Trois décimales suffisent au dessin, et le serveur et le navigateur écrivent ainsi les mêmes nombres. */
const r = (x: number): number => Math.round(x * 1000) / 1000;

// ---------- horloge du mouvement ----------

type Phase = "pret" | "vol" | "fini";

/**
 * L'horloge d'un mouvement : l'instant t part de 0 et avance en temps réel jusqu'à la durée donnée.
 * La phase vaut « pret » avant le départ, « vol » pendant le mouvement, « fini » à l'arrivée.
 * Si l'élève a demandé moins d'animations, il n'y a pas d'animation : t vaut tout de suite la durée, et tout s'affiche d'un coup.
 */
function useHorloge() {
  const [etat, setEtat] = useState<{ phase: Phase; t: number }>({ phase: "pret", t: 0 });
  const image = useRef<number | null>(null);

  const annule = () => {
    if (image.current !== null) cancelAnimationFrame(image.current);
    image.current = null;
  };
  // quand le composant quitte l'écran, l'image demandée est annulée
  useEffect(() => () => {
    if (image.current !== null) cancelAnimationFrame(image.current);
  }, []);

  /** Lance le mouvement, ou le relance. `fin` est appelé une fois, quand t atteint la durée. */
  const lance = (duree: number, fin?: () => void) => {
    annule();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setEtat({ phase: "fini", t: duree });
      fin?.();
      return;
    }
    // l'heure se lit dans le rappel de requestAnimationFrame : la première image fixe l'instant zéro
    let debut: number | null = null;
    const avance = (maintenant: number) => {
      if (debut === null) debut = maintenant;
      const t = (maintenant - debut) / 1000;
      if (t < duree) {
        setEtat({ phase: "vol", t });
        image.current = requestAnimationFrame(avance);
      } else {
        image.current = null;
        setEtat({ phase: "fini", t: duree });
        fin?.();
      }
    };
    setEtat({ phase: "vol", t: 0 });
    image.current = requestAnimationFrame(avance);
  };

  /** Arrête le mouvement et revient au départ. */
  const remet = () => {
    annule();
    setEtat({ phase: "pret", t: 0 });
  };

  return { phase: etat.phase, t: etat.t, lance, remet };
}

// ---------- la scène : le terrain vu de côté, à l'échelle ----------

const ECHELLE = 40; // unités du dessin pour un mètre
const X_MIN = -1.1; // bord gauche de la scène, en mètres
const X_MAX = 7.4; // bord droit
const SOUS_SOL = 0.45; // bande sous le sol, pour les graduations
const HAUT_SAUT = 4.3; // hauteur visible dans « Le saut », en mètres
const HAUT_TIR = 7.8; // hauteur visible dans « Le tir » : le sommet le plus haut que les curseurs permettent est à 7,36 m
const RAYON_BALLON = 0.12; // un ballon de 0,24 m de diamètre
const RAYON_CERCLE = 0.225; // un cercle de 0,45 m de diamètre
const FACE_PANNEAU = PANIER.x + RAYON_CERCLE + 0.15; // le cercle est à 0,15 m du panneau
const MAINS = { x: 0.3, y: 2.2 }; // le centre du ballon dans les mains du joueur de 1,90 m, par rapport à ses pieds
const COTE = 0.45; // abscisse de la cote qui mesure la hauteur du saut, juste devant le joueur
const FLECHE = 0.15; // longueur de la flèche de la vitesse initiale, en mètres pour 1 m/s
const ARC = 0.45; // rayon de l'arc qui montre l'angle de tir
const PAS_TRACE = 0.1; // la trace du ballon porte un point toutes les 0,1 s

/** Du mètre à l'unité du dessin, pour les textes. Le dessin lui-même se fait en mètres, dans le repère de `enMetres`. */
const X = (x: number): number => r((x - X_MIN) * ECHELLE);
const Y = (y: number, haut: number): number => r((haut - y) * ECHELLE);
/** Le repère de la simulation : origine au sol à la verticale du point de départ, (Ox) vers le panier, (Oy) vers le haut, en mètres. */
const enMetres = (haut: number): string => `translate(${X(0)} ${Y(0, haut)}) scale(${ECHELLE} ${-ECHELLE})`;

/** Le support et le panneau (1,05 m de haut, le bas à 2,90 m du sol), dessinés derrière le joueur et le ballon. */
function Support() {
  return (
    <g fill="none" stroke="var(--discret)" strokeLinecap="round" strokeLinejoin="round">
      <path d={`M 6.6 0.05 V 3.15 L ${r(FACE_PANNEAU + 0.05)} 3.6 M 6.6 2.45 L ${r(FACE_PANNEAU + 0.05)} 3.1`} strokeWidth={0.09} />
      <rect x={r(FACE_PANNEAU)} y={2.9} width={0.05} height={1.05} fill="var(--encre)" stroke="none" />
    </g>
  );
}

/** Le cercle, à 3,05 m du sol, et son filet, dessinés devant le ballon. */
function Cercle() {
  const gauche = PANIER.x - RAYON_CERCLE;
  const droite = PANIER.x + RAYON_CERCLE;
  const bas = PANIER.y - 0.42;
  const fil = (x: number, pince: number) => `M ${r(x)} ${PANIER.y} L ${r(x + pince)} ${r(bas)}`;
  const maille = (y: number, retrait: number) => `M ${r(gauche + retrait)} ${r(y)} H ${r(droite - retrait)}`;
  return (
    <g fill="none" strokeLinecap="round">
      <path stroke="var(--discret)" strokeWidth={0.015}
        d={[fil(gauche, 0.09), fil(gauche + 0.15, 0.04), fil(droite - 0.15, -0.04), fil(droite, -0.09), maille(PANIER.y - 0.14, 0.03), maille(PANIER.y - 0.28, 0.06), maille(bas, 0.09)].join(" ")} />
      <path d={`M ${r(gauche)} ${PANIER.y} H ${r(FACE_PANNEAU)}`} stroke="var(--brique)" strokeWidth={0.05} />
    </g>
  );
}

/**
 * Le joueur, de profil, tourné vers le panier : tête ronde, tronc, bras levés, jambes. C'est un dessin original, en mètres.
 * À la taille 1 il mesure 1,90 m et tient le ballon à 2,20 m. Ses mains restent à la verticale de l'origine.
 */
function Joueur({ pieds = 0, taille = 1 }: { pieds?: number; taille?: number }) {
  return (
    <g transform={`translate(${r(-MAINS.x * taille)} ${r(pieds)}) scale(${r(taille)})`} fill="none" stroke="var(--encre)" strokeLinecap="round" strokeLinejoin="round">
      <path d="M -0.03 0.98 L -0.1 0.5 L -0.16 0.06 M 0.03 0.98 L 0.11 0.5 L 0.07 0.06" strokeWidth={0.085} />
      <path d="M -0.16 0.045 H -0.01 M 0.07 0.045 H 0.23" strokeWidth={0.09} />
      <path d="M -0.02 1.46 L 0.13 1.7 L 0.23 2.05 M 0.02 1.46 L 0.2 1.73 L 0.27 2.08" strokeWidth={0.07} />
      <rect x={-0.15} y={0.8} width={0.3} height={0.24} rx={0.05} fill="var(--encre)" stroke="none" />
      <rect x={-0.14} y={0.98} width={0.28} height={0.54} rx={0.07} fill="var(--bleu)" stroke="none" />
      <path d="M 0.01 1.5 L 0.02 1.66" strokeWidth={0.07} />
      <circle cx={0.03} cy={1.775} r={0.125} fill="var(--carte)" strokeWidth={0.03} />
    </g>
  );
}

/** Le ballon : la position donnée est celle de son centre, en mètres. */
function Ballon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${r(x)} ${r(y)})`} stroke="var(--encre)" strokeWidth={0.015}>
      <circle r={RAYON_BALLON} fill="var(--cuivre)" />
      <path d={`M ${-RAYON_BALLON} 0 H ${RAYON_BALLON} M 0 ${-RAYON_BALLON} Q 0.07 0 0 ${RAYON_BALLON}`} fill="none" />
    </g>
  );
}

/**
 * Le terrain : le sol, un repère tous les mètres, le panier à sa place. `children` se dessine en mètres, entre le support
 * et le cercle ; `textes` se place par-dessus, en unités du dessin (fonctions X et Y).
 */
function Terrain({ haut, description, children, textes }: { haut: number; description: string; children: ReactNode; textes?: ReactNode }) {
  const largeur = r((X_MAX - X_MIN) * ECHELLE);
  const sol = Y(0, haut);
  const hauteurs = Array.from({ length: Math.floor(haut) }, (_, i) => i + 1);
  const distances = Array.from({ length: Math.floor(X_MAX) + 1 }, (_, i) => i);
  return (
    <svg viewBox={`0 0 ${largeur} ${r((haut + SOUS_SOL) * ECHELLE)}`} role="img" aria-label={description}>
      {hauteurs.map((m) => (
        <g key={m}>
          <line x1={0} x2={largeur} y1={Y(m, haut)} y2={Y(m, haut)} stroke="var(--filet)" strokeDasharray="2 4" />
          <text className="simu-repere" x={4} y={Y(m, haut) - 3}>{m}{ESPACE}m</text>
        </g>
      ))}
      <rect x={0} y={sol} width={largeur} height={r(SOUS_SOL * ECHELLE)} fill="var(--carte-2)" />
      <line x1={0} x2={largeur} y1={sol} y2={sol} stroke="var(--encre)" strokeWidth={1.5} />
      {distances.map((m) => (
        <g key={m}>
          <line x1={X(m)} x2={X(m)} y1={sol} y2={sol + 4} stroke="var(--encre)" />
          <text className="simu-repere" x={X(m)} y={sol + 14} textAnchor="middle">{m}{m === distances.length - 1 ? `${ESPACE}m` : ""}</text>
        </g>
      ))}
      <g transform={enMetres(haut)}>
        <Support />
        {children}
        <Cercle />
      </g>
      {textes}
    </svg>
  );
}

// ---------- mesures, curseurs, graphiques ----------

function Mesure({ nom, valeur }: { nom: ReactNode; valeur: string }) {
  return <div><dt>{nom}</dt><dd className="chiffres">{valeur}</dd></div>;
}

function Curseur({ nom, valeur, min, max, pas, decimales, unite, regle }: {
  nom: string; valeur: number; min: number; max: number; pas: number; decimales: number; unite: string; regle: (valeur: number) => void;
}) {
  const id = useId();
  const texte = mesure(valeur, decimales, unite);
  return (
    <div className="simu-curseur">
      <label htmlFor={id}>{nom}</label>
      <span className="chiffres">{texte}</span>
      <input id={id} type="range" min={min} max={max} step={pas} value={valeur} aria-valuetext={texte} onChange={(e) => regle(Number(e.target.value))} />
    </div>
  );
}

const GRAPHE = { largeur: 170, hauteur: 116, gauche: 24, droite: 8, haut: 8, bas: 18, duree: 1.1 }; // l'axe du temps va de 0 à 1,1 s
interface PointGraphe { t: number; v: number }

/**
 * Une grandeur du saut en fonction du temps, tracée au fur et à mesure. Deux points donnent un segment de droite.
 * Trois points donnent un arc de parabole, de la même façon qu'une courbe de Bézier : le point du milieu fixe les tangentes.
 */
function Graphe({ titre, description, bas, haut, graduations, courbe, sommet }: {
  titre: ReactNode; description: string; bas: number; haut: number; graduations: number[]; courbe: PointGraphe[]; sommet: PointGraphe | null;
}) {
  const droite = GRAPHE.largeur - GRAPHE.droite;
  const px = (t: number) => r(GRAPHE.gauche + (t / GRAPHE.duree) * (droite - GRAPHE.gauche));
  const py = (v: number) => r(GRAPHE.haut + ((haut - v) / (haut - bas)) * (GRAPHE.hauteur - GRAPHE.haut - GRAPHE.bas));
  const point = (p: PointGraphe) => `${px(p.t)} ${py(p.v)}`;
  const fin = courbe[courbe.length - 1];
  return (
    <figure className="simu-graphe">
      <figcaption>{titre}</figcaption>
      <svg viewBox={`0 0 ${GRAPHE.largeur} ${GRAPHE.hauteur}`} role="img" aria-label={description}>
        {graduations.map((v) => (
          <g key={v}>
            <line x1={GRAPHE.gauche} x2={droite} y1={py(v)} y2={py(v)} stroke={v === 0 ? "var(--encre)" : "var(--filet)"} strokeDasharray={v === 0 ? undefined : "2 3"} />
            <text className="simu-repere" x={GRAPHE.gauche - 4} y={py(v) + 3.5} textAnchor="end">{ecrit(v, Number.isInteger(v) ? 0 : 1)}</text>
          </g>
        ))}
        <line x1={GRAPHE.gauche} x2={GRAPHE.gauche} y1={GRAPHE.haut} y2={GRAPHE.hauteur - GRAPHE.bas} stroke="var(--encre)" />
        {[0.5, 1].map((t) => (
          <g key={t}>
            <line x1={px(t)} x2={px(t)} y1={py(0) - 3} y2={py(0) + 3} stroke="var(--encre)" />
            <text className="simu-repere" x={px(t)} y={GRAPHE.hauteur - 5} textAnchor="middle">{mesure(t, Number.isInteger(t) ? 0 : 1, "s")}</text>
          </g>
        ))}
        {/* l'instant du sommet, au même endroit sur les deux graphiques */}
        {sommet && <line x1={px(sommet.t)} x2={px(sommet.t)} y1={GRAPHE.haut} y2={GRAPHE.hauteur - GRAPHE.bas} stroke="var(--discret)" strokeDasharray="2 3" />}
        {courbe.length > 1 && (
          <path d={`M ${point(courbe[0])} ${courbe.length === 3 ? "Q" : "L"} ${courbe.slice(1).map(point).join(" ")}`} fill="none" stroke="var(--cuivre-texte)" strokeWidth={2} strokeLinecap="round" />
        )}
        {sommet && <circle cx={px(sommet.t)} cy={py(sommet.v)} r={3.2} fill="var(--carte)" stroke="var(--encre)" strokeWidth={1.5} />}
        {fin && <circle cx={px(fin.t)} cy={py(fin.v)} r={3} fill="var(--cuivre-texte)" />}
      </svg>
    </figure>
  );
}

// ---------- le saut ----------

function PanneauSaut({ masque }: { masque: boolean }) {
  const [v0, setV0] = useState(3);
  const { phase, t, lance, remet } = useHorloge();
  const duree = dureeSaut(v0);
  const sommet = instantSommetSaut(v0);
  const detente = hauteurMaxSaut(v0);
  const y = Math.max(0, hauteurSaut(v0, t));
  const vy = vitesseSaut(v0, t);
  const enVol = phase !== "pret";
  const sommetPasse = enVol && t >= sommet;

  return (
    <div className="simu-panneau" hidden={masque}>
      <div className="simu-vue">
        <div className="simu-scene">
          <Terrain haut={HAUT_SAUT} description="Le terrain vu de côté. Le joueur tient le ballon, face au panier. Le sol et les hauteurs portent un repère tous les mètres."
            textes={sommetPasse && <text className="simu-cote" x={X(COTE) + 8} y={Math.min(Y(detente / 2, HAUT_SAUT) + 4, Y(0, HAUT_SAUT) - 3)}>{mesure(detente, 2, "m")}</text>}>
            {/* le sommet reste marqué : une silhouette pâle du joueur au plus haut, et la cote de la hauteur atteinte */}
            {sommetPasse && (
              <>
                <g opacity={0.28}>
                  <Joueur pieds={detente} />
                  <Ballon x={0} y={MAINS.y + detente} />
                </g>
                <g fill="none" stroke="var(--cuivre-texte)" strokeWidth={0.03} strokeLinecap="round">
                  <path d={`M ${COTE} 0.02 V ${r(detente)} M ${r(COTE - 0.07)} 0.02 h 0.14 M ${r(COTE - 0.07)} ${r(detente)} h 0.14`} />
                  <path d={`M -0.05 ${r(detente)} H ${r(COTE - 0.07)}`} strokeDasharray="0.06 0.07" />
                </g>
              </>
            )}
            <Joueur pieds={y} />
            <Ballon x={0} y={MAINS.y + y} />
          </Terrain>
        </div>
        <dl className="simu-mesures simu-mesures-3">
          <Mesure nom={<i>t</i>} valeur={mesure(t, 2, "s")} />
          <Mesure nom={<i>y</i>} valeur={mesure(y, 2, "m")} />
          <Mesure nom={<i>v<sub>y</sub></i>} valeur={mesure(vy, 2, "m/s")} />
        </dl>
        <div className="simu-graphes">
          <Graphe titre={<>Hauteur <i>y</i> (m)</>} description="La hauteur y en fonction du temps t : un arc de parabole."
            bas={0} haut={1.4} graduations={[0, 0.5, 1]}
            courbe={enVol ? [{ t: 0, v: 0 }, { t: t / 2, v: (v0 * t) / 2 }, { t, v: y }] : []}
            sommet={sommetPasse ? { t: sommet, v: detente } : null} />
          <Graphe titre={<>Vitesse <i>v<sub>y</sub></i> (m/s)</>} description="La vitesse verticale en fonction du temps t : une droite qui descend. Elle coupe l'axe au sommet du saut."
            bas={-5.5} haut={5.5} graduations={[-5, 0, 5]}
            courbe={enVol ? [{ t: 0, v: v0 }, { t, v: vy }] : []}
            sommet={sommetPasse ? { t: sommet, v: 0 } : null} />
        </div>
      </div>
      <div className="simu-reglages">
        <div className="actions"><button type="button" className="btn btn-cuivre" onClick={() => lance(duree)}>Sauter</button></div>
        <Curseur nom="Vitesse au décollage" valeur={v0} min={2} max={5} pas={0.1} decimales={1} unite="m/s" regle={(v) => { remet(); setV0(v); }} />
        <div className="simu-bilan" role="status">
          {phase === "fini" && (
            <>
              <p><b>Hauteur atteinte : {mesure(detente, 2, "m")}.</b> <b>Durée du saut : {mesure(duree, 2, "s")}.</b></p>
              <p>La vitesse est nulle au sommet. La montée dure autant que la descente.</p>
            </>
          )}
        </div>
        <section className="carte simu-equations">
          <h2>Équations horaires</h2>
          <p className="simu-equation">
            <span><i>y</i>(<i>t</i>) = <i>v</i><sub>0</sub>{FOIS}<i>t</i>{MOINS}½{FOIS}<i>g</i>{FOIS}<i>t</i><sup>2</sup></span>
            <span>= {ecrit(v0, 1)}{FOIS}<i>t</i>{MOINS}½{FOIS}{ecrit(PESANTEUR, 2)}{FOIS}<i>t</i><sup>2</sup></span>
          </p>
          <p className="simu-equation">
            <span><i>v<sub>y</sub></i>(<i>t</i>) = <i>v</i><sub>0</sub>{MOINS}<i>g</i>{FOIS}<i>t</i></span>
            <span>= {ecrit(v0, 1)}{MOINS}{ecrit(PESANTEUR, 2)}{FOIS}<i>t</i></span>
          </p>
          <p className="petit discret"><i>y</i> est la hauteur du centre de masse du joueur au-dessus de sa position debout, en mètres. <i>t</i> est en secondes.</p>
        </section>
      </div>
    </div>
  );
}

// ---------- le tir ----------

function phraseVerdict(verdict: VerdictTir): string {
  switch (verdict.resultat) {
    case "reussi": return "Panier !";
    case "court": return `Trop court de ${mesure(verdict.ecart, 2, "m")}.`;
    case "long": return `Trop long de ${mesure(verdict.ecart, 2, "m")}.`;
    case "trop-bas": {
      const sommet = mesure(verdict.sommet, 2, "m");
      // à quelques millimètres sous le cercle, la hauteur du sommet s'arrondit à 3,05 m
      return `Le ballon ne monte pas assez haut : son sommet est ${sommet === mesure(PANIER.y, 2, "m") ? "juste sous" : "à"} ${sommet}.`;
    }
  }
}

function PanneauTir({ masque }: { masque: boolean }) {
  const [tir, setTir] = useState<Tir>({ v0: 7, angle: 50, hauteur: 2.2 });
  const [paniers, setPaniers] = useState(0);
  const { phase, t, lance, remet } = useHorloge();
  const verdict = verdictTir(tir);
  const sommet = sommetTir(tir);
  const depart = vitesseTir(tir, 0);
  const p = positionTir(tir, t);
  const v = vitesseTir(tir, t);
  const enMain = phase === "pret";
  const sommetPasse = !enMain && t >= sommet.t;
  // avant le tir : la flèche de la vitesse initiale, l'arc de l'angle α, et la place de leurs noms
  const alpha = (tir.angle * Math.PI) / 180;
  const pointe = FLECHE * tir.v0;
  const autour = (rayon: number, angle: number) => ({ x: rayon * Math.cos(angle), y: tir.hauteur + rayon * Math.sin(angle) });
  const nomVitesse = autour(pointe + 0.24, alpha);
  const nomAngle = autour(ARC + 0.25, alpha / 2);
  // pendant le vol : un point de la trace toutes les 0,1 s
  const trace = enMain ? [] : Array.from({ length: Math.floor(t / PAS_TRACE + 1e-9) }, (_, i) => positionTir(tir, (i + 1) * PAS_TRACE));

  const regle = (reglage: keyof Tir) => (valeur: number) => {
    remet();
    setTir((avant) => ({ ...avant, [reglage]: valeur }));
  };
  const tire = () => lance(finDuVol(tir), verdict.resultat === "reussi" ? () => setPaniers((n) => n + 1) : undefined);

  return (
    <div className="simu-panneau" hidden={masque}>
      <div className="simu-vue">
        <div className="simu-scene">
          <Terrain haut={HAUT_TIR} description="Le terrain vu de côté. Le joueur lâche le ballon à gauche. Le centre du cercle est à 4,60 m de lui et à 3,05 m du sol. Le sol et les hauteurs portent un repère tous les mètres."
            textes={enMain ? (
              <>
                <text className="simu-fleche" x={X(nomVitesse.x)} y={Y(nomVitesse.y, HAUT_TIR) + 4} textAnchor="middle">
                  <tspan fontStyle="italic">v</tspan><tspan dy={3} fontSize={8}>0</tspan>
                </text>
                <text className="simu-fleche" x={X(nomAngle.x)} y={Y(nomAngle.y, HAUT_TIR) + 4} textAnchor="middle" fontStyle="italic">α</text>
              </>
            ) : sommetPasse && (
              <text className="simu-cote" x={X(sommet.x)} y={Y(sommet.y, HAUT_TIR) - 7} textAnchor="middle">Sommet : {mesure(sommet.y, 2, "m")}</text>
            )}>
            <Joueur taille={tir.hauteur / MAINS.y} />
            {enMain ? (
              <g transform={`translate(0 ${r(tir.hauteur)})`} fill="none" stroke="var(--bleu)" strokeLinecap="round">
                <path d="M 0 0 H 1" stroke="var(--discret)" strokeWidth={0.015} strokeDasharray="0.06 0.06" />
                <path d={`M ${ARC} 0 A ${ARC} ${ARC} 0 0 1 ${r(ARC * Math.cos(alpha))} ${r(ARC * Math.sin(alpha))}`} stroke="var(--discret)" strokeWidth={0.015} />
                <g transform={`rotate(${tir.angle})`}>
                  <path d={`M 0 0 H ${r(pointe - 0.1)}`} strokeWidth={0.04} />
                  <path d={`M ${r(pointe)} 0 l -0.15 0.065 v -0.13 z`} fill="var(--bleu)" stroke="none" />
                </g>
              </g>
            ) : (
              <>
                <path d={`M 0 ${r(tir.hauteur)} Q ${r((depart.vx * t) / 2)} ${r(tir.hauteur + (depart.vy * t) / 2)} ${r(p.x)} ${r(p.y)}`} fill="none" stroke="var(--cuivre-texte)" strokeWidth={0.03} />
                {trace.map((point, i) => <circle key={i} cx={r(point.x)} cy={r(point.y)} r={0.045} fill="var(--cuivre-texte)" />)}
                {sommetPasse && <circle cx={r(sommet.x)} cy={r(sommet.y)} r={0.07} fill="var(--carte)" stroke="var(--encre)" strokeWidth={0.03} />}
              </>
            )}
            {/* le vol s'arrête quand le centre du ballon arrive à y = 0 ; le ballon dessiné, lui, reste posé sur le sol */}
            <Ballon x={p.x} y={Math.max(p.y, RAYON_BALLON)} />
          </Terrain>
          <p className={`puce simu-score ${paniers ? "puce-ok" : ""}`}>Paniers marqués : {paniers}</p>
        </div>
        <div className="simu-retour">
          {phase !== "fini" && <p className="petit discret">Pour marquer, le centre du ballon doit passer à moins de {mesure(TOLERANCE_PANIER, 2, "m")} du centre du cercle.</p>}
          <p className={`simu-verdict ${verdict.resultat === "reussi" ? "simu-verdict-ok" : "simu-verdict-rate"}`} role="status">{phase === "fini" ? phraseVerdict(verdict) : ""}</p>
        </div>
        <dl className="simu-mesures simu-mesures-5">
          <Mesure nom={<i>t</i>} valeur={mesure(t, 2, "s")} />
          <Mesure nom={<i>x</i>} valeur={mesure(p.x, 2, "m")} />
          <Mesure nom={<i>y</i>} valeur={mesure(p.y, 2, "m")} />
          <Mesure nom={<i>v<sub>x</sub></i>} valeur={mesure(v.vx, 2, "m/s")} />
          <Mesure nom={<i>v<sub>y</sub></i>} valeur={mesure(v.vy, 2, "m/s")} />
        </dl>
      </div>
      <div className="simu-reglages">
        <div className="actions"><button type="button" className="btn btn-cuivre" onClick={tire}>Tirer</button></div>
        <div className="simu-curseurs">
          <Curseur nom="Vitesse du ballon" valeur={tir.v0} min={5} max={10} pas={0.05} decimales={2} unite="m/s" regle={regle("v0")} />
          <Curseur nom="Angle de tir" valeur={tir.angle} min={30} max={75} pas={1} decimales={0} unite="°" regle={regle("angle")} />
          <Curseur nom="Hauteur de lâcher" valeur={tir.hauteur} min={1.8} max={2.6} pas={0.05} decimales={2} unite="m" regle={regle("hauteur")} />
        </div>
        <section className="carte simu-equations">
          <h2>Équations horaires</h2>
          <p className="simu-equation">
            <span><i>x</i>(<i>t</i>) = <i>v</i><sub>0</sub>{FOIS}cos(<i>α</i>){FOIS}<i>t</i></span>
            <span>= {ecrit(tir.v0, 2)}{FOIS}cos({mesure(tir.angle, 0, "°")}){FOIS}<i>t</i></span>
          </p>
          <p className="simu-equation">
            <span><i>y</i>(<i>t</i>) = −½{FOIS}<i>g</i>{FOIS}<i>t</i><sup>2</sup>{PLUS}<i>v</i><sub>0</sub>{FOIS}sin(<i>α</i>){FOIS}<i>t</i>{PLUS}<i>H</i></span>
            <span>= −½{FOIS}{ecrit(PESANTEUR, 2)}{FOIS}<i>t</i><sup>2</sup>{PLUS}{ecrit(tir.v0, 2)}{FOIS}sin({mesure(tir.angle, 0, "°")}){FOIS}<i>t</i>{PLUS}{ecrit(tir.hauteur, 2)}</span>
          </p>
          <p className="petit discret"><i>x</i> et <i>y</i> sont en mètres, <i>t</i> est en secondes. Sur la trace, un point marque la position du ballon toutes les {mesure(PAS_TRACE, 1, "s")}.</p>
        </section>
      </div>
    </div>
  );
}

// ---------- l'écran ----------

export default function Basket() {
  const [mode, setMode] = useState<"saut" | "tir">("saut");
  return (
    <div className="simu">
      <div className="simu-onglets" role="group" aria-label="Mouvement étudié">
        <button type="button" aria-pressed={mode === "saut"} onClick={() => setMode("saut")}>Le saut</button>
        <button type="button" aria-pressed={mode === "tir"} onClick={() => setMode("tir")}>Le tir</button>
      </div>
      <PanneauSaut masque={mode !== "saut"} />
      <PanneauTir masque={mode !== "tir"} />
      <p className="simu-modele petit discret">Modèle : chute libre. Seul le poids agit, on néglige les frottements de l&apos;air.</p>
    </div>
  );
}
