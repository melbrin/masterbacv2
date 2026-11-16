"use client";

import { useState, useTransition } from "react";
import { demarrerTestAccueil } from "@/lib/serveur/commandes/test-accueil";

// Avant le test de la page d'accueil : le visiteur coche les chapitres qu'il a vus en classe. Le test porte sur eux.
export default function FormulaireChapitres({ chapitres, minutes }: { chapitres: { num: number; titre: string }[]; minutes: number }) {
  const [choisis, setChoisis] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [enCours, lance] = useTransition();
  const envoie = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    lance(async () => {
      const r = await demarrerTestAccueil({ fiches: choisis });
      if (!r.ok) setMessage(r.message);
    });
  };
  return (
    <form className="carte formulaire" onSubmit={envoie} noValidate>
      <fieldset className="champ"><legend>Les chapitres que tu as vus en classe</legend>
        <div style={{ display: "grid", gap: 4 }}>
          {chapitres.map((c) => (
            <label key={c.num} className="case"><span className="inter"><input type="checkbox" checked={choisis.includes(c.num)}
              onChange={(e) => setChoisis((x) => (e.target.checked ? [...x, c.num] : x.filter((n) => n !== c.num)))} /><span /></span>
              <span>{c.titre}</span></label>
          ))}
        </div></fieldset>
      <p className="petit discret" style={{ margin: "12px 0 0" }}>{choisis.length
        ? `Ton test : ${Math.min(15, choisis.length * 3)} questions, ${minutes} minutes au plus. Le temps démarre quand tu commences.`
        : "Coche au moins un chapitre."}</p>
      <p role="alert" className="petit" style={{ color: "var(--brique)", minHeight: "1.5em", margin: 0 }}>{message}</p>
      <div className="actions"><button className="btn btn-cuivre" type="submit" disabled={enCours || choisis.length === 0}>{enCours ? "Préparation…" : "Commencer le test"}</button></div>
    </form>
  );
}
