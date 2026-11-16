"use client";

import Panne from "@/components/socle/Panne";

// Une page de l'application n'a pas pu s'afficher. Le menu reste en place : l'élève peut réessayer ou aller ailleurs.
export default function PanneDePage({ error, retry }: { error: unknown; retry: () => void }) {
  return <Panne error={error} retry={retry} retour={{ href: "/app", nom: "Revenir à Aujourd'hui" }} />;
}
