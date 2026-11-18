import Link from "next/link";
import { notFound } from "next/navigation";
import { Entete, PillNiveau } from "@/components/appli/Morceaux";
import Atelier from "@/components/python/Atelier";
import TexteAvecCode from "@/components/python/TexteAvecCode";
import { ENTRAINEMENT } from "@/lib/commun/entrainement";
import { duree, p2 } from "@/lib/commun/format";
import { NOMS_GENRES, THEMES_PYTHON } from "@/lib/commun/python/types";
import { avancementPython, exercicePourCompte, exercicesVisibles, programmeReussi } from "@/lib/serveur/python";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export async function generateMetadata({ params }: { params: Promise<{ exercice: string }> }) {
  // le titre d'un brouillon ne sort pas dans l'onglet d'une page introuvable
  return { title: exercicePourCompte((await params).exercice, false)?.titre ?? "Python" };
}

// Un exercice du hub Python (décision 0016) : l'énoncé, puis l'atelier. Le navigateur reçoit le programme de départ,
// les vérifications et les indices ; la solution reste sur le serveur jusqu'à ce que l'élève puisse la demander.
export default async function ExercicePython({ params }: { params: Promise<{ exercice: string }> }) {
  const { session, catalogue } = await espaceEleve();
  const e = exercicePourCompte((await params).exercice, session.admin);
  if (!e) notFound();
  const visibles = exercicesVisibles(session.admin);
  const rang = visibles.findIndex((x) => x.id === e.id);
  const suivant = visibles[rang + 1] ?? null;
  const precedent = visibles[rang - 1] ?? null;
  const avancement = (await avancementPython(session.userId)).get(e.id);
  const codeReussi = avancement?.reussi ? await programmeReussi(session.userId, e.id) : null;
  const fiche = catalogue.fiches.find((f) => f.num === e.fiche);
  const theme = THEMES_PYTHON.find((t) => t.id === e.theme)?.nom ?? "Python";

  return (
    <>
      <Entete fil={<><Link href={ENTRAINEMENT.href}>{ENTRAINEMENT.nom}</Link><span aria-hidden="true">/</span><Link href="/app/python">Python</Link></>}
        surtitre={`${theme} · ${NOMS_GENRES[e.genre]}`} titre={e.titre} />
      <p className="py-meta">
        <PillNiveau n={e.niveau} />
        <span>{duree(e.minutes)}</span>
        {fiche && <Link href={`/app/fiche/${p2(fiche.num)}`}>Fiche {fiche.num} · {fiche.titre_court}</Link>}
        {avancement?.reussi && <span className="puce puce-ok">Réussi</span>}
      </p>
      <div className="py-enonce">{e.enonce.map((p) => <p key={p}><TexteAvecCode texte={p} /></p>)}</div>
      {/* le programme gardé sur l'appareil est rangé sous le compte : sur un ordinateur partagé, l'élève suivant ne le voit pas */}
      <Atelier key={e.id} cle={`mb-python:${session.userId}:${e.id}`} depart={e.depart} exercice={{
        id: e.id, tests: e.tests, indices: e.indices, dejaReussi: avancement?.reussi ?? false, essais: avancement?.essais ?? 0, codeReussi,
        suivant: suivant ? { href: `/app/python/${suivant.id}`, titre: suivant.titre } : null,
      }} />
      <nav className="py-voisins" aria-label="Les autres exercices">
        {precedent ? <Link href={`/app/python/${precedent.id}`}>Exercice précédent : {precedent.titre}</Link> : <span />}
        {suivant ? <Link href={`/app/python/${suivant.id}`}>Exercice suivant : {suivant.titre}</Link> : <Link href="/app/python">Tous les exercices</Link>}
      </nav>
    </>
  );
}
