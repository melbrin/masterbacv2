"use client";

import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore, useTransition } from "react";
import { numeroDeSuivi } from "@/lib/commun/pannes";

/** Prévient quand le navigateur perd ou retrouve sa connexion. */
function abonne(rappel: () => void) {
  window.addEventListener("online", rappel);
  window.addEventListener("offline", rappel);
  return () => {
    window.removeEventListener("online", rappel);
    window.removeEventListener("offline", rappel);
  };
}

/**
 * Ce que l'élève voit quand une page n'a pas pu s'afficher : ce qui s'est passé, quoi faire, et un numéro de suivi.
 * Jamais le message de l'erreur ni sa trace. « Réessayer » redemande la page au serveur (`retry`, Next.js 16.3).
 */
export default function Panne({ error, retry, retour }: { error: unknown; retry: () => void; retour: { href: string; nom: string } }) {
  const titre = useRef<HTMLHeadingElement>(null);
  const [enCours, lance] = useTransition();
  const enLigne = useSyncExternalStore(abonne, () => navigator.onLine, () => true);
  const numero = numeroDeSuivi(error);
  // la page a changé sous les yeux de l'élève : le titre prend le focus pour qu'un lecteur d'écran l'annonce
  useEffect(() => { titre.current?.focus(); }, []);
  return (
    <section className="panne" aria-labelledby="titre-panne">
      <header className="entete">
        <div className="surtitre">Une panne</div>
        <h1 id="titre-panne" ref={titre} tabIndex={-1}>Cette page n&apos;a pas pu s&apos;afficher</h1>
        <p className="sous-titre">
          {enLigne
            ? "Le serveur n'a pas répondu comme il faut. Ce n'est pas de ta faute, et ce que tu avais déjà validé reste enregistré."
            : "Tu n'as plus de connexion à Internet. Vérifie ton Wi-Fi ou tes données mobiles, puis réessaie."}
        </p>
      </header>
      <div className="actions">
        <button className="btn btn-cuivre" type="button" disabled={enCours} onClick={() => lance(() => retry())}>{enCours ? "Nouvel essai…" : "Réessayer"}</button>
        <Link className="btn-texte" href={retour.href}>{retour.nom}</Link>
      </div>
      {numero && <p className="petit discret panne-numero">Numéro de suivi : <span className="chiffres">{numero}</span>. Si la panne continue, garde-le : il sert à la retrouver.</p>}
    </section>
  );
}
