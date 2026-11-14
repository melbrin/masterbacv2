import Link from "next/link";
import { notFound } from "next/navigation";
import { Entete } from "@/components/appli/Morceaux";
import BonneNotion from "@/components/jeux/BonneNotion";
import Cartes from "@/components/jeux/Cartes";
import Paires from "@/components/jeux/Paires";
import Pluie from "@/components/jeux/Pluie";
import QuelChapitre from "@/components/jeux/QuelChapitre";
import QuiSuisJe from "@/components/jeux/QuiSuisJe";
import Relie from "@/components/jeux/Relie";
import { jeu as ficheDuJeu } from "@/lib/commun/jeux";
import { enregistrerPartie } from "@/lib/serveur/commandes/jeux";
import { matiereDesJeux } from "@/lib/serveur/jeux";
import { nouvelleGraine } from "@/lib/serveur/quiz";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export async function generateMetadata({ params }: { params: Promise<{ jeu: string }> }) {
  return { title: ficheDuJeu((await params).jeu)?.nom ?? "Jeu" };
}

// Un jeu qui tourne dans le navigateur. La page ne lui donne que la matière des chapitres choisis
// (ce que l'onglet L'essentiel et les listes de questions montrent déjà) et une graine pour ses tirages.
export default async function Jeu({ params, searchParams }: { params: Promise<{ jeu: string }>; searchParams: Promise<{ fiches?: string }> }) {
  const infos = ficheDuJeu((await params).jeu);
  if (!infos || infos.serveur) notFound();
  const { catalogue } = await espaceEleve();
  const demandees = ((await searchParams).fiches ?? "").split(",").map(Number).filter((n) => Number.isInteger(n));
  const fiches = catalogue.fiches.map((f) => f.num).filter((n) => demandees.includes(n)).slice(0, 14);
  if (!fiches.length) notFound();
  const id = infos.id;
  const graine = nouvelleGraine();
  const matiere = await matiereDesJeux(fiches, graine);
  const retour = `/app/jeux${fiches.length === 1 ? `?fiche=${fiches[0]}` : ""}`;
  const fin = async (score: number, secondes: number) => {
    "use server";
    const r = await enregistrerPartie({ jeu: id, fiches, score: Math.round(score), secondes: Math.round(secondes) });
    return r.ok ? r.valeur : null;
  };
  const commun = { graine, fin, retour };
  return (
    <>
      <Entete fil={<Link href={retour}>Jeux</Link>} titre={infos.nom} sous={infos.resume} />
      {id === "paires" && <Paires lignes={matiere.lignes} {...commun} />}
      {id === "cartes" && <Cartes lignes={matiere.lignes} {...commun} />}
      {id === "pluie" && <Pluie lignes={matiere.lignes} {...commun} />}
      {id === "relie" && <Relie lignes={matiere.lignes} {...commun} />}
      {id === "indices" && <QuiSuisJe lignes={matiere.lignes} {...commun} />}
      {id === "chapitre" && <QuelChapitre questions={matiere.questions} chapitres={matiere.chapitres} {...commun} />}
      {id === "notion" && <BonneNotion questions={matiere.questions.length ? matiere.notions : []} {...commun} />}
    </>
  );
}
