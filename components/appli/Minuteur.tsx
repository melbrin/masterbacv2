"use client";

import { useEffect, useState } from "react";

const affiche = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/**
 * Un compte à rebours pour travailler dans les conditions du devoir. C'est un confort : il ne note rien,
 * et il tient l'heure même si l'onglet passe à l'arrière-plan, parce qu'il se cale sur l'instant de fin.
 */
export default function Minuteur({ minutes }: { minutes: number }) {
  const [reste, setReste] = useState(minutes * 60);
  const [fin, setFin] = useState<number | null>(null);
  useEffect(() => {
    if (fin === null) return;
    const id = setInterval(() => {
      const r = Math.max(0, Math.round((fin - Date.now()) / 1000));
      setReste(r);
      if (r === 0) setFin(null);
    }, 500);
    return () => clearInterval(id);
  }, [fin]);
  const termine = reste === 0;
  const commence = reste < minutes * 60;
  return (
    <div className="chrono" role="timer" aria-label="Minuteur">
      <span className="t">{affiche(reste)}</span>
      <button type="button" disabled={termine} onClick={() => setFin(fin === null ? Date.now() + reste * 1000 : null)}>
        {termine ? "Terminé" : fin !== null ? "Pause" : commence ? "Reprendre" : "Démarrer"}
      </button>
      <span className="sr" role="status">{termine ? "Temps écoulé : pose ton stylo." : ""}</span>
    </div>
  );
}
