import Link from "next/link";
import { redirect } from "next/navigation";
import FormulaireConnexion from "@/components/appli/FormulaireConnexion";
import { pluriel } from "@/lib/commun/format";
import { sessionCourante } from "@/lib/serveur/session";
import { questionDuTest, testDuVisiteur } from "@/lib/serveur/test-accueil";

export const metadata = { title: "Tes résultats sont prêts" };

// La fin du test de la page d'accueil : les résultats attendent le visiteur dans l'application. Il ouvre son compte
// avec son adresse e-mail ; le test lui est alors rattaché (lib/serveur/test-accueil.ts).
export default async function Resultats() {
  if (await sessionCourante()) redirect("/app/parcours");
  const test = await testDuVisiteur();
  if (!test) redirect("/test");
  if (await questionDuTest(test)) redirect("/test");
  return (
    <main className="principal" style={{ marginLeft: 0 }}>
      <div className="colonne" style={{ maxWidth: 460 }}>
        <header className="entete">
          <nav className="fil" aria-label="Fil d'Ariane"><Link href="/">MasterBac</Link></nav>
          <div className="surtitre">Test terminé</div>
          <h1>Tes résultats sont prêts</h1>
          <p className="sous-titre">Tu as répondu à {pluriel(test.reponses.length, "question", "questions")}. Ouvre ton compte pour recevoir tes résultats : tes bonnes réponses par chapitre et par objectif, et par où commencer.</p>
        </header>
        <div className="carte"><FormulaireConnexion /></div>
        <p className="petit discret" style={{ marginTop: 12 }}>Ton compte est gratuit. Il garde tes résultats et te donne une séance de travail chaque jour.</p>
      </div>
    </main>
  );
}
