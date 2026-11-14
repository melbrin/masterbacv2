import Link from "next/link";
import { notFound } from "next/navigation";
import { Entete } from "@/components/appli/Morceaux";
import { PLATEAUX } from "@/components/memoire";
import { jeuMemoire } from "@/lib/commun/memoire";
import { enregistrerMemoire } from "@/lib/serveur/commandes/memoire";
import { nouvelleGraine } from "@/lib/serveur/quiz";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export async function generateMetadata({ params }: { params: Promise<{ jeu: string }> }) {
  return { title: jeuMemoire((await params).jeu)?.nom ?? "Mémoire" };
}

// Un jeu de mémoire. Il tourne dans le navigateur : la page contrôle la session, donne une graine pour les tirages,
// et enregistre la partie finie.
export default async function JeuDeMemoire({ params }: { params: Promise<{ jeu: string }> }) {
  const infos = jeuMemoire((await params).jeu);
  const Plateau = infos ? PLATEAUX[infos.id] : undefined;
  if (!infos || !Plateau) notFound();
  await espaceEleve();
  const id = infos.id;
  const retour = "/app/memoire";
  const fin = async (score: number, secondes: number) => {
    "use server";
    const r = await enregistrerMemoire({ jeu: id, score: Math.round(score), secondes: Math.round(secondes) });
    return r.ok ? r.valeur : null;
  };
  return (
    <>
      <Entete fil={<Link href={retour}>Mémoire</Link>} titre={infos.nom} sous={infos.resume} />
      <Plateau graine={nouvelleGraine()} fin={fin} retour={retour} />
    </>
  );
}
