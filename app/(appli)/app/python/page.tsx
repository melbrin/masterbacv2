import Link from "next/link";
import { notFound } from "next/navigation";
import { Entete, PillNiveau } from "@/components/appli/Morceaux";
import SousMenu from "@/components/appli/SousMenu";
import { ENTRAINEMENT } from "@/lib/commun/entrainement";
import { duree, p2, pluriel } from "@/lib/commun/format";
import { NOMS_GENRES } from "@/lib/commun/python/types";
import { sectionsDe } from "@/lib/serveur/entrainement";
import { avancementPython, exercicesParTheme, prochainExercice } from "@/lib/serveur/python";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export const metadata = { title: "Python" };

// Le hub Python (décision 0016) : des exercices de programmation qui ressemblent à ceux des sujets du bac, rangés par
// thème, et un atelier libre. Le sommaire se lit comme un programme : chaque exercice a son numéro de ligne.
// « ?fiche=7 » ne montre que les exercices d'une fiche : c'est l'adresse de la carte « Programme-le en Python ».
export default async function HubPython({ searchParams }: { searchParams: Promise<{ fiche?: string }> }) {
  const { session, catalogue } = await espaceEleve();
  const tous = exercicesParTheme(session.admin);
  const visibles = tous.flatMap((t) => t.exercices);
  // fermé par l'interrupteur, ou sans exercice que ce compte peut voir : le hub n'existe pas
  if (visibles.length === 0) notFound();
  const demandee = Number((await searchParams).fiche);
  const fiche = visibles.some((e) => e.fiche === demandee) ? catalogue.fiches.find((f) => f.num === demandee) ?? null : null;
  const themes = fiche ? tous.map((t) => ({ ...t, exercices: t.exercices.filter((e) => e.fiche === fiche.num) })).filter((t) => t.exercices.length) : tous;
  const avancement = await avancementPython(session.userId);
  const reussis = visibles.filter((e) => avancement.get(e.id)?.reussi).length;
  const prochain = prochainExercice(fiche ? themes.flatMap((t) => t.exercices) : visibles, avancement);
  const commence = prochain ? (avancement.get(prochain.id)?.essais ?? 0) > 0 : false;

  return (
    <>
      <SousMenu actif="python" ouvertes={sectionsDe(session.admin)} />
      <Entete fil={<Link href={ENTRAINEMENT.href}>{ENTRAINEMENT.nom}</Link>} surtitre="Python" titre="Le hub Python"
        sous="Écris du vrai Python, lance-le, et vérifie-le tout de suite. Les exercices ressemblent à ceux des sujets du bac : compléter une boucle, écrire une fonction, tracer une courbe." />
      <p className="labo-bilan"><span><b>{reussis}</b> sur {pluriel(visibles.length, "exercice réussi", "exercices réussis")}</span></p>
      {fiche && (
        <p className="py-filtre">Les exercices de la fiche {fiche.num}, {fiche.titre_court} · <Link href="/app/python">Tous les exercices</Link></p>
      )}
      <div className="py-depart">
        {prochain && <Link className="btn btn-cuivre" href={`/app/python/${prochain.id}`}>{commence ? "Reprendre" : reussis === 0 ? "Commencer" : "Continuer"} : {prochain.titre}</Link>}
        <Link className={prochain ? "btn btn-ligne" : "btn btn-cuivre"} href="/app/python/libre">Ouvrir l&apos;atelier libre</Link>
      </div>

      {themes.map((t) => (
        <section key={t.theme} aria-labelledby={`py-${t.theme}`}>
          <div className="section-titre"><h2 id={`py-${t.theme}`}>{t.nom}</h2><span className="petit discret">{pluriel(t.exercices.length, "exercice", "exercices")}</span></div>
          <ol className="py-sommaire">
            {t.exercices.map((e) => {
              const a = avancement.get(e.id);
              return (
                <li key={e.id} className={a?.reussi ? "est-reussi" : undefined}>
                  <span className="py-sommaire-rang" aria-hidden="true">{p2(visibles.indexOf(e) + 1)}</span>
                  <div>
                    <p className="py-sommaire-genre">{NOMS_GENRES[e.genre]} · {duree(e.minutes)}</p>
                    <h3><Link href={`/app/python/${e.id}`}>{e.titre}</Link></h3>
                    <p className="py-sommaire-suite">
                      <PillNiveau n={e.niveau} />
                      <span>Fiche {e.fiche}</span>
                      {a?.reussi ? <span className="puce puce-ok">Réussi</span> : a?.essais ? <span>{pluriel(a.essais, "vérification lancée", "vérifications lancées")}</span> : null}
                      {e.etat === "brouillon" && <span className="puce puce-bleu">Brouillon</span>}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}

      <div className="section-titre"><h2>Ce que le hub sait faire</h2></div>
      <p className="py-memo">Python 3.14, avec les modules des sujets du bac : <code>math</code>, <code>random</code>, <code>numpy</code> et les tracés courants de <code>matplotlib.pyplot</code>. Ton programme tourne sur ton appareil, pas sur nos serveurs, et n&apos;a pas accès à internet. Il est gardé sur cet appareil à mesure que tu l&apos;écris. Il ne peut pas te demander une valeur au clavier : écris-la directement dans le programme.</p>
    </>
  );
}
