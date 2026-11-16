"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { saisieDeTrou } from "@/lib/commun/quiz";
import { repondreQuiz, type RetourQuiz } from "@/lib/serveur/commandes/quiz";
import Icone from "./Icone";

export interface Vue { type: "qcm" | "vrai_faux" | "trou" | "association" | "ordre"; niveau: number; q: string; choix?: string[]; gauches?: string[]; droites?: string[]; elements?: string[] }
export type Reponse =
  | { type: "qcm"; choix: number } | { type: "vrai_faux"; valeur: boolean } | { type: "trou"; texte: string }
  | { type: "association"; droites: string[] } | { type: "ordre"; elements: string[] };
/** Les signes des formules qu'un clavier de téléphone n'a pas sous la main, avec leur nom pour un lecteur d'écran. */
const SYMBOLES: [string, string][] = [["×", "Multiplié par"], ["λ", "Lambda"], ["ν", "Nu"], ["Δ", "Delta"], ["Σ", "Sigma"], ["π", "Pi"]];
const NOMS = { qcm: "QCM", vrai_faux: "Vrai ou faux", trou: "Texte à trous", association: "Association", ordre: "Mise en ordre" };

export function Question({ vue, fige, envoie, choisi }: { vue: Vue; fige: boolean; envoie: (r: Reponse) => void; choisi: number | boolean | null }) {
  const [texte, setTexte] = useState("");
  const [exposant, setExposant] = useState(false);
  const champ = useRef<HTMLInputElement>(null);
  const [assoc, setAssoc] = useState<string[]>(() => (vue.gauches ?? []).map(() => ""));
  const [ordre, setOrdre] = useState<string[]>(() => vue.elements ?? []);
  if (vue.type === "qcm") {
    return <div className="options">{(vue.choix ?? []).map((c, j) => (
      <button key={j} type="button" disabled={fige} className={choisi === j ? "choisi" : ""} onClick={() => envoie({ type: "qcm", choix: j })}><span className="l">{"ABCDEF"[j]}</span><span>{c}</span></button>
    ))}</div>;
  }
  if (vue.type === "vrai_faux") {
    return <div className="options">
      <button type="button" disabled={fige} className={choisi === true ? "choisi" : ""} onClick={() => envoie({ type: "vrai_faux", valeur: true })}><span className="l">V</span><span>Vrai</span></button>
      <button type="button" disabled={fige} className={choisi === false ? "choisi" : ""} onClick={() => envoie({ type: "vrai_faux", valeur: false })}><span className="l">F</span><span>Faux</span></button>
    </div>;
  }
  if (vue.type === "trou") {
    // les symboles qu'un clavier de téléphone n'a pas : un exposant comme dans 10⁻¹⁴, et les lettres des formules
    const ajoute = (signe: string) => { setExposant(false); setTexte((t) => (t + signe).slice(0, 120)); champ.current?.focus(); };
    return <form className="champ" onSubmit={(e) => { e.preventDefault(); if (texte.trim()) envoie({ type: "trou", texte }); }}>
      <label htmlFor="rep-trou">Ta réponse</label>
      <input id="rep-trou" ref={champ} autoComplete="off" autoCapitalize="off" spellCheck={false} maxLength={120} disabled={fige} value={texte} aria-describedby="aide-trou"
        onChange={(e) => { const r = saisieDeTrou(texte, e.target.value, exposant); setTexte(r.texte); setExposant(r.exposant); }} />
      <div className="touches-trou" role="group" aria-label="Symboles">
        <button type="button" disabled={fige} aria-pressed={exposant} aria-label="Exposant" onClick={() => { setExposant((x) => !x); champ.current?.focus(); }}>x<sup>n</sup></button>
        {SYMBOLES.map(([signe, nom]) => <button key={signe} type="button" disabled={fige} aria-label={nom} onClick={() => ajoute(signe)}>{signe}</button>)}
      </div>
      <p className="aide" id="aide-trou">{exposant ? "Exposant en cours : tape ses chiffres, puis touche xⁿ pour en sortir." : "Pour une puissance comme 10⁻¹⁴ : tape 10, touche xⁿ, puis tape −14."}</p>
      <div className="actions"><button className="btn" type="submit" disabled={fige || !texte.trim()}>Valider</button></div>
    </form>;
  }
  if (vue.type === "association") {
    return <>
      <div className="assoc">{(vue.gauches ?? []).map((g, j) => (
        <div className="paire" key={j}><label htmlFor={`as-${j}`}>{g}</label>
          <select id={`as-${j}`} disabled={fige} value={assoc[j]} onChange={(e) => setAssoc((a) => a.map((x, k) => (k === j ? e.target.value : x)))}>
            <option value="">Choisir…</option>{(vue.droites ?? []).map((d) => <option key={d}>{d}</option>)}
          </select></div>
      ))}</div>
      <div className="actions" style={{ marginTop: 12 }}><button className="btn" type="button" disabled={fige || assoc.some((a) => !a)} onClick={() => envoie({ type: "association", droites: assoc })}>Valider</button></div>
    </>;
  }
  const bouge = (j: number, sens: number) => setOrdre((o) => { const n = o.slice(); [n[j], n[j + sens]] = [n[j + sens], n[j]]; return n; });
  return <>
    <ol className="ordre-liste">{ordre.map((e, j) => (
      <li key={e}><span>{e}</span><span className="fl">
        <button type="button" aria-label="Monter" disabled={fige || j === 0} onClick={() => bouge(j, -1)}>↑</button>
        <button type="button" aria-label="Descendre" disabled={fige || j === ordre.length - 1} onClick={() => bouge(j, 1)}>↓</button></span></li>
    ))}</ol>
    <div className="actions" style={{ marginTop: 12 }}><button className="btn" type="button" disabled={fige} onClick={() => envoie({ type: "ordre", elements: ordre })}>Valider l&apos;ordre</button></div>
  </>;
}

// Le joueur reste affiché du début à la fin, résultat compris : après la dernière réponse, la page se recharge
// (le quiz est terminé côté serveur), et la correction de cette dernière question doit rester à l'écran.
export default function QuizJoueur({ session, total, rangInitial, vueInitiale, bonnesInitiales, retour, libelleRetour = "Continuer", limite }: {
  session: string; total: number; rangInitial: number;
  /** la question en cours, ou rien si le quiz est déjà terminé */
  vueInitiale: Vue | null;
  bonnesInitiales: number;
  retour: string; libelleRetour?: string; limite: string | null;
}) {
  const [rang, setRang] = useState(rangInitial);
  const [vue, setVue] = useState<Vue | null>(vueInitiale);
  const [res, setRes] = useState<RetourQuiz | null>(null);
  const [choisi, setChoisi] = useState<number | boolean | null>(null);
  const [bilan, setBilan] = useState<RetourQuiz["bilan"]>(vueInitiale ? null : { bonnes: bonnesInitiales, total, passage: null });
  const [message, setMessage] = useState("");
  const [enCours, lance] = useTransition();

  const envoie = (reponse: Reponse) => {
    setChoisi(reponse.type === "qcm" ? reponse.choix : reponse.type === "vrai_faux" ? reponse.valeur : null);
    lance(async () => {
      const r = await repondreQuiz({ session, rang, reponse });
      if (r.ok) setRes(r.valeur); else setMessage(r.message);
    });
  };
  const suivant = () => {
    if (!res) return;
    if (res.suivante) { setVue(res.suivante); setRang((x) => x + 1); setRes(null); setChoisi(null); }
    else setBilan(res.bilan);
  };

  if (bilan || !vue) {
    const b = bilan ?? { bonnes: bonnesInitiales, total, passage: null };
    return (
      <div className="carte apparait">
        <div className="score-final"><b className="chiffres">{b.bonnes}/{b.total}</b><span>{b.bonnes > 1 ? "bonnes réponses" : "bonne réponse"}</span></div>
        {b.passage === "reussi" && <p><b>Test de passage réussi, bravo !</b> Tu as atteint cet objectif.</p>}
        {b.passage === "rate" && <p>Il faut 70 % de bonnes réponses pour réussir ce test. Reprends les questions ratées, puis recommence.</p>}
        {b.passage === null && <p>{b.bonnes === b.total ? "Tout est juste, bravo !" : "Tu reverras les questions ratées dans 2 jours, dans ton carnet d'erreurs."}</p>}
        <div className="actions"><Link className="btn btn-cuivre" href={retour}>{libelleRetour}</Link></div>
      </div>
    );
  }
  return (
    <div id="quiz">
      <div className="progression-q"><span>Question {rang + 1} sur {total}</span><div className="barre"><i style={{ width: `${(100 * (rang + (res ? 1 : 0))) / total}%` }} /></div>
        {limite && <span className="petit discret">Fin du test à {new Date(limite).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>}</div>
      <div className="carte">
        <div className="meta" style={{ marginTop: 0 }}><span className={`niv niv-${vue.niveau}`}>Objectif {vue.niveau}</span><span>{NOMS[vue.type]}</span></div>
        <p className="quiz-q">{vue.q}</p>
        <Question key={rang} vue={vue} fige={enCours || res !== null} envoie={envoie} choisi={choisi} />
        <p role="alert" className="petit" style={{ color: "var(--brique)", margin: 0 }}>{message}</p>
        {res && (
          <>
            <div className={`retour-quiz apparait ${res.juste ? "bon" : "faux"}`} role="status">
              <b>{res.juste ? "Bonne réponse" : "Ce n'est pas ça"}</b>
              {!res.juste && res.bonneReponse && <span>La bonne réponse : {res.bonneReponse}. </span>}
              {res.explication}
            </div>
            <div className="actions" style={{ marginTop: 12 }}><button className="btn" type="button" onClick={suivant}>{res.suivante ? "Question suivante" : "Voir mon résultat"}<Icone nom="chevron" /></button></div>
          </>
        )}
      </div>
    </div>
  );
}
