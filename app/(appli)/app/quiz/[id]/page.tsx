import Link from "next/link";
import { notFound } from "next/navigation";
import { Entete } from "@/components/appli/Morceaux";
import QuizJoueur from "@/components/appli/QuizJoueur";
import { p2 } from "@/lib/commun/format";
import { sessionQuiz } from "@/lib/serveur/requetes/quiz";

export const metadata = { title: "Quiz" };
const TITRES: Record<string, string> = { chapitre: "Quiz du chapitre", passage: "Test de passage", ds: "Quiz de ta préparation", carnet: "Révision du carnet", seance: "À revoir" };

export default async function Quiz({ params }: { params: Promise<{ id: string }> }) {
  const s = await sessionQuiz((await params).id);
  if (!s) notFound();
  const retour = s.fiche ? `/app/fiche/${p2(s.fiche)}` : s.genre === "carnet" ? "/app/carnet" : s.genre === "seance" ? "/app/seance" : "/app/ds";
  return (
    <>
      <Entete titre={`${TITRES[s.genre] ?? "Quiz"}${s.niveau ? ` : objectif ${s.niveau}` : ""}`} />
      {s.vue ? <QuizJoueur session={s.id} total={s.total} rangInitial={s.rang} vueInitiale={s.vue} retour={retour} limite={s.limite} />
        : <div className="carte"><div className="score-final"><b className="chiffres">{s.bonnes ?? 0}/{s.total}</b><span>bonnes réponses</span></div>
            <div className="actions"><Link className="btn btn-cuivre" href={retour}>Continuer</Link></div></div>}
    </>
  );
}
