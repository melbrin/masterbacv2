import Link from "next/link";
import BoutonAction from "@/components/appli/BoutonAction";
import Icone from "@/components/appli/Icone";
import { Entete } from "@/components/appli/Morceaux";
import SousMenu from "@/components/appli/SousMenu";
import { ENTRAINEMENT } from "@/lib/commun/entrainement";
import { p2, pluriel } from "@/lib/commun/format";
import { COMPETENCES } from "@/lib/commun/tp/types";
import { demarrerTp } from "@/lib/serveur/commandes/tp";
import { sectionsDe } from "@/lib/serveur/entrainement";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";
import { bilansDesTp, tpVisibles } from "@/lib/serveur/tp";

export const metadata = { title: "TP" };

// Les TP virtuels (décision 0012) : des situations d'entraînement aux ECE, en chimie et en physique.
export default async function PageTp() {
  const { session, catalogue } = await espaceEleve();
  const liste = tpVisibles(session.admin);
  const { meilleurs, termines, enCours } = await bilansDesTp(session.userId);
  return (
    <>
      <SousMenu actif="tp" ouvertes={sectionsDe(session.admin)} />
      <Entete fil={<Link href={ENTRAINEMENT.href}>{ENTRAINEMENT.nom}</Link>} surtitre="TP" titre="Entraîne-toi aux ECE"
        sous="Un TP suit le fil de l'épreuve : tu prépares, tu manipules, tu exploites tes mesures. À chaque appel, l'application joue le rôle du professeur." />
      <p className="petit discret" style={{ margin: "0 0 4px" }}>Manipuler à l&apos;écran ne remplace pas les gestes du laboratoire. Tu t&apos;entraînes ici à ce qui fait perdre des points : le protocole, l&apos;ordre des gestes, la lecture d&apos;un appareil, l&apos;exploitation des mesures.</p>
      {termines > 0 && <p className="labo-bilan"><span><b>{termines}</b> {termines > 1 ? "TP terminés" : "TP terminé"}</span></p>}
      {liste.length === 0 && <p className="carte">Aucun TP n&apos;est disponible pour le moment.</p>}
      {(["chimie", "physique"] as const).map((matiere) => {
        const tps = liste.filter((t) => t.matiere === matiere);
        if (!tps.length) return null;
        return (
          <section key={matiere}>
            <div className="section-titre"><h2>{matiere === "chimie" ? "En chimie" : "En physique"}</h2><span className="petit discret">{pluriel(tps.length, "TP", "TP")}</span></div>
            <ul className="hub-liste">
              {tps.map((t) => {
                const bilan = meilleurs.get(t.id);
                const reprise = enCours.get(t.id);
                const fiche = catalogue.fiches.find((f) => f.num === t.fiche);
                const lancer = async () => { "use server"; return demarrerTp({ tp: t.id }); };
                return (
                  <li key={t.id} className="carte hub-carte">
                    <span className="hub-icone"><Icone nom="fiole" /></span>
                    <div>
                      <h3>{t.titre}</h3>
                      <p>{t.accroche}</p>
                      <p className="petit discret" style={{ margin: "0 0 6px" }}>{t.famille} · {t.minutes} min{fiche ? <> · <Link href={`/app/fiche/${p2(fiche.num)}`}>fiche {fiche.num}</Link></> : null}</p>
                      {bilan && <p className="petit" style={{ margin: 0 }}>Ton meilleur bilan : <span className="tp-lettres" role="img" aria-label={COMPETENCES.filter((c) => bilan[c.id]).map((c) => `${c.nom} ${bilan[c.id]}`).join(", ")}>{COMPETENCES.filter((c) => bilan[c.id]).map((c) => <span key={c.id} className={`tp-niveau tp-niveau-${bilan[c.id]}`}>{bilan[c.id]}</span>)}</span></p>}
                    </div>
                    <div className="actions">
                      {reprise && <Link className="btn btn-cuivre" href={`/app/tp/essai/${reprise}`}>Reprendre le TP</Link>}
                      <BoutonAction lancer={lancer} className={reprise ? "btn btn-ligne" : undefined}>{reprise ? "Recommencer" : bilan ? "Refaire le TP" : "Commencer le TP"}</BoutonAction>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </>
  );
}
