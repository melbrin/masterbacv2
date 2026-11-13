"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { creerProfil } from "@/lib/serveur/commandes/compte";

export default function FormulaireProfil() {
  const router = useRouter();
  const [prenom, setPrenom] = useState("");
  const [classe, setClasse] = useState<"terminale" | "premiere">("terminale");
  const [noteVisee, setNoteVisee] = useState<10 | 14 | 18>(14);
  const [age, setAge] = useState<"" | "oui" | "non">("");
  const [message, setMessage] = useState("");
  const [enCours, lance] = useTransition();

  const envoie = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    lance(async () => {
      const r = await creerProfil({ prenom, classe, noteVisee, quinzeAnsOuPlus: age === "oui" });
      if (r.ok) router.replace(r.valeur.suite);
      else setMessage(r.message);
    });
  };

  return (
    <form onSubmit={envoie} noValidate>
      <div className="champ">
        <label htmlFor="prenom">Ton prénom</label>
        <input id="prenom" type="text" autoComplete="given-name" maxLength={40} required value={prenom} onChange={(e) => setPrenom(e.target.value)} />
        <p className="aide">Seulement ton prénom : ni nom de famille, ni date de naissance, ni établissement.</p>
      </div>
      <div className="champ">
        <label htmlFor="classe">Ta classe</label>
        <select id="classe" value={classe} onChange={(e) => setClasse(e.target.value as "terminale" | "premiere")}>
          <option value="terminale">Terminale</option>
          <option value="premiere">Première</option>
        </select>
      </div>
      <fieldset className="champ">
        <legend>La note que tu vises</legend>
        <div className="segments" role="radiogroup">
          {([10, 14, 18] as const).map((n) => (
            <button key={n} type="button" role="radio" aria-checked={noteVisee === n} className={noteVisee === n ? "actif" : ""} onClick={() => setNoteVisee(n)}>Viser {n}</button>
          ))}
        </div>
      </fieldset>
      <fieldset className="champ">
        <legend>As-tu 15 ans ou plus ?</legend>
        <div className="segments" role="radiogroup">
          <button type="button" role="radio" aria-checked={age === "oui"} className={age === "oui" ? "actif" : ""} onClick={() => setAge("oui")}>Oui</button>
          <button type="button" role="radio" aria-checked={age === "non"} className={age === "non" ? "actif" : ""} onClick={() => setAge("non")}>Non</button>
        </div>
        {age === "non" && <p className="aide">Avant 15 ans, il faut l&apos;accord d&apos;un parent. En attendant, ton compte donne accès au test de niveau seulement.</p>}
      </fieldset>
      <p role="alert" className="petit" style={{ color: "var(--brique)", minHeight: "1.5em" }}>{message}</p>
      <div className="actions">
        <button className="btn btn-cuivre" type="submit" disabled={enCours || !prenom.trim() || !age}>{enCours ? "Création…" : "Créer mon compte"}</button>
      </div>
    </form>
  );
}
