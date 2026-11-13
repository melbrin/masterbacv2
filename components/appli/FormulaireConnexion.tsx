"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { demanderCode, verifierCode } from "@/lib/serveur/commandes/compte";

export default function FormulaireConnexion() {
  const router = useRouter();
  const [etape, setEtape] = useState<"adresse" | "code">("adresse");
  const [adresse, setAdresse] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [enCours, lance] = useTransition();

  const envoie = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    lance(async () => {
      const r = await demanderCode({ adresse });
      if (r.ok) setEtape("code");
      else setMessage(r.message);
    });
  };
  const verifie = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    lance(async () => {
      const r = await verifierCode({ adresse, code });
      if (r.ok) router.replace(r.valeur.suite);
      else setMessage(r.message);
    });
  };

  if (etape === "adresse") {
    return (
      <form onSubmit={envoie} noValidate>
        <div className="champ">
          <label htmlFor="adresse">Ton adresse e-mail</label>
          <input id="adresse" type="email" inputMode="email" autoComplete="email" required maxLength={254} value={adresse} onChange={(e) => setAdresse(e.target.value)} />
          <p className="aide">Pas de mot de passe : tu reçois un code à six chiffres, valable dix minutes.</p>
        </div>
        <p role="alert" className="petit" style={{ color: "var(--brique)", minHeight: "1.5em" }}>{message}</p>
        <div className="actions">
          <button className="btn btn-cuivre" type="submit" disabled={enCours || !adresse}>{enCours ? "Envoi…" : "Recevoir mon code"}</button>
        </div>
      </form>
    );
  }
  return (
    <form onSubmit={verifie} noValidate>
      <p>Si cette adresse peut recevoir un code, il vient de partir vers <b>{adresse}</b>.</p>
      <div className="champ">
        <label htmlFor="code">Le code à six chiffres</label>
        <input id="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} style={{ letterSpacing: ".4em", fontSize: "1.3rem" }} />
      </div>
      <p role="alert" className="petit" style={{ color: "var(--brique)", minHeight: "1.5em" }}>{message}</p>
      <div className="actions">
        <button className="btn btn-cuivre" type="submit" disabled={enCours || code.length !== 6}>{enCours ? "Vérification…" : "Me connecter"}</button>
        <button className="btn btn-ligne" type="button" onClick={() => { setEtape("adresse"); setCode(""); setMessage(""); }}>Changer d&apos;adresse</button>
      </div>
    </form>
  );
}
