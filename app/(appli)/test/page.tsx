import Link from "next/link";
import { redirect } from "next/navigation";
import FormulaireChapitres from "@/components/accueil/FormulaireChapitres";
import TestJoueur from "@/components/accueil/TestJoueur";
import { sessionCourante } from "@/lib/serveur/session";
import { chapitresDuTest, MINUTES_DU_TEST, questionDuTest, testDuVisiteur } from "@/lib/serveur/test-accueil";

export const metadata = { title: "Ton test de niveau" };

// Le test de la page d'accueil, sans compte. D'abord les chapitres vus en classe, puis les questions, une par une.
// Le serveur garde les réponses et ne renvoie ni correction ni score : les résultats se lisent dans l'application.
export default async function Test() {
  if (await sessionCourante()) redirect("/app/calibrage");
  const test = await testDuVisiteur();
  const question = test ? await questionDuTest(test) : null;
  if (test && !question) redirect("/test/resultats");
  return (
    <main className="principal" style={{ marginLeft: 0 }}>
      <div className="colonne" style={{ maxWidth: 560 }}>
        <header className="entete">
          <nav className="fil" aria-label="Fil d'Ariane"><Link href="/">MasterBac</Link></nav>
          <div className="surtitre">Test de niveau · physique-chimie</div>
          <h1>{question ? "Ton test" : "Sur quels chapitres ?"}</h1>
          {!question && <p className="sous-titre">Coche les chapitres que tu as vus en classe. Le test dure {MINUTES_DU_TEST} minutes au plus et ne porte que sur eux.</p>}
        </header>
        {test && question
          ? <TestJoueur vueInitiale={question.vue} rangInitial={question.rang} total={question.total} limite={test.limite} />
          : <FormulaireChapitres chapitres={await chapitresDuTest()} minutes={MINUTES_DU_TEST} />}
      </div>
    </main>
  );
}
