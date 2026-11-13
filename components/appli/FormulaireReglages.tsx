"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { changerProfil } from "@/lib/serveur/commandes/profil";

export default function FormulaireReglages({ prenom: p, noteVisee: n, rappels: r }: { prenom: string; noteVisee: 10 | 14 | 18; rappels: boolean }) {
  const router = useRouter();
  const [prenom, setPrenom] = useState(p);
  const [noteVisee, setNoteVisee] = useState(n);
  const [rappels, setRappels] = useState(r);
  const [message, setMessage] = useState("");
  const [enCours, lance] = useTransition();
  return (
    <form className="carte" noValidate onSubmit={(e) => {
      e.preventDefault();
      lance(async () => {
        const res = await changerProfil({ prenom, noteVisee, rappels });
        setMessage(res.ok ? "Enregistré." : res.message);
        if (res.ok) router.refresh();
      });
    }}>
      <div className="champ"><label htmlFor="prenom">Ton prénom</label><input id="prenom" maxLength={40} value={prenom} onChange={(e) => setPrenom(e.target.value)} /></div>
      <fieldset className="champ"><legend>La note que tu vises</legend>
        <div className="segments" role="radiogroup">{([10, 14, 18] as const).map((x) => <button key={x} type="button" role="radio" aria-checked={noteVisee === x} onClick={() => setNoteVisee(x)}>Viser {x}</button>)}</div></fieldset>
      <label className="case"><span className="inter"><input type="checkbox" checked={rappels} onChange={(e) => setRappels(e.target.checked)} /><span /></span><span>Recevoir un e-mail de rappel pour chaque séance d&apos;un plan de DS</span></label>
      <p role="status" className="petit discret" style={{ minHeight: "1.5em" }}>{message}</p>
      <div className="actions"><button className="btn btn-cuivre" type="submit" disabled={enCours || !prenom.trim()}>Enregistrer</button></div>
    </form>
  );
}
