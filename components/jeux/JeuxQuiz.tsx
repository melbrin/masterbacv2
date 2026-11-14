"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import BoutonAction from "@/components/appli/BoutonAction";
import Icone from "@/components/appli/Icone";
import { terminerJeu } from "@/lib/serveur/commandes/jeux";
import { repondreQuiz } from "@/lib/serveur/commandes/quiz";

// Les trois jeux sur les questions de quiz : Contre la montre, Vrai ou faux, Dans l'ordre.
// Le navigateur ne connaît jamais la bonne réponse avant celle de l'élève : chaque réponse part au serveur,
// qui corrige, compte le score et écrit la partie. Le temps de « Contre la montre » se compte aussi sur le serveur.

interface Vue { type: "qcm" | "vrai_faux" | "trou" | "association" | "ordre"; niveau: number; q: string; choix?: string[]; elements?: string[] }
interface Fin { score: number; bonnes: number; total: number; record: number | null; battu: boolean }
type Retour = { ok: true; valeur: unknown } | { ok: false; message: string };
interface Props {
  session: string;
  rangInitial: number;
  /** la question en cours, ou rien si la partie est déjà finie */
  vueInitiale: Vue | null;
  justesInitiales: number;
  total: number;
  /** renseignée quand la partie était déjà finie au chargement de la page */
  finInitiale: Fin | null;
  /** lance une nouvelle partie du même jeu */
  rejouer: () => Promise<Retour>;
  retour: string;
}

function FinPartie({ fin, phrase, rejouer, retour }: { fin: Fin; phrase: string; rejouer: () => Promise<Retour>; retour: string }) {
  return (
    <section className="carte fete">
      <span className="medaille"><Icone nom="ok" /></span>
      <h2>{phrase}</h2>
      <div className="score-final" style={{ justifyContent: "center" }}><b className="chiffres">{fin.score}</b><span>{fin.score > 1 ? "points" : "point"}</span></div>
      <p role="status">{fin.bonnes} {fin.bonnes > 1 ? "bonnes réponses" : "bonne réponse"} sur {fin.total}.
        {fin.battu ? " Nouveau record !" : fin.record !== null ? ` Ton record : ${fin.record}.` : ""}</p>
      <p className="petit discret">Les questions ratées sont dans ton carnet d&apos;erreurs. Tu les reverras dans 2 jours.</p>
      <div className="actions"><BoutonAction lancer={rejouer}>Rejouer</BoutonAction><Link className="btn btn-ligne" href={retour}>Retour aux jeux</Link></div>
    </section>
  );
}

// ---- Contre la montre ----
export function JeuChrono({ session, rangInitial, vueInitiale, justesInitiales, finInitiale, rejouer, retour, limite, secondes }: Props & { limite: string; secondes: number }) {
  const [vue, setVue] = useState<Vue | null>(vueInitiale);
  const [rang, setRang] = useState(rangInitial);
  const [justes, setJustes] = useState(justesInitiales);
  const [serie, setSerie] = useState(0);
  const [flash, setFlash] = useState<{ juste: boolean; bonne: string } | null>(null);
  const [fin, setFin] = useState<Fin | null>(finInitiale);
  const [reste, setReste] = useState(secondes);
  const [message, setMessage] = useState("");
  const [enCours, lance] = useTransition();
  const attente = useRef<ReturnType<typeof setTimeout> | null>(null);
  // l'heure de fin affichée : trois secondes avant la limite du serveur, qui garde une marge pour la dernière réponse
  const echeance = Date.parse(limite) - 3000;
  const fini = fin !== null;

  useEffect(() => {
    if (fini) return;
    const id = setInterval(() => {
      const r = Math.max(0, Math.ceil((echeance - Date.now()) / 1000));
      setReste(r);
      if (r > 0) return;
      clearInterval(id);
      lance(async () => {
        const x = await terminerJeu({ session });
        if (x.ok) setFin(x.valeur); else setMessage(x.message);
      });
    }, 250);
    return () => clearInterval(id);
  }, [echeance, fini, session]);
  useEffect(() => () => { if (attente.current) clearTimeout(attente.current); }, []);

  const repond = (reponse: { type: "qcm"; choix: number } | { type: "vrai_faux"; valeur: boolean }) => {
    if (!vue || flash || fini) return;
    lance(async () => {
      const r = await repondreQuiz({ session, rang, reponse });
      if (!r.ok) { setMessage(r.message); return; }
      const v = r.valeur;
      if (v.partie) { setFin(v.partie); return; }
      setFlash({ juste: v.juste, bonne: v.bonneReponse });
      setJustes((n) => n + (v.juste ? 1 : 0));
      setSerie((n) => (v.juste ? n + 1 : 0));
      // une bonne réponse enchaîne vite ; une mauvaise laisse le temps de lire la bonne
      attente.current = setTimeout(() => { setFlash(null); setVue(v.suivante); setRang((x) => x + 1); }, v.juste ? 450 : 1400);
    });
  };

  if (fin) return <FinPartie fin={fin} phrase="Temps écoulé !" rejouer={rejouer} retour={retour} />;
  if (!vue) return <p className="vide">Cette partie est terminée.</p>;
  return (
    <div className="partie">
      <div className="partie-tete">
        <span className="partie-temps" role="timer" aria-label={`${reste} secondes restantes`}><Icone nom="horloge" taille={18} /> {reste} s</span>
        <span><b className="chiffres">{justes}</b> {justes > 1 ? "bonnes réponses" : "bonne réponse"}</span>
        {serie >= 3 && <span className="puce puce-serie"><Icone nom="flamme" />{serie} d&apos;affilée</span>}
      </div>
      <div className="partie-barre" aria-hidden="true"><i style={{ width: `${Math.min(100, (100 * reste) / secondes)}%` }} /></div>
      <section className={`carte partie-question ${flash ? (flash.juste ? "est-juste" : "est-faux") : ""}`} key={rang}>
        <p className="quiz-q">{vue.q}</p>
        <div className="options">
          {vue.type === "vrai_faux" ? (
            <>
              <button type="button" disabled={enCours || !!flash} onClick={() => repond({ type: "vrai_faux", valeur: true })}><span className="l">V</span><span>Vrai</span></button>
              <button type="button" disabled={enCours || !!flash} onClick={() => repond({ type: "vrai_faux", valeur: false })}><span className="l">F</span><span>Faux</span></button>
            </>
          ) : (vue.choix ?? []).map((c, j) => (
            <button key={j} type="button" disabled={enCours || !!flash} onClick={() => repond({ type: "qcm", choix: j })}><span className="l">{"ABCDEF"[j]}</span><span>{c}</span></button>
          ))}
        </div>
        <p className="partie-retour" role="status">{flash ? (flash.juste ? "Bonne réponse !" : `Ce n'est pas ça. La bonne réponse : ${flash.bonne}`) : ""}</p>
      </section>
      <p role="alert" className="petit" style={{ color: "var(--brique)", margin: 0 }}>{message}</p>
    </div>
  );
}

// ---- Vrai ou faux : l'affirmation part à droite (vrai) ou à gauche (faux) ----
export function JeuVraiFaux({ session, rangInitial, vueInitiale, justesInitiales, total, finInitiale, rejouer, retour }: Props) {
  const [vue, setVue] = useState<Vue | null>(vueInitiale);
  const [rang, setRang] = useState(rangInitial);
  const [justes, setJustes] = useState(justesInitiales);
  const [glisse, setGlisse] = useState(0);
  const [sortie, setSortie] = useState<"vrai" | "faux" | null>(null);
  const [res, setRes] = useState<{ juste: boolean; bonne: string; explication: string; suivante: Vue | null; fin: Fin | null } | null>(null);
  const [fin, setFin] = useState<Fin | null>(finInitiale);
  const [message, setMessage] = useState("");
  const [enCours, lance] = useTransition();
  const depart = useRef<number | null>(null);

  const repond = (valeur: boolean) => {
    if (!vue || res || enCours) return;
    setSortie(valeur ? "vrai" : "faux");
    lance(async () => {
      const r = await repondreQuiz({ session, rang, reponse: { type: "vrai_faux", valeur } });
      if (!r.ok) { setSortie(null); setGlisse(0); setMessage(r.message); return; }
      const v = r.valeur;
      setJustes((n) => n + (v.juste ? 1 : 0));
      setRes({ juste: v.juste, bonne: v.bonneReponse, explication: v.explication, suivante: v.suivante, fin: v.partie ?? null });
    });
  };
  const suivant = () => {
    if (!res) return;
    if (res.fin) { setFin(res.fin); return; }
    setVue(res.suivante); setRang((x) => x + 1); setRes(null); setSortie(null); setGlisse(0);
  };

  if (fin) return <FinPartie fin={fin} phrase={fin.bonnes === fin.total ? "Sans faute, bravo !" : "Partie terminée"} rejouer={rejouer} retour={retour} />;
  if (!vue) return <p className="vide">Cette partie est terminée.</p>;
  return (
    <div className="partie">
      <div className="partie-tete"><span>Affirmation {rang + 1} sur {total}</span><span><b className="chiffres">{justes}</b> {justes > 1 ? "bonnes réponses" : "bonne réponse"}</span></div>
      <div className="partie-barre" aria-hidden="true"><i style={{ width: `${(100 * (rang + (res ? 1 : 0))) / total}%` }} /></div>
      <div className="vf-zone">
        <section key={rang} className={`carte vf-carte ${sortie ? `part-${sortie}` : ""}`} style={sortie ? undefined : { transform: `translateX(${glisse}px) rotate(${glisse / 24}deg)` }}
          onPointerDown={(e) => { if (!res && !enCours) { depart.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId); } }}
          onPointerMove={(e) => { if (depart.current !== null) setGlisse(Math.max(-140, Math.min(140, e.clientX - depart.current))); }}
          onPointerUp={() => { if (depart.current === null) return; depart.current = null; if (glisse > 70) repond(true); else if (glisse < -70) repond(false); else setGlisse(0); }}
          onPointerCancel={() => { depart.current = null; setGlisse(0); }}>
          <p className="quiz-q" style={{ margin: 0 }}>{vue.q.replace(/^Affirmation\s*:\s*/i, "")}</p>
          {!res && <p className="petit discret" style={{ margin: "10px 0 0" }}>Fais glisser la carte à droite si c&apos;est vrai, à gauche si c&apos;est faux. Ou utilise les boutons.</p>}
        </section>
      </div>
      {!res ? (
        <div className="vf-boutons">
          <button type="button" className="btn vf-faux" disabled={enCours} onClick={() => repond(false)}><Icone nom="croix" />Faux</button>
          <button type="button" className="btn vf-vrai" disabled={enCours} onClick={() => repond(true)}><Icone nom="ok" />Vrai</button>
        </div>
      ) : (
        <div className={`retour-quiz apparait ${res.juste ? "bon" : "faux"}`} role="status">
          <b>{res.juste ? "Bonne réponse !" : "Ce n'est pas ça"}</b>
          {!res.juste && res.bonne && <span>La bonne réponse : {res.bonne}. </span>}{res.explication}
          <div className="actions" style={{ marginTop: 10 }}><button className="btn" type="button" onClick={suivant}>{res.fin ? "Voir mon score" : "Affirmation suivante"}<Icone nom="chevron" /></button></div>
        </div>
      )}
      <p role="alert" className="petit" style={{ color: "var(--brique)", margin: 0 }}>{message}</p>
    </div>
  );
}

// ---- Dans l'ordre : on touche deux étapes pour les échanger ----
function Etapes({ depart, fige, valider }: { depart: string[]; fige: boolean; valider: (ordre: string[]) => void }) {
  const [ordre, setOrdre] = useState<string[]>(depart);
  const [prise, setPrise] = useState<number | null>(null);
  const echange = (a: number, b: number) => setOrdre((o) => { const n = o.slice(); [n[a], n[b]] = [n[b], n[a]]; return n; });
  const touche = (j: number) => {
    if (fige) return;
    if (prise === null) setPrise(j);
    else { if (prise !== j) echange(prise, j); setPrise(null); }
  };
  return (
    <>
      <ol className="ordre-jeu">
        {ordre.map((e, j) => (
          <li key={e} className={prise === j ? "prise" : ""}>
            <button type="button" className="ordre-etape" disabled={fige} aria-pressed={prise === j} onClick={() => touche(j)}><span className="num">{j + 1}</span><span>{e}</span></button>
            <span className="fl">
              <button type="button" aria-label="Monter" disabled={fige || j === 0} onClick={() => { echange(j, j - 1); setPrise(null); }}>↑</button>
              <button type="button" aria-label="Descendre" disabled={fige || j === ordre.length - 1} onClick={() => { echange(j, j + 1); setPrise(null); }}>↓</button>
            </span>
          </li>
        ))}
      </ol>
      {!fige && <div className="actions"><button className="btn btn-cuivre" type="button" onClick={() => valider(ordre)}>Valider l&apos;ordre</button></div>}
    </>
  );
}

export function JeuOrdre({ session, rangInitial, vueInitiale, justesInitiales, total, finInitiale, rejouer, retour }: Props) {
  const [vue, setVue] = useState<Vue | null>(vueInitiale);
  const [rang, setRang] = useState(rangInitial);
  const [justes, setJustes] = useState(justesInitiales);
  const [res, setRes] = useState<{ juste: boolean; bonne: string; suivante: Vue | null; fin: Fin | null } | null>(null);
  const [fin, setFin] = useState<Fin | null>(finInitiale);
  const [message, setMessage] = useState("");
  const [enCours, lance] = useTransition();

  const valide = (elements: string[]) => lance(async () => {
    const r = await repondreQuiz({ session, rang, reponse: { type: "ordre", elements } });
    if (!r.ok) { setMessage(r.message); return; }
    const v = r.valeur;
    setJustes((n) => n + (v.juste ? 1 : 0));
    setRes({ juste: v.juste, bonne: v.bonneReponse, suivante: v.suivante, fin: v.partie ?? null });
  });
  const suivant = () => {
    if (!res) return;
    if (res.fin) { setFin(res.fin); return; }
    setVue(res.suivante); setRang((x) => x + 1); setRes(null);
  };

  if (fin) return <FinPartie fin={fin} phrase={fin.bonnes === fin.total ? "Tout est dans l'ordre, bravo !" : "Partie terminée"} rejouer={rejouer} retour={retour} />;
  if (!vue) return <p className="vide">Cette partie est terminée.</p>;
  return (
    <div className="partie">
      <div className="partie-tete"><span>Méthode {rang + 1} sur {total}</span><span><b className="chiffres">{justes}</b> {justes > 1 ? "réussies" : "réussie"}</span></div>
      <div className="partie-barre" aria-hidden="true"><i style={{ width: `${(100 * (rang + (res ? 1 : 0))) / total}%` }} /></div>
      <section className="carte">
        <p className="quiz-q">{vue.q}</p>
        <p className="petit discret">Touche une étape, puis une autre : elles échangent leur place. Tu peux aussi utiliser les flèches.</p>
        <Etapes key={rang} depart={vue.elements ?? []} fige={enCours || res !== null} valider={valide} />
        {res && (
          <div className={`retour-quiz apparait ${res.juste ? "bon" : "faux"}`} role="status" style={{ marginTop: 12 }}>
            <b>{res.juste ? "C'est le bon ordre !" : "Ce n'est pas le bon ordre"}</b>
            {!res.juste && res.bonne && <span>Le bon ordre : {res.bonne}</span>}
            <div className="actions" style={{ marginTop: 10 }}><button className="btn" type="button" onClick={suivant}>{res.fin ? "Voir mon score" : "Méthode suivante"}<Icone nom="chevron" /></button></div>
          </div>
        )}
      </section>
      <p role="alert" className="petit" style={{ color: "var(--brique)", margin: 0 }}>{message}</p>
    </div>
  );
}
