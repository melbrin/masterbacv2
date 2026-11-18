import Link from "next/link";
import { Entete } from "@/components/appli/Morceaux";
import { IllustrationJeux, IllustrationMemoire, IllustrationPython, IllustrationTp } from "@/components/entrainement/Illustrations";
import Vignette from "@/components/simulations/Vignette";
import { ENTRAINEMENT, SECTIONS, type IdSection } from "@/lib/commun/entrainement";
import { JEUX } from "@/lib/commun/jeux";
import { JEUX_MEMOIRE } from "@/lib/commun/memoire";
import { apercuDe, simulationsVisibles } from "@/lib/serveur/defis";
import { entrainementDe, sectionsDe } from "@/lib/serveur/entrainement";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";
import { tpVisibles } from "@/lib/serveur/tp";

export const metadata = { title: ENTRAINEMENT.nom };

/** Ce qu'une porte montre sous son nom : ce que la sous-section contient, puis où l'élève en est. */
interface Porte { scene: React.ReactNode; nombre: number; unite: string; suite: React.ReactNode }

const accord = (n: number, un: string, plusieurs: string) => (n > 1 ? plusieurs : un);
const Etoile = () => <svg className="porte-etoile" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5L2.5 9.5l6.6-.9z" /></svg>;

// La page de la section « S'entraîner » : une porte par sous-section, comme une petite affiche. Une porte ne se montre
// que si sa sous-section a du contenu pour ce compte. Les chiffres sont ceux de l'accueil et des progrès (décision 0015) :
// ils se lisent une seule fois, avec les droits de l'élève.
export default async function Entrainement() {
  const { session, ctx } = await espaceEleve();
  const ouvertes = sectionsDe(session.admin);
  const labo = simulationsVisibles(session.admin);
  const tps = tpVisibles(session.admin);
  const { bilan } = await entrainementDe(session, ctx.maintenant);
  const nbDefis = bilan.labo.defis;
  const etoiles = bilan.labo.etoiles;
  // un TP refait ne compte qu'une fois
  const tpFinis = bilan.tp.finis;
  const jours = bilan.memoire.jours;
  const parties = bilan.jeux.parties;
  const enPython = bilan.python;
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
    python: {
      scene: <IllustrationPython />, nombre: enPython.exercices, unite: accord(enPython.exercices, "exercice", "exercices"),
      suite: <><b>{enPython.reussis}</b> {accord(enPython.reussis, "réussi", "réussis")}</>,
    },
    memoire: {
      scene: <IllustrationMemoire />, nombre: JEUX_MEMOIRE.length, unite: accord(JEUX_MEMOIRE.length, "jeu", "jeux"),
      suite: <><b>{jours}</b> {accord(jours, "jour", "jours")} sur 7</>,
    },
    jeux: {
      scene: <IllustrationJeux />, nombre: JEUX.length, unite: "jeux",
      suite: <><b>{parties}</b> {accord(parties, "partie", "parties")} en 7 jours</>,
    },
  };

  // le hub Python a son rang à lui, sur toute la largeur ; les autres portes vont par deux, et la dernière d'une série
  // impaire prend aussi toute la largeur
  const montrees = SECTIONS.filter((s) => ouvertes.includes(s.id));
  const larges = new Set<IdSection>(["python"]);
  let serie: IdSection[] = [];
  for (const s of [...montrees.map((x) => x.id), null]) {
    if (s && !larges.has(s)) { serie.push(s); continue; }
    if (serie.length % 2 === 1) larges.add(serie[serie.length - 1]);
    serie = [];
  }

  return (
    <>
      <Entete titre={ENTRAINEMENT.nom} sous={ENTRAINEMENT.phrase} />
      <ul className="portes">
        {montrees.map((s) => {
          const p = portes[s.id];
          return (
            <li key={s.id} className={`porte porte-${s.id}${larges.has(s.id) ? " porte-large" : ""}`}>
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
