import Link from "next/link";
import BoutonAction from "@/components/appli/BoutonAction";
import Icone from "@/components/appli/Icone";
import { Entete } from "@/components/appli/Morceaux";
import Etoiles from "@/components/simulations/Etoiles";
import Vignette from "@/components/simulations/Vignette";
import { JEUX, type IdJeu } from "@/lib/commun/jeux";
import { pluriel } from "@/lib/commun/format";
import * as m from "@/lib/moteur";
import { demarrerJeu } from "@/lib/serveur/commandes/jeux";
import { demarrerQuiz } from "@/lib/serveur/commandes/quiz";
import { apercuDe, avancementDesDefis, bilanDesDefis, simulationsVisibles } from "@/lib/serveur/defis";
import { recordsDe } from "@/lib/serveur/jeux";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export const metadata = { title: "Jeux" };

// ce qu'il faut de questions de quiz pour ouvrir chaque jeu corrigé par le serveur
const MINIMUM: Partial<Record<IdJeu, { types: string[]; nombre: number }>> = {
  chrono: { types: ["qcm", "vrai_faux"], nombre: 5 },
  vraifaux: { types: ["vrai_faux"], nombre: 4 },
  ordre: { types: ["ordre"], nombre: 2 },
};
const FAMILLES: { titre: string; sous: string; jeux: IdJeu[] }[] = [
  { titre: "Retenir les relations", sous: "Sur le tableau « À connaître par cœur » de tes chapitres.", jeux: ["paires", "cartes", "pluie", "relie", "indices"] },
  { titre: "Reconnaître la bonne méthode", sous: "Sur les questions de cours et les notions qu'elles font travailler.", jeux: ["chapitre", "notion"] },
  { titre: "Répondre vite et juste", sous: "Sur les questions de quiz. Tes réponses comptent dans tes progrès.", jeux: ["chrono", "vraifaux", "ordre"] },
];

// Les jeux : le labo en tête (décision 0011), puis dix façons de revoir le cours, sur les chapitres vus en classe
// ou sur un seul chapitre (décision 0010).
export default async function Jeux({ searchParams }: { searchParams: Promise<{ fiche?: string }> }) {
  const { ctx, catalogue, session } = await espaceEleve();
  const { records, partiesSemaine } = await recordsDe(session.userId);
  const labo = simulationsVisibles(session.admin);
  const avancement = labo.length ? await avancementDesDefis(session.userId) : new Map();
  const bilans = labo.map((x) => bilanDesDefis(x.defis, avancement));
  const nbDefis = labo.reduce((s, x) => s + x.defis.length, 0);
  const demandee = Number((await searchParams).fiche);
  const seule = catalogue.fiches.find((f) => f.num === demandee) ?? null;
  const vus = m.chapitresVus(ctx);
  // sans chapitre coché, on joue sur le premier chapitre de l'année, comme la séance du jour
  const fiches = seule ? [seule.num] : vus.length ? vus : [1];
  const liste = fiches.join(",");
  const nbQuiz = (types: string[]) => catalogue.quiz.filter((q) => fiches.includes(q.fiche) && types.includes(q.type)).length;
  const melange = async () => { "use server"; return demarrerQuiz({ genre: "melange" }); };

  const carte = (id: IdJeu) => {
    const j = JEUX.find((x) => x.id === id)!;
    const besoin = MINIMUM[id];
    const manque = besoin ? nbQuiz(besoin.types) < besoin.nombre : id === "chapitre" && fiches.length < 2;
    const lancer = id === "chrono" || id === "vraifaux" || id === "ordre" ? async () => { "use server"; return demarrerJeu({ jeu: id, fiches }); } : null;
    return (
      <li key={id} className="carte hub-carte">
        <span className="hub-icone"><Icone nom={j.icone} /></span>
        <div><h3>{j.nom}</h3><p>{j.resume}</p>
          {records[id] !== undefined && <span className="puce puce-serie">Ton record : {records[id]}</span>}</div>
        <div className="actions">
          {manque ? <span className="petit discret">{id === "chapitre" ? "Il faut au moins deux chapitres : choisis « Mes chapitres »." : "Pas assez de questions de ce genre ici : choisis « Mes chapitres » ou un autre chapitre."}</span>
            : lancer ? <BoutonAction lancer={lancer}>Jouer</BoutonAction>
            : <Link className="btn btn-cuivre" href={`/app/jeux/${id}?fiches=${liste}`}>Jouer</Link>}
        </div>
      </li>
    );
  };

  return (
    <>
      <Entete surtitre="Jeux" titre="Revois ton cours en jouant" />

      {labo.length > 0 && (
        <section aria-labelledby="titre-labo">
          <div className="section-titre" style={{ marginTop: 0 }}><h2 id="titre-labo">Le labo</h2></div>
          <p className="petit discret" style={{ margin: "0 0 8px" }}>Calcule d&apos;abord. Entre ensuite ta valeur dans la simulation : le défi est réussi si la simulation réussit.</p>
          <p className="labo-bilan">
            <span><b>{bilans.reduce((s, b) => s + b.reussis, 0)}</b> sur {pluriel(nbDefis, "défi réussi", "défis réussis")}</span>
            <span><Etoiles gagnees={1} total={1} /> <b>{bilans.reduce((s, b) => s + b.etoiles, 0)}</b> sur {3 * nbDefis}</span>
          </p>
          <ul className="labo-rayon">
            {labo.map(({ simulation, defis }, i) => {
              const b = bilans[i];
              const jouer = `/app/jeux/labo/${simulation.id}/${b.prochain + 1}`;
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
                        <Link className="btn btn-cuivre" href={jouer}>{b.reussis === 0 ? "Jouer" : b.reussis === defis.length ? "Rejouer" : "Continuer"}</Link>
                        <Link className="btn-texte" href={`/app/jeux/labo/${simulation.id}`}>Les {defis.length} défis</Link>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="section-titre"><h2>Les jeux de révision</h2></div>
      <p className="petit discret" style={{ margin: "0 0 10px" }}>{seule ? `Sur la fiche ${seule.num} : ${seule.titre_court}.` : vus.length ? `Sur tes ${pluriel(vus.length, "chapitre vu", "chapitres vus")} en classe.` : "Sur le premier chapitre de l'année. Coche tes chapitres vus en classe pour jouer sur les tiens."}</p>
      <div className="filtres" role="group" aria-label="Choisir les chapitres">
        <Link href="/app/jeux" role="button" aria-pressed={!seule}>Mes chapitres</Link>
        {catalogue.fiches.map((f) => <Link key={f.num} href={`/app/jeux?fiche=${f.num}`} role="button" aria-pressed={seule?.num === f.num} title={f.titre_court}>F.{f.num}</Link>)}
      </div>
      {partiesSemaine > 0 && <p className="petit discret" style={{ margin: "10px 0 0" }}>{pluriel(partiesSemaine, "partie jouée", "parties jouées")} ces sept derniers jours.</p>}

      {FAMILLES.map((f) => (
        <section key={f.titre}>
          <div className="section-titre"><h2>{f.titre}</h2></div>
          <p className="petit discret" style={{ margin: "0 0 10px" }}>{f.sous}</p>
          <ul className="hub-liste">{f.jeux.map(carte)}</ul>
        </section>
      ))}

      <div className="section-titre"><h2>Aller plus loin</h2></div>
      <ul className="hub-liste">
        <li className="carte hub-carte">
          <span className="hub-icone"><Icone nom="eclair" /></span>
          <div><h3>Quiz mélangé</h3><p>Dix questions tirées dans tous tes chapitres vus en classe. Celles que tu as ratées passent d&apos;abord.</p></div>
          <div className="actions">{vus.length ? <BoutonAction lancer={melange}>Lancer le quiz</BoutonAction> : <span className="petit discret">Coche d&apos;abord tes chapitres vus en classe, dans les cours.</span>}</div>
        </li>
        <li className="carte hub-carte">
          <span className="hub-icone"><Icone nom="ballon" /></span>
          <div><h3>Le basketteur, en mode libre</h3><p>Règle toi-même la vitesse et l&apos;angle, puis regarde le saut et le tir. Sans défi ni étoiles.</p></div>
          <div className="actions"><Link className="btn btn-cuivre" href="/app/jeux/basket">Ouvrir la simulation</Link></div>
        </li>
      </ul>
    </>
  );
}
