import Link from "next/link";
import { notFound } from "next/navigation";
import Icone from "@/components/appli/Icone";
import { Entete, PillNiveau } from "@/components/appli/Morceaux";
import Etoiles from "@/components/simulations/Etoiles";
import Vignette from "@/components/simulations/Vignette";
import { p2, pluriel } from "@/lib/commun/format";
import { simulation as trouveSimulation } from "@/lib/serveur/contenu/defis";
import { apercuDe, avancementDesDefis, bilanDesDefis, defiOuvert, simulationsVisibles } from "@/lib/serveur/defis";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export async function generateMetadata({ params }: { params: Promise<{ simulation: string }> }) {
  return { title: trouveSimulation((await params).simulation)?.nom ?? "Le labo" };
}

// Une simulation du labo : ses défis, du plus simple au plus difficile. Un défi s'ouvre quand le précédent est réussi.
export default async function PageSimulation({ params }: { params: Promise<{ simulation: string }> }) {
  const { session, catalogue } = await espaceEleve();
  const id = (await params).simulation;
  const visible = simulationsVisibles(session.admin).find((x) => x.simulation.id === id);
  if (!visible) notFound();
  const { simulation, defis } = visible;
  const avancement = await avancementDesDefis(session.userId);
  const bilan = bilanDesDefis(defis, avancement);
  const fiche = catalogue.fiches.find((f) => f.num === simulation.fiche);
  return (
    <>
      <Entete fil={<Link href="/app/labo">Labo</Link>} surtitre={simulation.theme} titre={simulation.nom} sous={simulation.accroche} />
      <Vignette simulation={simulation.id} {...apercuDe(simulation, defis[0])} className="labo-apercu" />
      <p className="labo-bilan">
        <span><b>{bilan.reussis}</b> sur {pluriel(defis.length, "défi réussi", "défis réussis")}</span>
        <span><Etoiles gagnees={1} total={1} /> <b>{bilan.etoiles}</b> sur {3 * defis.length}</span>
      </p>
      <ol className="labo-liste">
        {defis.map((d, rang) => {
          const etoiles = avancement.get(d.id)?.etoiles ?? null;
          const ouvert = defiOuvert(defis, rang, avancement);
          return (
            <li key={d.id} className={`carte labo-defi${etoiles !== null ? " est-reussi" : ouvert ? "" : " est-ferme"}`}>
              <span className="labo-rang" aria-hidden="true">{etoiles !== null ? <Icone nom="ok" /> : ouvert ? rang + 1 : <Icone nom="cadenas" />}</span>
              <div>
                <div className="labo-tete"><PillNiveau n={d.niveau} />{etoiles !== null && <Etoiles gagnees={etoiles} />}</div>
                <h3>Défi {rang + 1} : {d.titre}</h3>
                {!ouvert && <p>Réussis d&apos;abord le défi {rang}.</p>}
              </div>
              {ouvert && <div className="actions"><Link className={`btn ${etoiles !== null ? "btn-ligne" : "btn-cuivre"}`} href={`/app/labo/${simulation.id}/${rang + 1}`}>{etoiles !== null ? "Rejouer" : "Jouer"}</Link></div>}
            </li>
          );
        })}
      </ol>
      <div className="actions simu-suite">
        {fiche && <Link className="btn btn-ligne" href={`/app/fiche/${p2(fiche.num)}`}>Revoir le cours : {fiche.titre_court}</Link>}
        {simulation.id === "basket" && <Link className="btn btn-ligne" href="/app/labo/basket/libre">Mode libre : régler le saut et le tir</Link>}
      </div>
    </>
  );
}
