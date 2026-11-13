"use client";

import { useState, useTransition } from "react";

type Retour = { ok: true; valeur: unknown } | { ok: false; message: string };

/** Un bouton qui lance une action serveur déjà préparée, et affiche son refus s'il y en a un. */
export default function BoutonAction({ lancer, className = "btn btn-cuivre", children, confirmer }: { lancer: () => Promise<Retour>; className?: string; children: React.ReactNode; confirmer?: string }) {
  const [message, setMessage] = useState("");
  const [arme, setArme] = useState(false);
  const [enCours, lance] = useTransition();
  const clic = () => {
    if (confirmer && !arme) { setArme(true); return; }
    lance(async () => {
      const r = await lancer();
      if (!r.ok) setMessage(r.message);
    });
  };
  return (
    <>
      <button className={className} type="button" disabled={enCours} onClick={clic}>{arme && confirmer ? confirmer : children}</button>
      {message && <span role="alert" className="petit" style={{ color: "var(--brique)" }}>{message}</span>}
    </>
  );
}
