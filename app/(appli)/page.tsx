import { cookies } from "next/headers";
import Link from "next/link";
import BoutonTheme from "@/components/appli/BoutonTheme";
import { redirect } from "next/navigation";
import { ecartEnJours, jourDeParis } from "@/lib/commun/dates";
import { COOKIE_THEME, lisChoixTheme } from "@/lib/commun/theme";
import { BAC } from "@/lib/moteur";
import { sessionCourante } from "@/lib/serveur/session";
import { MINUTES_DU_TEST } from "@/lib/serveur/test-accueil";

export const metadata = { title: { absolute: "MasterBac · Prépare chaque DS de physique-chimie, puis le bac" } };

const ETAPES = [
  { titre: "Tu coches tes chapitres", texte: "Le test ne porte que sur ce que tu as vu en classe." },
  { titre: `Tu réponds, ${MINUTES_DU_TEST} minutes au plus`, texte: "Quinze questions au plus, du cours aux questions de bac." },
  { titre: "Tu sais par où commencer", texte: "Tes réussites par chapitre et par objectif : viser 10, viser 14, viser 18." },
];
const DANS_L_APPLICATION = [
  { titre: "Tes cours en fiches", texte: "L'essentiel, les questions de cours, les exercices type bac, corrigés pas à pas." },
  { titre: "Le mode DS", texte: "Tu donnes la date et les chapitres : ton plan de révision se construit seul." },
  { titre: "Une séance par jour", texte: "Vingt minutes : ce qu'il faut revoir, un exercice sur papier, sa correction." },
  { titre: "Ton carnet d'erreurs", texte: "Chaque question ratée revient deux jours plus tard, puis une semaine après." },
];

// La page d'accueil (demande de Yane du 16 novembre) : une seule chose à faire, le test de niveau. Le compte se crée
// à la fin du test, pour recevoir ses résultats. Un élève déjà connecté va droit dans l'application.
export default async function Accueil() {
  if (await sessionCourante()) redirect("/app");
  const jours = Math.max(0, ecartEnJours(jourDeParis(new Date()), BAC));
  const theme = lisChoixTheme((await cookies()).get(COOKIE_THEME)?.value);
  return (
    <main className="accueil">
      <header className="accueil-barre">
        <span className="accueil-marque">MasterBac<small>Académie de l&apos;Élite</small></span>
        <span className="accueil-barre-droite"><BoutonTheme initial={theme} /><Link href="/compte/connexion">J&apos;ai déjà un compte</Link></span>
      </header>

      <section className="accueil-affiche" aria-labelledby="titre-accueil">
        <p className="accueil-compte">Bac 2027 · J−{jours}</p>
        <h1 id="titre-accueil">Où en es‑tu vraiment en physique‑chimie ?</h1>
        <p className="accueil-promesse">Un test de {MINUTES_DU_TEST} minutes sur les chapitres que tu as vus. Tu sais ce que tu maîtrises, ce qui te coûte des points, et par où commencer.</p>
        <Link className="btn btn-cuivre accueil-bouton" href="/test">Faire le test</Link>
        <p className="accueil-note">Gratuit. Terminale, spécialité physique-chimie.</p>
      </section>

      <section aria-labelledby="titre-etapes">
        <h2 id="titre-etapes" className="accueil-titre">Le test, en trois temps</h2>
        <ol className="accueil-etapes">
          {ETAPES.map((e, i) => <li key={e.titre}><span className="accueil-rang" aria-hidden="true">{i + 1}</span><div><h3>{e.titre}</h3><p>{e.texte}</p></div></li>)}
        </ol>
      </section>

      <section aria-labelledby="titre-suite">
        <h2 id="titre-suite" className="accueil-titre">Ensuite, MasterBac te fait travailler</h2>
        <ul className="accueil-liste">
          {DANS_L_APPLICATION.map((e) => <li key={e.titre}><h3>{e.titre}</h3><p>{e.texte}</p></li>)}
        </ul>
        <p className="accueil-fin"><Link className="btn btn-cuivre accueil-bouton" href="/test">Faire le test</Link></p>
      </section>
    </main>
  );
}
