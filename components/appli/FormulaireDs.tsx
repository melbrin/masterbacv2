"use client";

import { useState, useTransition } from "react";
import { creerDs } from "@/lib/serveur/commandes/ds";

interface Props { fiches: { num: number; titre: string; vu: boolean }[]; aujourdhui: string; objectif: 10 | 14 | 18; offerte: boolean }
const FORMATS = { express: "Express : une séance de 20 minutes", "trois-jours": "Trois jours : 3 séances de 30 minutes", semaine: "Une semaine : 5 séances, un DS blanc, puis l'essentiel la veille" };
const ecart = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

export default function FormulaireDs({ fiches, aujourdhui, objectif, offerte }: Props) {
  const [jour, setJour] = useState("");
  const [duree, setDuree] = useState<1 | 2 | 4>(2);
  const [vise, setVise] = useState(objectif);
  const [choisies, setChoisies] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [enCours, lance] = useTransition();
  const dans = jour ? ecart(aujourdhui, jour) : null;
  const format = dans === null || dans < 0 ? null : dans <= 1 ? "express" : dans <= 6 ? "trois-jours" : "semaine";
  const envoie = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    lance(async () => {
      const r = await creerDs({ jourDevoir: jour, duree, objectif: vise, fiches: choisies });
      if (!r.ok) setMessage(r.message);
    });
  };
  return (
    <form className="carte" onSubmit={envoie} noValidate>
      <div className="champ"><label htmlFor="jour">La date du devoir</label>
        <input id="jour" type="date" min={aujourdhui} required value={jour} onChange={(e) => setJour(e.target.value)} />
        <p className="aide">La veille ou le jour même : une séance de 20 minutes. De 2 à 6 jours avant : 3 séances. À partir de 7 jours avant : 5 séances, un DS blanc, puis l&apos;essentiel la veille.</p></div>
      <fieldset className="champ"><legend>Sa durée</legend>
        <div className="segments" role="radiogroup">{([1, 2, 4] as const).map((d) => <button key={d} type="button" role="radio" aria-checked={duree === d} onClick={() => setDuree(d)}>{d} h</button>)}</div></fieldset>
      <fieldset className="champ"><legend>La note que tu vises</legend>
        <div className="segments" role="radiogroup">{([10, 14, 18] as const).map((n) => <button key={n} type="button" role="radio" aria-checked={vise === n} onClick={() => setVise(n)}>Viser {n}</button>)}</div></fieldset>
      <fieldset className="champ"><legend>Les chapitres du devoir</legend>
        <div style={{ display: "grid", gap: 4 }}>
          {fiches.map((f) => (
            <label key={f.num} className="case"><span className="inter"><input type="checkbox" checked={choisies.includes(f.num)}
              onChange={(e) => setChoisies((c) => (e.target.checked ? [...c, f.num] : c.filter((x) => x !== f.num)))} /><span /></span>
              <span>Fiche {f.num} · {f.titre}{f.vu && <span className="puce puce-bleu" style={{ marginLeft: 8 }}>Vu en classe</span>}</span></label>
          ))}
        </div></fieldset>
      {format && <p className="carte" style={{ marginTop: 12, background: "var(--carte-2)" }}><b>Format retenu.</b> {FORMATS[format]}.</p>}
      {offerte && <p className="petit discret">C&apos;est ta préparation offerte : tous les corrigés de ce plan seront ouverts jusqu&apos;au lendemain du devoir.</p>}
      <p role="alert" className="petit" style={{ color: "var(--brique)", minHeight: "1.5em" }}>{message}</p>
      <div className="actions"><button className="btn btn-cuivre" type="submit" disabled={enCours || !format || choisies.length === 0 || choisies.length > 6}>{enCours ? "Construction…" : "Construire mon plan"}</button></div>
    </form>
  );
}
