"use client";

import { useId, useState, type ReactNode } from "react";
import { nombreRelatif as ecrit } from "@/lib/commun/format";
import {
  dureeSaut, finDuVol, hauteurMaxSaut, hauteurSaut, instantSommetSaut, PANIER, PESANTEUR, positionTir, sommetTir, TOLERANCE_PANIER,
  verdictTir, vitesseSaut, vitesseTir, type Tir, type VerdictTir,
} from "@/lib/commun/physique";
import { useHorloge } from "./horloge";
import { ARC, Ballon, COTE, ESPACE, FLECHE, HAUT_SAUT, HAUT_TIR, Joueur, MAINS, PAS_TRACE, r, RAYON_BALLON, Terrain, X, Y } from "./terrain";

// La simulation du basketteur : « Le saut » (mouvement vertical) et « Le tir » (mouvement d'un projectile).
// Les calculs sont dans lib/commun/physique.ts, l'horloge du mouvement dans horloge.ts. Ici : le dessin et les réglages.
// Les pièces du dessin (terrain, joueur, ballon) sont dans terrain.tsx : elles servent aussi aux défis du labo.

// ---------- écriture des nombres ----------

// Dans une équation, une ligne trop longue ne se coupe qu'avant un « + » ou un « − ».
const FOIS = `${ESPACE}×${ESPACE}`;
const PLUS = ` +${ESPACE}`;
const MOINS = ` −${ESPACE}`;

/** Un nombre et son unité : « 0,46 m », « 3,00 m/s ». Un angle s'écrit sans espace : « 52° ». */
const mesure = (x: number, decimales: number, unite: string): string => `${ecrit(x, decimales)}${unite === "°" ? "" : ESPACE}${unite}`;

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
