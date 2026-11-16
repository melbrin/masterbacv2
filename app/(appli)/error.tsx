"use client";

import Panne from "@/components/socle/Panne";

// La panne a eu lieu avant même le menu de l'application (la lecture du profil, par exemple), ou sur une page du
// compte ou de l'administration : la page d'erreur s'affiche seule.
export default function PanneHorsMenu({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="principal" style={{ marginLeft: 0 }}>
      <div className="colonne" style={{ maxWidth: 520 }}>
        <Panne error={error} retry={retry} retour={{ href: "/app", nom: "Revenir à l'accueil" }} />
      </div>
    </main>
  );
}
