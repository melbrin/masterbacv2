import { notFound } from "next/navigation";
import { Entete } from "@/components/appli/Morceaux";
import QuizJoueur from "@/components/appli/QuizJoueur";
import { p2 } from "@/lib/commun/format";
import { sessionQuiz } from "@/lib/serveur/requetes/quiz";

export const metadata = { title: "Quiz" };
const TITRES: Record<string, string> = { chapitre: "Quiz du chapitre", passage: "Test de passage", ds: "Test de ta préparation", carnet: "Révision du carnet", seance: "À revoir" };

export default async function Quiz({ params }: { params: Promise<{ id: string }> }) {
  const s = await sessionQuiz((await params).id);
  if (!s) notFound();
  // à la fin, le quiz ramène là d'où il vient : la séance de DS, la séance du jour, le carnet ou la fiche
  const retour = s.ds && s.seance ? `/app/ds/${s.ds}/${s.seance}` : s.fiche ? `/app/fiche/${p2(s.fiche)}?onglet=quiz` : s.genre === "carnet" ? "/app/carnet" : s.genre === "seance" ? "/app/seance?suite=1" : "/app/ds";
  const libelle = s.genre === "seance" ? "Continuer ma séance" : s.genre === "ds" ? "Étape suivante" : "Continuer";
  return (
    <>
      <Entete titre={`${TITRES[s.genre] ?? "Quiz"}${s.niveau ? ` : objectif ${s.niveau}` : ""}`} />
      <QuizJoueur session={s.id} total={s.total} rangInitial={s.rang} vueInitiale={s.vue} bonnesInitiales={s.bonnes ?? 0} retour={retour} libelleRetour={libelle} limite={s.limite} />
    </>
  );
}
