"use client";

import { useState, useTransition } from "react";

type Retour = { ok: true; valeur: unknown } | { ok: false; message: string };

/** Efface ce que l'élève a gardé sur cet appareil : ses programmes du hub Python. Sert à la déconnexion. */
function oublieAppareil() {
  try {
    const cles: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const cle = window.localStorage.key(i);
      if (cle?.startsWith("mb-python:")) cles.push(cle);
    }
    cles.forEach((cle) => window.localStorage.removeItem(cle));
  } catch { /* sans stockage, il n'y a rien à effacer */ }
}

/**
 * Un bouton qui lance une action serveur déjà préparée, et affiche son refus s'il y en a un.
 * `oublier` efface d'abord ce que l'élève a gardé sur l'appareil : pour la déconnexion.
 */
export default function BoutonAction({ lancer, className = "btn btn-cuivre", children, confirmer, oublier }: { lancer: () => Promise<Retour>; className?: string; children: React.ReactNode; confirmer?: string; oublier?: boolean }) {
  const [message, setMessage] = useState("");
  const [arme, setArme] = useState(false);
  const [enCours, lance] = useTransition();
  const clic = () => {
    if (confirmer && !arme) { setArme(true); return; }
    lance(async () => {
      if (oublier) oublieAppareil();
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
