"use client";

// La paillasse Circuits : des composants posés sur la table, et des fils que l'élève pose entre deux bornes.
// Deux montages : la charge d'un condensateur avec un générateur et un système d'acquisition, ou un capteur
// branché sur un microcontrôleur. La paillasse lit le montage (lib/commun/tp/circuit.ts) et répond comme le vrai
// matériel : une courbe, une mesure, ou rien si le circuit est mal fermé. La suite des gestes part au serveur.

import { useState } from "react";
import Icone from "@/components/appli/Icone";
import { useHorloge } from "@/components/simulations/horloge";
import { nombre } from "@/lib/commun/format";
import { CIRCUIT_INITIAL, FILS_MAX, analyse, defautDuMontage, gesteCircuit, tension, type EtatCircuit, type GesteCircuit, type ReglagesCircuit } from "@/lib/commun/tp/paillasses/circuit";
import type { GesteBrut, PropsPaillasse } from "@/lib/commun/tp/types";

/** Une borne : sa place sur le dessin, son nom dans une phrase, son nom dans la liste des fils, et ce qui s'écrit à côté d'elle. */
interface Borne { id: string; x: number; y: number; nom: string; bref: string; court: string }
const r = (x: number) => Math.round(x * 100) / 100;

// les bornes du montage de charge : générateur, interrupteur, résistance, condensateur, voie de mesure et masse
const BORNES_CHARGE: Borne[] = [
  { id: "g+", x: 40, y: 50, nom: "la borne + du générateur", bref: "générateur +", court: "+" },
  { id: "g-", x: 40, y: 150, nom: "la borne − du générateur", bref: "générateur −", court: "−" },
  { id: "k1", x: 104, y: 28, nom: "l'interrupteur, à gauche", bref: "interrupteur gauche", court: "" },
  { id: "k2", x: 158, y: 28, nom: "l'interrupteur, à droite", bref: "interrupteur droite", court: "" },
  { id: "r1", x: 206, y: 28, nom: "la résistance, à gauche", bref: "résistance gauche", court: "" },
  { id: "r2", x: 278, y: 28, nom: "la résistance, à droite", bref: "résistance droite", court: "" },
  { id: "c1", x: 320, y: 70, nom: "le condensateur, en haut", bref: "condensateur haut", court: "" },
  { id: "c2", x: 320, y: 136, nom: "le condensateur, en bas", bref: "condensateur bas", court: "" },
  { id: "voie", x: 166, y: 150, nom: "la voie de mesure", bref: "voie", court: "voie" },
  { id: "masse", x: 232, y: 150, nom: "la masse", bref: "masse", court: "masse" },
];
// les bornes du montage sur microcontrôleur : trois broches, la résistance, les deux plaques du capteur
const BORNES_CAPTEUR: Borne[] = [
  { id: "d2", x: 108, y: 56, nom: "la broche D2", bref: "D2", court: "D2" },
  { id: "a0", x: 108, y: 100, nom: "la broche A0", bref: "A0", court: "A0" },
  { id: "gnd", x: 108, y: 144, nom: "la broche GND", bref: "GND", court: "GND" },
  { id: "r1", x: 158, y: 28, nom: "la résistance, à gauche", bref: "résistance gauche", court: "" },
  { id: "r2", x: 230, y: 28, nom: "la résistance, à droite", bref: "résistance droite", court: "" },
  { id: "c1", x: 288, y: 62, nom: "la plaque gauche du capteur", bref: "plaque gauche", court: "" },
  { id: "c2", x: 322, y: 62, nom: "la plaque droite du capteur", bref: "plaque droite", court: "" },
];
const G = { x0: 46, x1: 344, y0: 162, y1: 28 }; // le cadre de la courbe

/** Le décor du montage de charge : les composants, sans les fils. */
function DecorCharge({ reglages, ferme }: { reglages: ReglagesCircuit; ferme: boolean }) {
  return (
    <g fill="none" stroke="var(--encre)" strokeWidth={1.5} strokeLinecap="round">
      <path d="M 40 50 V 76 M 40 124 V 150" />
      <circle cx={40} cy={100} r={24} fill="var(--carte)" />
      <text x={40} y={104} textAnchor="middle" className="labo-fort" stroke="none">{nombre(reglages.generateur.E, 1)} V</text>
      <text x={70} y={104} stroke="none">générateur</text>
      <path d={`M 104 28 H 114 M 148 28 H 158 M 114 28 L ${ferme ? "148 28" : "144 12"}`} />
      <text x={131} y={46} textAnchor="middle" stroke="none">interrupteur</text>
      <path d="M 206 28 H 222 M 262 28 H 278" />
      <rect x={222} y={19} width={40} height={18} rx={3} fill="var(--carte)" />
      <text x={242} y={52} textAnchor="middle" stroke="none"><tspan fontStyle="italic">R</tspan> = {nombre(reglages.R / 1000, 0)} kΩ</text>
      <path d="M 320 70 V 98 M 320 108 V 136 M 304 98 H 336 M 304 108 H 336" strokeWidth={2} />
      <text x={320} y={158} textAnchor="middle" stroke="none">condensateur</text>
      <rect x={140} y={150} width={118} height={26} rx={6} fill="var(--carte)" />
      <text x={199} y={190} textAnchor="middle" stroke="none">système d&apos;acquisition</text>
    </g>
  );
}

/** Le décor du montage sur microcontrôleur : la carte et ses broches, la résistance, la cuve et son capteur. */
function DecorCapteur({ reglages, niveau }: { reglages: ReglagesCircuit; niveau: number }) {
  const haut = Math.max(...reglages.niveaux, 1);
  const eau = r(172 - (niveau / haut) * 78);
  return (
    <g fill="none" stroke="var(--encre)" strokeWidth={1.5} strokeLinecap="round">
      <rect x={14} y={36} width={86} height={128} rx={8} fill="var(--carte)" />
      <text x={57} y={94} textAnchor="middle" className="labo-fort" stroke="none">micro-</text>
      <text x={57} y={108} textAnchor="middle" className="labo-fort" stroke="none">contrôleur</text>
      <path d="M 100 56 H 108 M 100 100 H 108 M 100 144 H 108" />
      <path d="M 158 28 H 174 M 214 28 H 230" />
      <rect x={174} y={19} width={40} height={18} rx={3} fill="var(--carte)" />
      <text x={194} y={52} textAnchor="middle" stroke="none"><tspan fontStyle="italic">R</tspan> = {nombre(reglages.R / 1e6, 1)} MΩ</text>
      {/* la cuve, l'eau, et les deux plaques du capteur */}
      <rect x={268} y={eau} width={74} height={r(172 - eau)} fill="rgba(64, 150, 240, 0.55)" stroke="none" />
      <path d="M 266 84 V 174 H 344 V 84" />
      <path d="M 288 62 V 166 M 322 62 V 166" strokeWidth={3} />
      <text x={305} y={190} textAnchor="middle" stroke="none">cuve : {niveau === 0 ? "vide" : `${nombre(niveau, 0)} cm d'eau`}</text>
    </g>
  );
}

export default function PaillasseCircuit({ reglages, fini, attente }: PropsPaillasse<ReglagesCircuit>) {
  const [{ etat, gestes }, setManip] = useState<{ etat: EtatCircuit; gestes: GesteCircuit[] }>({ etat: CIRCUIT_INITIAL, gestes: [] });
  const [choisie, setChoisie] = useState<string | null>(null);
  const [message, setMessage] = useState("Touche une borne, puis une autre : un fil les relie.");
  const [vue, setVue] = useState<"montage" | "courbe">("montage");
  const [curseur, setCurseur] = useState(0);
  const [confirme, setConfirme] = useState(false);
  const horloge = useHorloge();
  const charge = reglages.lecture;
  const lesBornes = charge ? BORNES_CHARGE : BORNES_CAPTEUR;
  const borne = (id: string) => lesBornes.find((b) => b.id === id)!;
  const derniere = etat.acquisitions[etat.acquisitions.length - 1];
  const E = reglages.generateur.E;

  const fais = (g: GesteCircuit): EtatCircuit => {
    const suite = gesteCircuit(reglages, etat, g);
    setConfirme(false);
    if (suite !== etat) setManip({ etat: suite, gestes: [...gestes, g] });
    return suite;
  };
  const touche = (id: string) => {
    if (choisie === null) { setChoisie(id); setMessage(`Fil en main, depuis ${borne(id).nom}. Touche la borne où le brancher.`); return; }
    setChoisie(null);
    if (choisie === id) { setMessage("Fil reposé."); return; }
    const suite = fais({ g: "relier", a: choisie, b: id });
    setMessage(suite === etat ? (etat.fils.length >= FILS_MAX ? "Il n'y a plus de fil disponible." : "Ces deux bornes sont déjà reliées.") : `Fil posé entre ${borne(choisie).nom} et ${borne(id).nom}.`);
  };
  const retire = (a: string, b: string) => { fais({ g: "retirer", a, b }); setMessage("Fil retiré."); };
  const acquiert = () => {
    const suite = fais({ g: "acquerir" });
    const faite = suite.acquisitions[suite.acquisitions.length - 1];
    if (suite === etat || !faite) return;
    const defaut = defautDuMontage(faite.montage);
    if (charge) {
      setVue("courbe");
      setCurseur(0);
      horloge.lance(reglages.duree, undefined, reglages.duree / 3);
      setMessage(defaut ?? "L'interrupteur est fermé : la tension du condensateur s'enregistre.");
    } else {
      setMessage(defaut ?? `Mesure faite : τ = ${nombre((faite.tau ?? 0) * 1e6, 0)} µs pour ${faite.niveau === 0 ? "la cuve vide" : `${nombre(faite.niveau, 0)} cm d'eau`}.`);
    }
  };
  const termine = () => {
    const incomplet = charge ? etat.lu === null : etat.acquisitions.every((a) => a.tau === null);
    if (incomplet && !confirme) { setConfirme(true); setMessage(charge ? "Tu n'as pas noté de temps caractéristique. Touche encore le bouton pour finir quand même." : "Aucune mesure n'a réussi. Touche encore le bouton pour finir quand même."); return; }
    fini(gestes as GesteBrut[]);
  };

  // la courbe de la dernière acquisition, tracée jusqu'à l'instant de l'horloge
  const jusque = horloge.phase === "pret" ? 0 : horloge.t;
  const tracee = derniere && derniere.montage.etat === "serie" && derniere.montage.mesure !== "absente";
  const u = (t: number) => (derniere ? tension(reglages, derniere.montage, derniere.niveau, t) : 0);
  const X = (t: number) => r(G.x0 + (t / reglages.duree) * (G.x1 - G.x0));
  const Y = (v: number) => r(G.y0 - ((v + 0.1 * E) / (1.25 * E)) * (G.y0 - G.y1));
  const courbe = Array.from({ length: 81 }, (_, i) => (i / 80) * jusque).map((t, i) => `${i ? "L" : "M"}${X(t)},${Y(u(t))}`).join(" ");
  const finie = horloge.phase === "fini";

  return (
    <div className="tp-paillasse">
      <div className="labo-ecran">
        <div className="labo-scene">
          {vue === "montage" ? (
            <svg viewBox="0 0 360 196" role="group" aria-label={`La paillasse : ${etat.fils.length} ${etat.fils.length > 1 ? "fils posés" : "fil posé"}.`}>
              {charge ? <DecorCharge reglages={reglages} ferme={horloge.phase !== "pret"} /> : <DecorCapteur reglages={reglages} niveau={etat.niveau} />}
              {/* les fils : une courbe entre les deux bornes */}
              {etat.fils.map(([a, b], i) => {
                const p = borne(a), q = borne(b);
                const long = Math.hypot(q.x - p.x, q.y - p.y) || 1;
                const bombe = (i % 2 ? -1 : 1) * Math.min(26, 8 + long / 8);
                return <path key={`${a}-${b}`} d={`M ${p.x} ${p.y} Q ${r((p.x + q.x) / 2 - ((q.y - p.y) / long) * bombe)} ${r((p.y + q.y) / 2 + ((q.x - p.x) / long) * bombe)} ${q.x} ${q.y}`} fill="none" stroke="var(--cuivre)" strokeWidth={2.6} strokeLinecap="round" />;
              })}
              {/* les bornes : on en touche une, puis une autre */}
              {lesBornes.map((b) => (
                <g key={b.id} className="tp-borne" role="button" tabIndex={0} aria-label={`Borne : ${b.nom}`} aria-pressed={choisie === b.id}
                  onClick={() => touche(b.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); touche(b.id); } }}>
                  <circle cx={b.x} cy={b.y} r={19} fill="transparent" />
                  {choisie === b.id && <circle className="labo-appel" cx={b.x} cy={b.y} r={12} fill="none" stroke="var(--sable)" strokeWidth={2} />}
                  <circle cx={b.x} cy={b.y} r={6.5} fill={choisie === b.id ? "var(--sable)" : "var(--carte)"} stroke="var(--cuivre)" strokeWidth={2} />
                  {b.court && <text x={b.x} y={b.y - (b.id === "g-" || b.id === "voie" || b.id === "masse" ? -20 : 12)} textAnchor="middle" className="labo-fort">{b.court}</text>}
                </g>
              ))}
            </svg>
          ) : (
            <svg viewBox="0 0 360 196" role="img" aria-label="La tension mesurée au cours du temps.">
              <path d={`M ${G.x0} ${G.y1 - 6} V ${Y(-0.1 * E)} M ${G.x0} ${Y(0)} H ${G.x1 + 4}`} fill="none" stroke="var(--encre)" strokeWidth={1.2} />
              {[0, E / 2, E].map((v) => <g key={v}><line x1={G.x0 - 3} x2={G.x0} y1={Y(v)} y2={Y(v)} stroke="var(--encre)" /><text x={G.x0 - 6} y={Y(v) + 3.5} textAnchor="end">{nombre(v, 1)}</text></g>)}
              {[0.25, 0.5, 0.75, 1].map((k) => <g key={k}><line x1={X(k * reglages.duree)} x2={X(k * reglages.duree)} y1={Y(0)} y2={Y(0) + 3} stroke="var(--encre)" /><text x={X(k * reglages.duree)} y={Y(0) + 14} textAnchor="middle">{nombre(k * reglages.duree, 0)}</text></g>)}
              <text x={G.x0 - 6} y={G.y1 - 10} textAnchor="end">u (V)</text>
              <text x={G.x1 + 4} y={Y(0) + 28} textAnchor="end">t (s)</text>
              {tracee ? <path d={courbe} fill="none" stroke="var(--cuivre)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" /> : <text x={(G.x0 + G.x1) / 2} y={(G.y0 + G.y1) / 2} textAnchor="middle" className="labo-fort">aucun signal</text>}
              {tracee && finie && (
                <g>
                  <line x1={X(curseur)} x2={X(curseur)} y1={G.y1} y2={Y(-0.1 * E)} stroke="var(--bleu)" strokeDasharray="3 3" />
                  <circle cx={X(curseur)} cy={Y(u(curseur))} r={4} fill="var(--bleu)" />
                  <text x={X(curseur) + (curseur > reglages.duree * 0.6 ? -8 : 8)} y={G.y1 + 4} textAnchor={curseur > reglages.duree * 0.6 ? "end" : "start"} className="labo-fort">t = {nombre(curseur, 2)} s ; u = {nombre(u(curseur), 2)} V</text>
                </g>
              )}
              {etat.lu !== null && <text x={G.x1} y={Y(0) - 14} textAnchor="end" style={{ fill: "var(--cuivre)", fontWeight: 700 }}>temps noté : {nombre(etat.lu, 2)} s</text>}
            </svg>
          )}
        </div>
        <div className="labo-verdict" role="status"><p className="labo-attente">{message}</p></div>
      </div>

      <section className="carte tp-gestes" aria-label="Gestes de la manipulation">
        {charge && derniere && (
          <div className="simu-onglets" role="group" aria-label="Ce que montre la paillasse">
            <button type="button" aria-pressed={vue === "montage"} onClick={() => setVue("montage")}>Le montage</button>
            <button type="button" aria-pressed={vue === "courbe"} onClick={() => setVue("courbe")}>La courbe</button>
          </div>
        )}
        {vue === "montage" && (
          <>
            <h3>Les fils posés</h3>
            {etat.fils.length === 0 ? <p className="petit discret" style={{ margin: 0 }}>Aucun fil pour le moment.</p> : (
              <ul className="tp-fils">
                {etat.fils.map(([a, b]) => <li key={`${a}-${b}`}><span>{borne(a).bref} et {borne(b).bref}</span><button type="button" aria-label={`Retirer le fil entre ${borne(a).nom} et ${borne(b).nom}`} onClick={() => retire(a, b)}><Icone nom="croix" /></button></li>)}
              </ul>
            )}
          </>
        )}
        {!charge && (
          <>
            <h3>Le niveau d&apos;eau</h3>
            <div className="tp-verser" role="group" aria-label="Niveau d'eau dans la cuve" style={{ gridTemplateColumns: `repeat(${reglages.niveaux.length}, minmax(0, 1fr))` }}>
              {reglages.niveaux.map((h) => <button key={h} type="button" aria-pressed={etat.niveau === h} onClick={() => { fais({ g: "niveau", h }); setMessage(h === 0 ? "La cuve est vide." : `La cuve contient ${nombre(h, 0)} cm d'eau.`); }}>{h === 0 ? "vide" : `${nombre(h, 0)} cm`}</button>)}
            </div>
            {etat.acquisitions.some((a) => a.tau !== null) && (
              <ol className="tp-releves" aria-label="Mesures affichées par le microcontrôleur">
                {etat.acquisitions.filter((a) => a.tau !== null).map((a, i) => <li key={i}><span>{a.niveau === 0 ? "cuve vide" : `${nombre(a.niveau, 0)} cm`}</span><b>τ = {nombre((a.tau ?? 0) * 1e6, 0)} µs</b></li>)}
              </ol>
            )}
          </>
        )}
        {charge && vue === "courbe" && tracee && finie && (
          <div className="tp-lecture">
            <label htmlFor="tp-curseur">Déplace le repère sur la courbe : t = {nombre(curseur, 2)} s</label>
            <input id="tp-curseur" className="tp-glissiere" type="range" min={0} max={reglages.duree} step={reglages.duree / 400} value={curseur} onChange={(e) => setCurseur(Number(e.target.value))} aria-valuetext={`t = ${nombre(curseur, 2)} s, u = ${nombre(u(curseur), 2)} V`} />
          </div>
        )}
        <div className="tp-relever">
          {charge && vue === "courbe" && tracee && finie
            ? <button type="button" className="btn btn-ligne" onClick={() => { fais({ g: "lire", tau: curseur }); setMessage(`Temps caractéristique noté : ${nombre(curseur, 2)} s.`); }}>Noter ce temps</button>
            : <button type="button" className="btn btn-ligne" onClick={acquiert}>{charge ? "Lancer l'acquisition" : "Lancer la mesure"}</button>}
          <button type="button" className="btn btn-cuivre" disabled={attente} onClick={termine}>{confirme ? "Finir quand même" : "J'ai fini"}</button>
        </div>
        {charge && vue === "courbe" && tracee && finie && <button type="button" className="btn-texte tp-recommencer" onClick={acquiert}>Refaire une acquisition</button>}
      </section>
    </div>
  );
}
