import Link from "next/link";
import Icone from "@/components/appli/Icone";
import { Entete } from "@/components/appli/Morceaux";
import SousMenu from "@/components/appli/SousMenu";
import { ENTRAINEMENT } from "@/lib/commun/entrainement";
import { pluriel } from "@/lib/commun/format";
import { FAMILLES_MEMOIRE, JEUX_MEMOIRE } from "@/lib/commun/memoire";
import { sectionsDe } from "@/lib/serveur/entrainement";
import { bilanMemoire } from "@/lib/serveur/memoire";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export const metadata = { title: "Mémoire" };

// La section Mémoire (décision 0013) : des jeux pour s'entraîner à retenir, rangés par façon de retenir.
export default async function Memoire() {
  const { session } = await espaceEleve();
  const bilan = await bilanMemoire(session.userId);
  return (
    <>
      <SousMenu actif="memoire" ouvertes={sectionsDe(session.admin)} />
      <Entete fil={<Link href={ENTRAINEMENT.href}>{ENTRAINEMENT.nom}</Link>} surtitre="Mémoire" titre="Entraîne ta mémoire" sous="Quelques minutes par jour suffisent. Chaque jeu fait travailler une façon de retenir." />
      {bilan.parties > 0 && (
        <p className="labo-bilan">
          <span><b>{bilan.joursSemaine}</b> {bilan.joursSemaine > 1 ? "jours" : "jour"} d&apos;entraînement sur les sept derniers</span>
          <span><b>{bilan.partiesSemaine}</b> {bilan.partiesSemaine > 1 ? "parties" : "partie"} cette semaine</span>
        </p>
      )}
      {JEUX_MEMOIRE.length === 0 && <p className="carte">Aucun jeu de mémoire n&apos;est installé pour le moment.</p>}
      {FAMILLES_MEMOIRE.map((f) => {
        const jeux = JEUX_MEMOIRE.filter((j) => j.famille === f.id);
        if (!jeux.length) return null;
        return (
          <section key={f.id}>
            <div className="section-titre"><h2>{f.titre}</h2><span className="petit discret">{pluriel(jeux.length, "jeu", "jeux")}</span></div>
            <p className="petit discret" style={{ margin: "0 0 10px" }}>{f.sous}</p>
            <ul className="hub-liste">
              {jeux.map((j) => (
                <li key={j.id} className="carte hub-carte">
                  <span className="hub-icone"><Icone nom={j.icone} /></span>
                  <div><h3>{j.nom}</h3><p>{j.resume}</p>
                    {bilan.records[j.id] !== undefined && <span className="puce puce-serie">Ton record : {bilan.records[j.id]}</span>}</div>
                  <div className="actions"><Link className="btn btn-cuivre" href={`/app/memoire/${j.id}`}>Jouer</Link></div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
