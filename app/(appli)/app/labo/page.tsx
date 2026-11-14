import Link from "next/link";
import Icone from "@/components/appli/Icone";
import { Entete } from "@/components/appli/Morceaux";
import SousMenu from "@/components/appli/SousMenu";
import Etoiles from "@/components/simulations/Etoiles";
import Vignette from "@/components/simulations/Vignette";
import { ENTRAINEMENT } from "@/lib/commun/entrainement";
import { pluriel } from "@/lib/commun/format";
import * as m from "@/lib/moteur";
import { apercuDe, avancementDesDefis, bilanDesDefis, simulationsVisibles, type Avancement } from "@/lib/serveur/defis";
import { sectionsDe } from "@/lib/serveur/entrainement";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export const metadata = { title: "Labo" };

// Le labo (décision 0011) : des simulations à défis, rangées en physique et en chimie. L'élève calcule d'abord,
// entre sa valeur, puis lance la simulation. En bas de page, le basketteur en mode libre, sans défi.
export default async function Labo() {
  const { ctx, session } = await espaceEleve();
  const labo = simulationsVisibles(session.admin);
  const avancement = labo.length ? await avancementDesDefis(session.userId) : new Map<string, Avancement>();
  const bilans = labo.map((x) => bilanDesDefis(x.defis, avancement));
  const nbDefis = labo.reduce((s, x) => s + x.defis.length, 0);
  const vus = m.chapitresVus(ctx);
  const rayons = [
    { titre: "En physique", rayon: labo.filter((x) => x.simulation.fiche <= 8) },
    { titre: "En chimie", rayon: labo.filter((x) => x.simulation.fiche > 8) },
  ].filter((r) => r.rayon.length > 0);

  return (
    <>
      <SousMenu actif="labo" ouvertes={sectionsDe(session.admin)} />
      <Entete fil={<Link href={ENTRAINEMENT.href}>{ENTRAINEMENT.nom}</Link>} surtitre="Labo" titre="Calcule, puis lance la simulation"
        sous="Entre ta valeur dans la simulation : le défi est réussi si la simulation réussit." />
      {labo.length === 0 ? <p className="carte">Aucune simulation n&apos;est disponible pour le moment.</p> : (
        <p className="labo-bilan">
          <span><b>{bilans.reduce((s, b) => s + b.reussis, 0)}</b> sur {pluriel(nbDefis, "défi réussi", "défis réussis")}</span>
          <span><Etoiles gagnees={1} total={1} /> <b>{bilans.reduce((s, b) => s + b.etoiles, 0)}</b> sur {3 * nbDefis}</span>
        </p>
      )}
      {rayons.map((r) => (
        <section key={r.titre}>
          <div className="section-titre"><h2>{r.titre}</h2><span className="petit discret">{pluriel(r.rayon.length, "simulation", "simulations")}</span></div>
          <ul className="labo-rayon">
            {r.rayon.map(({ simulation, defis }) => {
              const b = bilans[labo.findIndex((x) => x.simulation.id === simulation.id)];
              const adresse = `/app/labo/${simulation.id}`;
              return (
                <li key={simulation.id}>
                  <article className="labo-fiche">
                    <Vignette simulation={simulation.id} {...apercuDe(simulation, defis[0])} />
                    <div className="labo-fiche-corps">
                      <span className="labo-theme">{simulation.theme}</span>
                      <h3>{simulation.nom}</h3>
                      <p>{simulation.accroche}</p>
                      <p><Etoiles gagnees={1} total={1} /> {b.etoiles} sur {3 * defis.length} · {b.reussis} sur {pluriel(defis.length, "défi réussi", "défis réussis")}</p>
                      {vus.length > 0 && !vus.includes(simulation.fiche) && <span className="puce puce-bleu" style={{ justifySelf: "start" }}>Chapitre pas encore vu en classe</span>}
                      <div className="actions">
                        <Link className="btn btn-cuivre" href={`${adresse}/${b.prochain + 1}`}>{b.reussis === 0 ? "Jouer" : b.reussis === defis.length ? "Rejouer" : "Continuer"}</Link>
                        <Link className="btn-texte" href={adresse}>Les {defis.length} défis</Link>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <div className="section-titre"><h2>Aller plus loin</h2></div>
      <ul className="hub-liste">
        <li className="carte hub-carte">
          <span className="hub-icone"><Icone nom="ballon" /></span>
          <div><h3>Le basketteur, en mode libre</h3><p>Règle toi-même la vitesse et l&apos;angle, puis regarde le saut et le tir. Sans défi ni étoiles.</p></div>
          <div className="actions"><Link className="btn btn-cuivre" href="/app/labo/basket/libre">Ouvrir la simulation</Link></div>
        </li>
      </ul>
    </>
  );
}
