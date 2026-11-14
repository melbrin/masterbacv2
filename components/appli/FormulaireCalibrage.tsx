"use client";

import { useState, useTransition } from "react";
import { demarrerCalibrage } from "@/lib/serveur/commandes/calibrage";

interface Props { fiches: { num: number; titre: string; vu: boolean; questions: number }[] }

// Avant le test de calibrage : l'élève coche les chapitres qu'il a vus en classe. Le test porte sur eux.
export default function FormulaireCalibrage({ fiches }: Props) {
  const [choisies, setChoisies] = useState<number[]>(() => fiches.filter((f) => f.vu && f.questions > 0).map((f) => f.num));
  const [message, setMessage] = useState("");
  const [enCours, lance] = useTransition();
  const questions = Math.min(15, choisies.length * 3);
  const envoie = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    lance(async () => {
      const r = await demarrerCalibrage({ fiches: choisies });
      if (!r.ok) setMessage(r.message);
    });
  };
  return (
    <form className="carte formulaire" onSubmit={envoie} noValidate>
      <fieldset className="champ"><legend>Les chapitres que tu as vus en classe</legend>
        <div style={{ display: "grid", gap: 4 }}>
          {fiches.map((f) => (
            <label key={f.num} className="case"><span className="inter"><input type="checkbox" disabled={f.questions === 0} checked={choisies.includes(f.num)}
              onChange={(e) => setChoisies((c) => (e.target.checked ? [...c, f.num] : c.filter((x) => x !== f.num)))} /><span /></span>
              <span>Fiche {f.num} · {f.titre}{f.questions === 0 && <span className="petit discret"> (pas encore de question pour le test)</span>}</span></label>
          ))}
        </div></fieldset>
      <p className="petit discret" style={{ margin: "12px 0 0" }}>{choisies.length
        ? `Ton test : environ ${questions} questions, une dizaine de minutes. Tu peux t'arrêter et le reprendre dans la journée.`
        : "Coche au moins un chapitre."}</p>
      <p role="alert" className="petit" style={{ color: "var(--brique)", minHeight: "1.5em", margin: 0 }}>{message}</p>
      <div className="actions"><button className="btn btn-cuivre" type="submit" disabled={enCours || choisies.length === 0}>{enCours ? "Préparation…" : "Commencer le test"}</button></div>
    </form>
  );
}
