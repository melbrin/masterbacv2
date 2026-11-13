import Link from "next/link";
import { notFound } from "next/navigation";
import BoutonAction from "@/components/appli/BoutonAction";
import { Entete } from "@/components/appli/Morceaux";
import { p2 } from "@/lib/commun/format";
import { demarrerQuiz } from "@/lib/serveur/commandes/quiz";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export const metadata = { title: "Quiz" };

// Démarrer un quiz écrit une session : cela passe par un bouton et une action, jamais par la simple ouverture d'une page.
export default async function NouveauQuiz({ searchParams }: { searchParams: Promise<{ fiche?: string; passage?: string }> }) {
  const sp = await searchParams;
  const { catalogue } = await espaceEleve();
  const fiche = Number(sp.fiche);
  const f = catalogue.fiches.find((x) => x.num === fiche);
  if (!f) notFound();
  const niveau = [10, 14, 18].includes(Number(sp.passage)) ? (Number(sp.passage) as 10 | 14 | 18) : null;
  const lancer = async () => {
    "use server";
    return niveau ? demarrerQuiz({ genre: "passage", fiche, niveau }) : demarrerQuiz({ genre: "chapitre", fiche });
  };
  return (
    <>
      <Entete fil={<><Link href="/app/cours">Cours</Link> › <Link href={`/app/fiche/${p2(fiche)}?onglet=quiz`}>Fiche {fiche} · {f.titre_court}</Link></>}
        titre={niveau ? `Test de passage à l'objectif ${niveau}` : "Quiz du chapitre"} />
      <div className="carte">
        {niveau
          ? <p>Cinq questions, quinze minutes. Il faut 70 % de bonnes réponses, soit 4 sur 5. Les réponses sont corrigées une par une.</p>
          : <p>Dix questions au plus, sans chronomètre. Celles que tu as ratées passent en premier, puis celles que tu n&apos;as jamais faites.</p>}
        <div className="actions"><BoutonAction lancer={lancer}>{niveau ? "Commencer le test" : "Commencer le quiz"}</BoutonAction></div>
      </div>
    </>
  );
}
