"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { noterDs } from "@/lib/serveur/commandes/ds";

const versNombre = (t: string) => Number(t.replace(",", "."));

export default function NoterDs({ id }: { id: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [moyenne, setMoyenne] = useState("");
  const [message, setMessage] = useState("");
  const [enCours, lance] = useTransition();
  const envoie = (e: React.FormEvent) => {
    e.preventDefault();
    const n = versNombre(note);
    const mo = moyenne.trim() ? versNombre(moyenne) : null;
    if (!(n >= 0 && n <= 20) || (mo !== null && !(mo >= 0 && mo <= 20))) { setMessage("Entre une note entre 0 et 20."); return; }
    lance(async () => {
      const r = await noterDs({ id, note: n, moyenneClasse: mo });
      if (r.ok) router.refresh();
      else setMessage(r.message);
    });
  };
  return (
    <form className="actions" onSubmit={envoie} noValidate>
      <div className="champ" style={{ maxWidth: 150 }}><label htmlFor={`note-${id}`}>Note sur 20</label>
        <input id={`note-${id}`} inputMode="decimal" placeholder="13,5" value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <div className="champ" style={{ maxWidth: 190 }}><label htmlFor={`moy-${id}`}>Moyenne de la classe, si tu la connais</label>
        <input id={`moy-${id}`} inputMode="decimal" placeholder="11" value={moyenne} onChange={(e) => setMoyenne(e.target.value)} /></div>
      <button className="btn" type="submit" style={{ alignSelf: "end" }} disabled={enCours}>Valider ma note</button>
      <p role="alert" className="petit" style={{ color: "var(--brique)", flexBasis: "100%", margin: 0 }}>{message}</p>
    </form>
  );
}
