"use client";

// La paillasse Titrage (décision 0012). L'élève y fait les gestes du laboratoire, à la main : il prend le flacon pour
// rincer et remplir la burette, tourne le robinet (goutte à goutte, puis au filet), aspire à la pipette jusqu'au trait
// de jauge, ajoute l'indicateur, lance l'agitation, et lit le volume à la loupe. Rien n'écrit la mesure à sa place.
// Chaque geste passe par les règles (lib/commun/tp/paillasses/titrage.ts) ; la liste des gestes part au serveur.

import { useCallback, useEffect, useRef, useState } from "react";
import { nombre } from "@/lib/commun/format";
import { AU_DESSUS, CAPACITE, GOUTTE, agite, dansErlenmeyer, equivalenceReelle, lecture, pHActuel, pHVu, regles, sondeTrempe, type EtatTitrage, type ReglagesTitrage } from "@/lib/commun/tp/paillasses/titrage";
import type { GesteBrut, PropsPaillasse } from "@/lib/commun/tp/types";
import { INCOLORE, TEINTES_INDICATEUR, couleurIndicateur } from "../couleurs";
import { Afficheur, Becher, Burette, Cible, CompteGouttes, Erlenmeyer, Etabli, Filet, Flacon, Goutte, LoupeNiveau, Manipulation, Molette, Objet, PipetteJaugee, Pissette, Poussoir, Releve, Scene, son, useGlisse, type Vue } from "../kit";

// ---------- la place de chaque chose dans le dessin (360 de large) ----------
const VUE: Vue = { x: 0, y: -46, l: 360, h: 566 };
const BX = 108;                      // l'axe de la burette
const BURETTE = { y: 30, h: 300 };   // la burette, de son haut à son robinet
const ROBINET = 346;
const POINTE = 368;
const PLAQUE = 484;                  // le dessus de l'agitateur
const LOUPE = { x: 274, y: 70, r: 58 };
/** Pendant la lecture, le regard se rapproche de la loupe. */
const VUE_LOUPE: Vue = { x: LOUPE.x - 92, y: LOUPE.y - 80, l: 184, h: 150 };
const REPOS = {
  soude: { x: 226, y: 226 }, pipette: { x: 340, y: 212 }, pissette: { x: 220, y: 320 }, compte: { x: 254, y: 322 },
  erlenmeyer: { x: 296, y: 434 }, poubelle: { x: 227, y: 418 }, barreau: { x: 227, y: 466 },
};
const BECHER = { x: 262, y: 216, l: 50, h: 46 };  // le bécher de solution à titrer : il ne bouge pas
const VASE = { l: 78, h: 84 };                    // le récipient du titrage

interface Partie { etat: EtatTitrage; gestes: GesteBrut[] }
const CUMULS: Record<string, number> = { remplir: 30, aspirer: 30, vider: 30, eau: 120, couler: 30 };
/** Ajoute un geste à la liste. Les morceaux d'un même versement continu se regroupent : la liste reste courte, et rejouée elle donne le même état. */
function ajoute(gestes: GesteBrut[], g: GesteBrut): GesteBrut[] {
  const dernier = gestes[gestes.length - 1];
  const a = dernier?.v, b = g.v;
  const continu = dernier !== undefined && dernier.g === g.g && typeof a === "number" && typeof b === "number" && CUMULS[g.g] !== undefined
    && (g.g !== "couler" || (g.filet === true && dernier.filet === true)) && a + b <= CUMULS[g.g];
  return continu ? [...gestes.slice(0, -1), { ...dernier, v: Math.round((a + b) * 100) / 100 }] : [...gestes, g];
}

const ml = (x: number) => `${nombre(x, 2)} mL`;
/** Le débit du robinet : goutte à goutte tant qu'il est peu ouvert, puis au filet. */
const AU_FILET = 0.35;
const entreGouttes = (ouverture: number) => 1.1 - ((ouverture - 0.05) / (AU_FILET - 0.05)) * 0.85;
const debitFilet = (ouverture: number) => 0.4 + ((ouverture - AU_FILET) / (1 - AU_FILET)) * 1.8;

// ---------- la courbe du pH-mètre ----------

// La courbe des relevés, avec un repère que l'élève glisse jusqu'au milieu du saut de pH.
function Courbe(props: { releves: { V: number; pH: number }[]; repere: number; place: (V: number) => void }) {
  return (
    <Scene vue={{ x: 0, y: 0, l: 360, h: 470 }} nom="La courbe du pH en fonction du volume de solution titrante versé">
      <TraceCourbe {...props} />
    </Scene>
  );
}
function TraceCourbe({ releves, repere, place }: { releves: { V: number; pH: number }[]; repere: number; place: (V: number) => void }) {
  const cadre = { x: 44, y: 20, l: 296, h: 380 };
  const max = Math.max(20, Math.ceil((Math.max(0, ...releves.map((p) => p.V)) + 1) / 5) * 5);
  const X = (V: number) => cadre.x + (V / max) * cadre.l;
  const Y = (pH: number) => cadre.y + cadre.h - (pH / 14) * cadre.h;
  const points = [...releves].sort((a, b) => a.V - b.V);
  const glisse = useGlisse({
    depart: (p) => place(Math.round(Math.max(0, Math.min(max, ((p.x - cadre.x) / cadre.l) * max)) * 20) / 20),
    bouge: (p) => place(Math.round(Math.max(0, Math.min(max, ((p.x - cadre.x) / cadre.l) * max)) * 20) / 20),
  });
  return (
    <>
      {Array.from({ length: 8 }, (_, i) => i * 2).map((pH) => (
        <g key={pH}><line x1={cadre.x} x2={cadre.x + cadre.l} y1={Y(pH)} y2={Y(pH)} stroke="var(--filet)" /><text x={cadre.x - 6} y={Y(pH) + 3} textAnchor="end">{pH}</text></g>
      ))}
      {Array.from({ length: max / 5 + 1 }, (_, i) => i * 5).map((V) => (
        <g key={V}><line x1={X(V)} x2={X(V)} y1={cadre.y} y2={cadre.y + cadre.h} stroke="var(--filet)" /><text x={X(V)} y={cadre.y + cadre.h + 13} textAnchor="middle">{V}</text></g>
      ))}
      <text x={cadre.x - 30} y={cadre.y - 6} className="pl-fort">pH</text>
      <text x={cadre.x + cadre.l} y={cadre.y + cadre.h + 28} textAnchor="end" className="pl-fort">volume versé (mL)</text>
      {points.length > 1 && <polyline points={points.map((p) => `${X(p.V).toFixed(1)},${Y(p.pH).toFixed(1)}`).join(" ")} fill="none" stroke="var(--cuivre)" strokeWidth={1.4} />}
      {points.map((p) => <circle key={p.V} cx={X(p.V)} cy={Y(p.pH)} r={2.6} fill="var(--encre)" />)}
      <g role="slider" tabIndex={0} aria-label="Repère sur la courbe" aria-valuemin={0} aria-valuemax={max} aria-valuenow={repere} aria-valuetext={ml(repere)} {...glisse}
        onKeyDown={(e) => { const pas = e.key === "ArrowRight" ? 0.05 : e.key === "ArrowLeft" ? -0.05 : e.key === "PageUp" ? 1 : e.key === "PageDown" ? -1 : 0; if (pas) { e.preventDefault(); place(Math.round(Math.max(0, Math.min(max, repere + pas)) * 20) / 20); } }}>
        <rect x={cadre.x} y={cadre.y} width={cadre.l} height={cadre.h} fill="transparent" />
        <line x1={X(repere)} x2={X(repere)} y1={cadre.y} y2={cadre.y + cadre.h} stroke="var(--sable)" strokeWidth={1.6} strokeDasharray="5 4" />
        <rect x={X(repere) - 9} y={cadre.y - 14} width={18} height={14} rx={4} fill="var(--sable)" />
      </g>
      <text x={180} y={448} textAnchor="middle" className="pl-fort" style={{ fontSize: 13 }}>Repère : V = {ml(repere)}</text>
    </>
  );
}

// ---------- la paillasse ----------

export default function Titrage({ reglages: r, protocole, attente, fini }: PropsPaillasse<ReglagesTitrage>) {
  const [partie, setPartie] = useState<Partie>(() => ({ etat: regles.depart(r), gestes: [] }));
  const [message, setMessage] = useState("Ta paillasse est prête. Le protocole est en haut de l'écran.");
  const [ouverture, setOuverture] = useState(0);
  /** les outils posés : le flacon au-dessus de la burette, la pissette ou le compte-gouttes au-dessus du récipient */
  const [pose, setPose] = useState<{ soude: boolean; outil: "pissette" | "compte" | null }>({ soude: false, outil: null });
  const [chute, setChute] = useState(0);
  const [jet, setJet] = useState<"soude" | "pipette" | "pissette" | null>(null);
  const [saisie, setSaisie] = useState(false);
  const [courbe, setCourbe] = useState(false);
  const [repere, setRepere] = useState(10);
  const { etat, gestes } = partie;
  const phmetre = r.suivi === "phmetre";
  const vase = phmetre ? "bécher" : "erlenmeyer";

  const agit = useCallback((g: GesteBrut) => setPartie((p) => ({ etat: regles.geste(r, p.etat, g), gestes: ajoute(p.gestes, g) })), [r]);
  const reserve = useRef(0);
  /** Verse un liquide tant que l'appui dure : le débit, en mL par seconde, donne des morceaux d'un centième de millilitre. */
  const debite = (g: string, debit: number, dt: number, plus: Record<string, string | number | boolean> = {}) => {
    reserve.current += debit * dt;
    if (reserve.current < 0.05) return;
    const v = Math.floor(reserve.current * 100) / 100;
    reserve.current -= v;
    agit({ g, v, ...plus });
  };

  // ----- le robinet : tant qu'il est ouvert, la burette coule -----
  const vide = useRef(false);
  useEffect(() => { vide.current = etat.volume <= 0; });
  useEffect(() => {
    if (ouverture <= 0) return;
    let image = 0;
    let avant = performance.now();
    let attenteGoutte = entreGouttes(ouverture) * 0.6;
    let filet = 0;
    const tourne = (maintenant: number) => {
      const dt = Math.min(0.1, (maintenant - avant) / 1000);
      avant = maintenant;
      if (!vide.current) {
        if (ouverture <= AU_FILET) {
          attenteGoutte += dt;
          if (attenteGoutte >= entreGouttes(ouverture)) { attenteGoutte = 0; agit({ g: "couler", v: GOUTTE }); setChute((n) => n + 1); son("goutte"); }
        } else {
          filet += debitFilet(ouverture) * dt;
          if (filet >= 0.03) { const v = Math.floor(filet * 100) / 100; filet -= v; agit({ g: "couler", v, filet: true }); }
        }
      }
      image = requestAnimationFrame(tourne);
    };
    image = requestAnimationFrame(tourne);
    return () => cancelAnimationFrame(image);
  }, [ouverture, agit]);

  const tourneRobinet = (o: number) => {
    setOuverture(o);
    if (o === 0) { setMessage("Robinet fermé."); return; }
    if (etat.volume <= 0) { setMessage("Le robinet est ouvert, mais la burette est vide."); return; }
    const ou = etat.dessous === "rien" ? "sur la paillasse : rien n'est posé dessous" : etat.dessous === "poubelle" ? "dans le bécher poubelle" : `dans ${vase === "bécher" ? "le bécher" : "l'erlenmeyer"}`;
    setMessage(`${r.noms.titrante} : elle coule ${o <= AU_FILET ? "goutte à goutte" : "au filet"}, ${ou}.`);
  };

  // ----- prendre et poser -----
  const reposeOutils = () => setPose((p) => ({ ...p, outil: null }));
  const poser = (objet: string, cible: string) => {
    const rangement = cible.startsWith("rangement");
    switch (objet) {
      case "soude":
        setPose((p) => ({ ...p, soude: !rangement }));
        setMessage(rangement ? `Le flacon de ${r.noms.titrante.toLowerCase()} est reposé.` : `Le flacon est au-dessus de la burette. Maintiens « Verser » pour la remplir.`);
        break;
      case "erlenmeyer":
      case "poubelle":
        agit({ g: "dessous", quoi: rangement ? "rien" : objet });
        if (objet === "erlenmeyer") { reposeOutils(); if (etat.pipette === "erlenmeyer") agit({ g: "pipette", ou: "repos" }); }
        setMessage(rangement ? `${objet === "poubelle" ? "Le bécher poubelle" : vase === "bécher" ? "Le bécher" : "L'erlenmeyer"} est revenu sur la paillasse.` : `${objet === "poubelle" ? "Le bécher poubelle" : vase === "bécher" ? "Le bécher" : "L'erlenmeyer"} est sous la burette.`);
        break;
      case "pipette":
        agit({ g: "pipette", ou: rangement ? "repos" : cible === "becher" ? "becher" : "erlenmeyer" });
        reposeOutils();
        setMessage(rangement ? "La pipette est reposée." : cible === "becher" ? `La pipette trempe dans la solution. Maintiens « Aspirer », puis ajuste le bas du ménisque sur le trait de jauge : regarde la loupe.` : `La pipette est au-dessus du ${vase}. Maintiens « Vider ».`);
        break;
      case "pissette":
        if (cible === "sonde") { agit({ g: "rincersonde" }); setMessage("Tu rinces la sonde à l'eau distillée."); son("goutte"); break; }
        setPose((p) => ({ ...p, outil: rangement ? null : "pissette" }));
        if (!rangement && etat.pipette === "erlenmeyer") agit({ g: "pipette", ou: "repos" });
        setMessage(rangement ? "La pissette est reposée." : "La pissette est au-dessus du récipient. Maintiens « Eau » pour en ajouter.");
        break;
      case "compte":
        setPose((p) => ({ ...p, outil: rangement ? null : "compte" }));
        if (!rangement && etat.pipette === "erlenmeyer") agit({ g: "pipette", ou: "repos" });
        setMessage(rangement ? "Le flacon d'indicateur est reposé." : "L'indicateur est au-dessus de l'erlenmeyer. Touche « Goutte » pour en ajouter.");
        break;
      case "barreau":
        agit({ g: "barreau" });
        setMessage(`Le barreau aimanté est dans ${vase === "bécher" ? "le bécher" : "l'erlenmeyer"}.`);
        break;
      case "sonde":
        agit({ g: "sonde", dans: !rangement });
        setMessage(rangement ? "La sonde est sortie de la solution." : "La sonde du pH-mètre est dans le bécher.");
        break;
    }
  };

  // ----- les positions qui dépendent de l'état -----
  const sousBurette = etat.dessous === "erlenmeyer";
  const vaseX = sousBurette ? BX : REPOS.erlenmeyer.x;
  const vaseHaut = (sousBurette ? PLAQUE : 476) - VASE.h;
  const poubelleX = etat.dessous === "poubelle" ? BX : REPOS.poubelle.x;
  const poubelleHaut = (etat.dessous === "poubelle" ? PLAQUE : 440) - 44;
  const volumeVase = dansErlenmeyer(etat);
  const niveauVase = volumeVase <= 0 ? 0 : Math.min(0.95, 0.14 + volumeVase / 105);
  const surface = vaseHaut + VASE.h - niveauVase * VASE.h * 0.7;
  const pH = pHVu(r, etat);
  const couleurVase = !phmetre && etat.gouttes > 0 ? couleurIndicateur(r.indicateur, pH) : INCOLORE;
  const avantEquivalence = etat.prise > 0 && etat.verse < equivalenceReelle(r, etat);
  const eclat = !phmetre && etat.gouttes > 0 && sousBurette && avantEquivalence;
  const resteAvant = Math.max(0.05, equivalenceReelle(r, etat) - etat.verse);
  const niveauBurette = etat.volume > 0 ? lecture(etat) : null;
  const loupePipette = etat.pipette === "becher" || (etat.dansPipette > 0 && etat.pipette !== "repos");
  const pipetteIci = etat.pipette === "becher" ? { x: BECHER.x + BECHER.l / 2, y: BECHER.y + BECHER.h - 8 - 124 } : etat.pipette === "erlenmeyer" ? { x: vaseX, y: vaseHaut + 6 - 124 } : { x: REPOS.pipette.x, y: REPOS.pipette.y - 62 };
  const outilsPossibles = !sousBurette;  // on prépare le récipient sur la paillasse, puis on le glisse sous la burette

  const recommence = () => {
    agit({ g: "recommencer" });
    setOuverture(0);
    setPose((p) => ({ ...p, outil: null }));
    setSaisie(false);
    setCourbe(false);
    setMessage(`Nouveau titrage : ${vase === "bécher" ? "le bécher" : "l'erlenmeyer"} est lavé, la burette reste comme elle est.`);
  };
  const toutRecommencer = () => {
    setPartie({ etat: regles.depart(r), gestes: [] });
    setOuverture(0);
    setPose({ soude: false, outil: null });
    setSaisie(false);
    setCourbe(false);
    setMessage("La paillasse est remise comme au début.");
  };

  const outils = saisie ? (
    <Releve nom="Volume lu sur la burette, à l'équivalence" unite="mL" annule={() => setSaisie(false)}
      valide={(v) => { agit({ g: "noter", v }); setSaisie(false); setMessage(`Volume noté pour l'équivalence : ${ml(v)}.`); son("bip"); }} />
  ) : courbe ? (
    <>
      <button type="button" className="btn btn-ligne" onClick={() => setCourbe(false)}>Revenir à la paillasse</button>
      <button type="button" className="btn btn-cuivre" onClick={() => { agit({ g: "noter", v: repere }); setCourbe(false); setMessage(`Volume noté pour l'équivalence : ${ml(repere)}.`); son("bip"); }}>Noter ce volume</button>
    </>
  ) : (
    <>
      <button type="button" className="btn btn-ligne" onClick={recommence}>Recommencer le titrage</button>
      {phmetre
        ? <button type="button" className="btn btn-ligne" disabled={etat.releves.length < 2} onClick={() => { setOuverture(0); setRepere(Math.round((etat.verse / 2) * 20) / 20); setCourbe(true); }}>Ouvrir la courbe</button>
        : <button type="button" className="btn btn-ligne" onClick={() => { setOuverture(0); setSaisie(true); }}>Noter le volume</button>}
    </>
  );

  return (
    <Etabli titre={phmetre ? "pH-métrie" : "Titrage"} protocole={protocole} message={message} attente={attente} fini={() => fini(gestes)} recommence={toutRecommencer} outils={outils} saisie={saisie}>
      {courbe ? <Courbe releves={etat.releves} repere={repere} place={setRepere} /> : (
        <Scene vue={saisie ? VUE_LOUPE : VUE} nom="La paillasse du titrage : une burette sur son support, un agitateur, les flacons et la verrerie">
          <Manipulation pose={poser}>
            {/* le support, la burette, son robinet et sa pointe */}
            <path className="pl-verre" d={`M 30 ${PLAQUE + 24} V 12 M 30 120 H ${BX - 8} M 30 240 H ${BX - 8}`} opacity={0.45} />
            <Burette x={BX} y={BURETTE.y} h={BURETTE.h} lecture={niveauBurette} couleur={INCOLORE} />
            <path className="pl-verre" d={`M ${BX - 6} ${BURETTE.y + BURETTE.h} L ${BX - 2.2} ${ROBINET - 8} V ${POINTE - 6} L ${BX - 1} ${POINTE} M ${BX + 6} ${BURETTE.y + BURETTE.h} L ${BX + 2.2} ${ROBINET - 8} V ${POINTE - 6} L ${BX + 1} ${POINTE}`} />
            <text x={BX - 16} y={ROBINET + 3} textAnchor="end">{ouverture === 0 ? "fermé" : ouverture <= AU_FILET ? "goutte à goutte" : "au filet"}</text>
            {/* le robinet : on pose le doigt dessus et on tourne ; au clavier, les flèches, « G » pour une goutte, « F » pour un millilitre au filet */}
            <Molette x={BX} y={ROBINET} r={26} valeur={ouverture} min={0} max={1} pas={0.05} de={90} a={180} change={tourneRobinet} nom="Robinet de la burette"
              texte={ouverture === 0 ? "fermé" : ouverture <= AU_FILET ? "ouvert, goutte à goutte" : "ouvert, au filet"}
              touches={(e) => {
                if (e.key === "g" || e.key === "G") { agit({ g: "couler", v: GOUTTE }); setChute((n) => n + 1); son("goutte"); }
                if (e.key === "f" || e.key === "F") agit({ g: "couler", v: 1, filet: true });
              }}
              dessin={(angle) => (
                <g transform={`translate(${BX} ${ROBINET})`}>
                  <g transform={`rotate(${angle})`}><rect x={-3} y={-25} width={6} height={25} rx={3} fill="var(--cuivre)" /><circle cy={-25} r={5.5} fill="var(--cuivre)" /></g>
                  <circle r={6.5} fill="var(--carte-2)" stroke="var(--encre)" strokeWidth={1.4} />
                </g>
              )} />
            {ouverture > AU_FILET && etat.volume > 0 && <Filet x={BX} y1={POINTE} y2={etat.dessous === "erlenmeyer" ? surface : etat.dessous === "poubelle" ? PLAQUE - 8 : PLAQUE} couleur="rgba(200, 220, 240, 0.8)" coule />}
            {ouverture > 0 && ouverture <= AU_FILET && <Goutte x={BX} y1={POINTE + 2} y2={etat.dessous === "erlenmeyer" ? surface : PLAQUE - 6} couleur="rgba(200, 220, 240, 0.95)" cle={chute} />}

            {/* l'agitateur magnétique et sa molette */}
            <rect x={48} y={PLAQUE} width={162} height={24} rx={5} fill="var(--carte-2)" stroke="var(--encre)" strokeWidth={1.2} />
            <text x={56} y={PLAQUE + 15}>agitateur</text>
            <Molette x={188} y={PLAQUE + 12} r={24} valeur={etat.agitation} min={0} max={5} pas={1} nom="Vitesse de l'agitateur" texte={etat.agitation === 0 ? "arrêté" : `vitesse ${etat.agitation}`}
              change={(v) => { agit({ g: "agiter", v }); setMessage(v === 0 ? "Agitateur arrêté." : etat.barreau && sousBurette ? "L'agitateur tourne : le mélange est homogène." : "L'agitateur tourne, mais il n'entraîne rien : il faut le barreau aimanté dans le récipient, posé dessus."); }} />

            {/* la loupe : la burette, ou la pipette quand on prélève */}
            {loupePipette
              ? <LoupeNiveau x={LOUPE.x} y={LOUPE.y} r={LOUPE.r} valeur={etat.dansPipette} pas={100} majeur={100} parUnite={110} monte repere={r.Va} couleur={INCOLORE} liquide={etat.dansPipette > 0} nom="Loupe sur la pipette, près du trait de jauge" />
              : <LoupeNiveau x={LOUPE.x} y={LOUPE.y} r={LOUPE.r} valeur={niveauBurette ?? CAPACITE} pas={0.1} majeur={1} parUnite={50} de={0} a={CAPACITE} couleur={INCOLORE} liquide={niveauBurette !== null} nom="Loupe sur la burette, près du niveau du liquide" />}
            <text x={LOUPE.x} y={LOUPE.y - LOUPE.r - 7} textAnchor="middle" className="pl-fort">{loupePipette ? "Loupe : la pipette" : niveauBurette !== null && niveauBurette < 0 ? "Loupe : au-dessus du zéro" : "Loupe : la burette"}</text>

            {/* le bécher de solution à titrer : il reste à sa place */}
            <Becher x={BECHER.x} y={BECHER.y} l={BECHER.l} h={BECHER.h} niveau={0.7} couleur={INCOLORE} />
            <text x={BECHER.x + BECHER.l / 2} y={BECHER.y + BECHER.h + 11} textAnchor="middle">{r.noms.titree}</text>

            {/* le pH-mètre */}
            {phmetre && <Afficheur x={232} y={PLAQUE - 2} l={120} h={28} nom="pH-mètre" unite="pH" eteint={!etat.sonde} valeur={sondeTrempe(r, etat) ? nombre(pHActuel(r, etat), 2) : "air"} />}

            {/* les cibles : où poser ce qu'on tient */}
            <Cible id="burette" nom="le haut de la burette" x={BX} y={BURETTE.y - 8} r={22} accepte={pose.soude ? [] : ["soude"]} />
            <Cible id="dessous" nom="l'agitateur, sous la burette" x={BX} y={PLAQUE - 40} r={34} accepte={etat.dessous === "rien" ? ["erlenmeyer", "poubelle"] : []} />
            <Cible id="becher" nom="le bécher de solution" x={BECHER.x + BECHER.l / 2} y={BECHER.y + 14} r={24} accepte={etat.pipette === "becher" ? [] : ["pipette"]} />
            <Cible id="vase" nom={vase === "bécher" ? "le bécher du titrage" : "l'erlenmeyer"} x={vaseX} y={vaseHaut + 6} r={30}
              accepte={outilsPossibles ? [...(etat.pipette === "erlenmeyer" ? [] : ["pipette"]), ...(pose.outil === "pissette" ? [] : ["pissette"]), ...(pose.outil === "compte" || phmetre ? [] : ["compte"]), ...(etat.barreau ? [] : ["barreau"]), ...(phmetre && !etat.sonde ? ["sonde"] : [])] : (etat.barreau ? [] : ["barreau"])} />
            {phmetre && !etat.sonde && <Cible id="sonde" nom="la sonde du pH-mètre, pour la rincer" x={REPOS.compte.x} y={REPOS.compte.y} r={22} accepte={["pissette"]} />}
            <Cible id="rangement-soude" nom="son rangement" x={REPOS.soude.x} y={REPOS.soude.y} r={26} accepte={pose.soude ? ["soude"] : []} />
            <Cible id="rangement-pipette" nom="son rangement" x={REPOS.pipette.x} y={REPOS.pipette.y} r={24} accepte={etat.pipette !== "repos" ? ["pipette"] : []} />
            <Cible id="rangement-pissette" nom="son rangement" x={REPOS.pissette.x} y={REPOS.pissette.y} r={22} accepte={pose.outil === "pissette" ? ["pissette"] : []} />
            <Cible id="rangement-compte" nom="son rangement" x={REPOS.compte.x} y={REPOS.compte.y} r={22} accepte={pose.outil === "compte" ? ["compte"] : etat.sonde ? ["sonde"] : []} />
            <Cible id="rangement-erlenmeyer" nom="la paillasse" x={REPOS.erlenmeyer.x} y={REPOS.erlenmeyer.y} r={32} accepte={sousBurette ? ["erlenmeyer"] : []} />
            <Cible id="rangement-poubelle" nom="la paillasse" x={REPOS.poubelle.x} y={REPOS.poubelle.y} r={26} accepte={etat.dessous === "poubelle" ? ["poubelle"] : []} />

            {/* le bécher poubelle */}
            <Objet id="poubelle" nom="Bécher poubelle" x={poubelleX} y={poubelleHaut + 22} l={52} h={50}>
              <Becher x={-23} y={-22} l={46} h={44} niveau={0.18} couleur={INCOLORE} />
              <text y={6} textAnchor="middle">poubelle</text>
            </Objet>

            {/* le récipient du titrage, avec ce qu'il contient */}
            <Objet id="erlenmeyer" nom={vase === "bécher" ? "Bécher du titrage" : "Erlenmeyer"} x={vaseX} y={vaseHaut + VASE.h / 2} l={VASE.l + 4} h={VASE.h + 4}>
              <g transform={`translate(${-vaseX} ${-(vaseHaut + VASE.h / 2)})`}>
                {phmetre
                  ? <Becher x={vaseX - VASE.l / 2 + 6} y={vaseHaut + 8} l={VASE.l - 12} h={VASE.h - 8} niveau={niveauVase} couleur={couleurVase} />
                  : <Erlenmeyer x={vaseX} y={vaseHaut} l={VASE.l} h={VASE.h} niveau={niveauVase} couleur={couleurVase} />}
                {eclat && (ouverture > AU_FILET
                  ? <ellipse cx={vaseX} cy={surface + 4} rx={9} ry={4} fill={TEINTES_INDICATEUR[r.indicateur].couleurs[1]} opacity={0.75} />
                  : <ellipse key={chute} className="pl-eclat" cx={vaseX} cy={surface + 4} rx={8} ry={3.5} fill={TEINTES_INDICATEUR[r.indicateur].couleurs[1]} style={{ animationDuration: `${Math.min(2.6, 0.3 + 1.1 / resteAvant).toFixed(2)}s` }} />)}
                {etat.barreau && <rect className={agite(etat) ? "pl-barreau pl-barreau-tourne" : "pl-barreau"} x={vaseX - 9} y={vaseHaut + VASE.h - 9} width={18} height={5} rx={2.5} fill="#F3ECE6" />}
                {etat.sonde && <path d={`M ${vaseX + 22} ${vaseHaut - 12} V ${vaseHaut + VASE.h - 22}`} stroke="var(--sable)" strokeWidth={5} strokeLinecap="round" />}
              </g>
            </Objet>

            {/* le barreau aimanté, dans sa coupelle */}
            {!etat.barreau && (
              <Objet id="barreau" nom="Barreau aimanté" x={REPOS.barreau.x} y={REPOS.barreau.y} l={48} h={26}>
                <path className="pl-verre" d="M -16 4 Q 0 12 16 4" />
                <rect x={-9} y={-3} width={18} height={5} rx={2.5} fill="#F3ECE6" />
              </Objet>
            )}

            {/* le flacon de solution titrante : sur l'étagère, ou penché au-dessus de la burette */}
            <Objet id="soude" nom={`Flacon de ${r.noms.titrante.toLowerCase()}`} x={pose.soude ? BX + 34 : REPOS.soude.x} y={pose.soude ? BURETTE.y - 34 : REPOS.soude.y} l={50} h={76}>
              <g transform={pose.soude ? "rotate(-112)" : undefined}><Flacon x={0} y={-36} l={46} h={72} couleur={INCOLORE} etiquette={r.noms.titrante} sous={`${nombre(r.Cb, 3)} mol/L`} /></g>
            </Objet>
            {pose.soude && (
              <>
                {jet === "soude" && <Filet x={BX} y1={BURETTE.y - 26} y2={BURETTE.y + 6} couleur="rgba(200, 220, 240, 0.8)" coule />}
                <Poussoir x={BX + 96} y={BURETTE.y - 34} nom="Verser dans la burette" texte="Verser"
                  maintien={{ debut: () => { reserve.current = 0; setJet("soude"); }, fin: () => setJet(null), tic: (dt) => debite("remplir", 5, dt), pas: () => agit({ g: "remplir", v: 1 }) }} />
              </>
            )}

            {/* la pipette jaugée et sa propipette */}
            <Objet id="pipette" nom="Pipette jaugée" x={pipetteIci.x} y={pipetteIci.y + 62} l={40} h={130}>
              <rect x={-4} y={-76} width={8} height={16} rx={3} fill="var(--brique)" />
              <PipetteJaugee x={0} y={-62} h={124} remplissage={etat.dansPipette / r.Va} couleur={INCOLORE} />
            </Objet>
            {etat.pipette === "becher" && (
              <>
                <Poussoir x={pipetteIci.x + 40} y={pipetteIci.y + 34} nom="Aspirer dans la pipette" texte="Aspirer"
                  maintien={{ debut: () => { reserve.current = 0; }, tic: (dt) => debite("aspirer", 1.6, dt), pas: () => agit({ g: "aspirer", v: 0.5 }) }} />
                <Poussoir x={pipetteIci.x + 40} y={pipetteIci.y + 84} nom="Laisser redescendre le liquide de la pipette" texte="Vider"
                  maintien={{ debut: () => { reserve.current = 0; }, tic: (dt) => debite("vider", 0.5, dt), pas: () => agit({ g: "vider", v: 0.05 }) }} />
              </>
            )}
            {etat.pipette === "erlenmeyer" && (
              <Poussoir x={pipetteIci.x + 40} y={pipetteIci.y + 70} nom="Vider la pipette dans le récipient" texte="Vider"
                maintien={{ debut: () => { reserve.current = 0; setJet("pipette"); }, fin: () => setJet(null), tic: (dt) => debite("vider", 4, dt), pas: () => agit({ g: "vider", v: 1 }) }} />
            )}

            {/* la pissette d'eau distillée */}
            <Objet id="pissette" nom="Pissette d'eau distillée" x={pose.outil === "pissette" ? vaseX + 40 : REPOS.pissette.x} y={pose.outil === "pissette" ? vaseHaut - 16 : REPOS.pissette.y} l={44} h={56}>
              <Pissette x={0} y={-26} l={30} h={52} />
            </Objet>
            {pose.outil === "pissette" && (
              <>
                {jet === "pissette" && <Filet x={vaseX + 12} y1={vaseHaut - 36} y2={surface} couleur="rgba(200, 220, 240, 0.8)" coule />}
                <Poussoir x={vaseX + 40} y={vaseHaut - 72} nom="Ajouter de l'eau distillée" texte="Eau"
                  maintien={{ debut: () => { reserve.current = 0; setJet("pissette"); }, fin: () => setJet(null), tic: (dt) => debite("eau", 8, dt), pas: () => agit({ g: "eau", v: 5 }) }} />
              </>
            )}

            {/* l'indicateur coloré, ou la sonde du pH-mètre */}
            {phmetre ? !etat.sonde && (
              <Objet id="sonde" nom="Sonde du pH-mètre" x={REPOS.compte.x} y={REPOS.compte.y} l={44} h={56}>
                <path d="M 0 -26 V 22" stroke="var(--sable)" strokeWidth={5} strokeLinecap="round" />
                <text y={-30} textAnchor="middle">{etat.sondeRincee ? "sonde rincée" : "sonde"}</text>
              </Objet>
            ) : (
              <Objet id="compte" nom={`Flacon compte-gouttes de ${TEINTES_INDICATEUR[r.indicateur].nom}`} x={pose.outil === "compte" ? vaseX : REPOS.compte.x} y={pose.outil === "compte" ? vaseHaut - 26 : REPOS.compte.y} l={44} h={52}>
                <CompteGouttes x={0} y={-22} l={26} h={44} couleur={TEINTES_INDICATEUR[r.indicateur].couleurs[1]} etiquette={r.indicateur === "bbt" ? "BBT" : "phénol."} />
              </Objet>
            )}
            {pose.outil === "compte" && (
              <Poussoir x={vaseX + 40} y={vaseHaut - 26} nom="Ajouter une goutte d'indicateur" texte="Goutte"
                appuie={() => { agit({ g: "goutte" }); setMessage(`${etat.gouttes + 1} goutte${etat.gouttes ? "s" : ""} de ${TEINTES_INDICATEUR[r.indicateur].nom}.`); son("goutte"); }} />
            )}
            {etat.sonde && (
              <Objet id="sonde" nom="Sonde du pH-mètre, dans le bécher" x={vaseX + 22} y={vaseHaut - 6} l={44} h={44}><rect x={-6} y={-14} width={12} height={12} rx={3} fill="var(--sable)" /></Objet>
            )}
          </Manipulation>
          <text x={352} y={VUE.y + 16} textAnchor="end">{etat.essais > 0 ? `titrage n° ${etat.essais + 1}` : ""}</text>
          <text x={8} y={VUE.y + VUE.h - 6} className="pl-fort">{etat.note !== null ? `Volume noté : ${ml(etat.note)}` : ""}</text>
          {etat.volume >= CAPACITE + AU_DESSUS && <text x={BX + 16} y={BURETTE.y + 4} className="pl-fort" style={{ fill: "var(--brique)" }}>pleine à ras bord</text>}
        </Scene>
      )}
    </Etabli>
  );
}
