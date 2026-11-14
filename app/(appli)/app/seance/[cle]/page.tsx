import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ItemTravail from "@/components/appli/ItemTravail";
import Minuteur from "@/components/appli/Minuteur";
import { Etapes } from "@/components/appli/Morceaux";
import VueItem from "@/components/appli/VueItem";
import * as m from "@/lib/moteur";
import { enonceSeul, itemsComplets } from "@/lib/serveur/contenu/lecture";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export const metadata = { title: "Séance du jour" };
const RAISON = {
  ds: "Cette question porte sur un chapitre de ton prochain DS.",
  classe: "Cette question porte sur un chapitre que tu as vu en classe.",
  defaut: "Cette question porte sur le premier chapitre de l'année. Coche dans les cours les chapitres vus en classe pour changer de chapitre.",
};

// Une question de la séance du jour, affichée dans la séance : l'élève ne passe pas par les cours,
// et le bouton qui suit sa correction le mène à la question suivante, puis au bilan.
export default async function QuestionDeSeance({ params }: { params: Promise<{ cle: string }> }) {
  const cle = decodeURIComponent((await params).cle);
  const d = m.decoupe(cle);
  if (!d) notFound();
  const { ctx, catalogue, droits } = await espaceEleve();
  const seance = ctx.etat.seance;
  if (!seance) redirect("/app/seance");
  const estExercice = seance.exercice === cle;
  // on n'ouvre ici que ce que la séance du jour contient
  if (!estExercice && !(droits.coach && seance.revoir.includes(cle))) notFound();
  const f = catalogue.fiches.find((x) => x.num === d.fiche);
  const [item] = await itemsComplets([cle]);
  if (!f || !item) notFound();
  const theme = f.themes.find((t) => t.num === item.theme);
  const a = m.avancementSeance(ctx, droits.coach);
  const carnet = seance.revoir.filter((k) => !k.startsWith("quiz:"));
  const autres = a.questions.filter((k) => k !== cle);
  const suite = estExercice ? { href: "/app/seance", libelle: "Retour à ma séance" }
    : autres.length ? { href: `/app/seance/${autres[0]}`, libelle: "Question suivante" }
    : a.quiz.length || !seance.exercice ? { href: "/app/seance", libelle: "Continuer ma séance" }
    : { href: `/app/seance/${seance.exercice}`, libelle: "Passer à l'exercice" };
  return (
    <>
      <header className="entete apparait">
        <nav className="fil" aria-label="Fil d'Ariane"><Link href="/app">Aujourd&apos;hui</Link> › <Link href="/app/seance">Séance du jour</Link></nav>
      </header>
      <Etapes noms={droits.coach ? ["À revoir", "Un exercice sur papier", "La correction"] : ["Un exercice sur papier", "La correction"]} actif={estExercice ? (droits.coach ? 1 : 0) : 0} />
      {estExercice ? (
        <div className="consigne"><p>Prends une feuille et un stylo, et rédige ta réponse. {RAISON[seance.raison]}</p><Minuteur minutes={15} /></div>
      ) : (
        <p className="petit discret">Question {carnet.indexOf(cle) + 1} sur {carnet.length} de ton carnet d&apos;erreurs.</p>
      )}
      <VueItem fiche={d.fiche} item={enonceSeul(item)} preambule={theme?.preambule} derniere={m.derniere(ctx.etat, cle)} />
      <ItemTravail key={cle} cle={cle} reference={`fiche ${d.fiche} ${d.k}${d.n}`} exercice={d.k === "ex"} nbIndices={Math.min(2, item.indices.length)} contexte="seance" suite={suite} dejaFait={m.faitLe(ctx.etat, cle, m.jourCourant(ctx))} />
    </>
  );
}
