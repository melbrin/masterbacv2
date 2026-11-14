import Link from "next/link";
import { Entete } from "@/components/appli/Morceaux";
import { IllustrationJeux, IllustrationMemoire, IllustrationTp } from "@/components/entrainement/Illustrations";
import Vignette from "@/components/simulations/Vignette";
import { ENTRAINEMENT, SECTIONS, type IdSection } from "@/lib/commun/entrainement";
import { JEUX } from "@/lib/commun/jeux";
import { JEUX_MEMOIRE } from "@/lib/commun/memoire";
import { apercuDe, avancementDesDefis, bilanDesDefis, simulationsVisibles } from "@/lib/serveur/defis";
import { sectionsDe } from "@/lib/serveur/entrainement";
import { recordsDe } from "@/lib/serveur/jeux";
import { bilanMemoire } from "@/lib/serveur/memoire";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";
import { bilansDesTp, tpVisibles } from "@/lib/serveur/tp";

export const metadata = { title: ENTRAINEMENT.nom };

/** Ce qu'une porte montre sous son nom : ce que la sous-section contient, puis où l'élève en est. */
interface Porte { scene: React.ReactNode; nombre: number; unite: string; suite: React.ReactNode }

const accord = (n: number, un: string, plusieurs: string) => (n > 1 ? plusieurs : un);
const Etoile = () => <svg className="porte-etoile" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5L2.5 9.5l6.6-.9z" /></svg>;

// La page de la section « S'entraîner » : une porte par sous-section, comme une petite affiche. Une porte ne se montre
// que si sa sous-section a du contenu pour ce compte. Chaque lecture se fait avec les droits de l'élève.
export default async function Entrainement() {
  const { session } = await espaceEleve();
  const ouvertes = sectionsDe(session.admin);
  const labo = simulationsVisibles(session.admin);
  const tps = tpVisibles(session.admin);
  const [avancement, tp, memoire, jeux] = await Promise.all([
    ouvertes.includes("labo") ? avancementDesDefis(session.userId) : null,
    ouvertes.includes("tp") ? bilansDesTp(session.userId) : null,
    ouvertes.includes("memoire") ? bilanMemoire(session.userId) : null,
    recordsDe(session.userId),
  ]);
  const nbDefis = labo.reduce((s, x) => s + x.defis.length, 0);
  const etoiles = avancement ? labo.reduce((s, x) => s + bilanDesDefis(x.defis, avancement).etoiles, 0) : 0;
  // un TP refait ne compte qu'une fois
  const tpFinis = tp ? tps.filter((t) => tp.meilleurs.has(t.id)).length : 0;
  const jours = memoire?.joursSemaine ?? 0;
  const portes: Record<IdSection, Porte> = {
    labo: {
      scene: labo[0] ? <Vignette simulation={labo[0].simulation.id} {...apercuDe(labo[0].simulation, labo[0].defis[0])} /> : null,
      nombre: nbDefis, unite: accord(nbDefis, "défi", "défis"),
      // l'étoile dessinée dit « étoiles » ; le mot reste pour qui ne la voit pas
      suite: <><Etoile /><b>{etoiles}</b><span className="sr"> {accord(etoiles, "étoile", "étoiles")}</span> sur {3 * nbDefis}</>,
    },
    tp: {
      scene: <IllustrationTp />, nombre: tps.length, unite: "TP",
      suite: <><b>{tpFinis}</b> {accord(tpFinis, "terminé", "terminés")}</>,
    },
    memoire: {
      scene: <IllustrationMemoire />, nombre: JEUX_MEMOIRE.length, unite: accord(JEUX_MEMOIRE.length, "jeu", "jeux"),
      suite: <><b>{jours}</b> {accord(jours, "jour", "jours")} sur 7</>,
    },
    jeux: {
      scene: <IllustrationJeux />, nombre: JEUX.length, unite: "jeux",
      suite: <><b>{jeux.partiesSemaine}</b> {accord(jeux.partiesSemaine, "partie", "parties")} en 7 jours</>,
    },
  };

  return (
    <>
      <Entete titre={ENTRAINEMENT.nom} sous={ENTRAINEMENT.phrase} />
      <ul className="portes">
        {SECTIONS.filter((s) => ouvertes.includes(s.id)).map((s) => {
          const p = portes[s.id];
          return (
            <li key={s.id} className={`porte porte-${s.id}`}>
              <div className="porte-scene" aria-hidden="true">{p.scene}</div>
              <h2 className="porte-nom"><Link href={s.href}>{s.nom}</Link></h2>
              <p className="porte-phrase">{s.phrase}</p>
              <p className="porte-chiffres"><span className="porte-nombre"><b>{p.nombre}</b> {p.unite}</span><span>{p.suite}</span></p>
            </li>
          );
        })}
      </ul>
    </>
  );
}
