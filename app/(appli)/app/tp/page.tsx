import Link from "next/link";
import BoutonAction from "@/components/appli/BoutonAction";
import { Entete } from "@/components/appli/Morceaux";
import SousMenu from "@/components/appli/SousMenu";
import { ENTRAINEMENT, ancreDuTp } from "@/lib/commun/entrainement";
import { p2, pluriel } from "@/lib/commun/format";
import { COMPETENCES } from "@/lib/commun/tp/types";
import { demarrerTp } from "@/lib/serveur/commandes/tp";
import { entrainementDe, sectionsDe } from "@/lib/serveur/entrainement";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";
import { proposesParLeParcours } from "@/lib/serveur/suivi";
import { bilansDesTp, tpVisibles } from "@/lib/serveur/tp";

export const metadata = { title: "TP" };

// Les TP virtuels (décision 0012) : des situations d'entraînement aux ECE, en chimie et en physique.
// La page est un sommaire, comme le cahier de TP d'un élève : un numéro, une famille de manipulation, un titre.
export default async function PageTp() {
  const espace = await espaceEleve();
  const { session, catalogue } = espace;
  const liste = tpVisibles(session.admin);
  const [{ meilleurs, enCours }, entrainement] = await Promise.all([bilansDesTp(session.userId), entrainementDe(session, espace.ctx.maintenant)]);
  // les TP que le parcours de l'élève propose en ce moment (décision 0015)
  const proposes = proposesParLeParcours(espace, entrainement.suivi).tp;
  const faits = liste.filter((t) => meilleurs.has(t.id)).length;
  return (
    <>
      <SousMenu actif="tp" ouvertes={sectionsDe(session.admin)} />
      <Entete fil={<Link href={ENTRAINEMENT.href}>{ENTRAINEMENT.nom}</Link>} surtitre="TP" titre="Entraîne-toi aux ECE"
        sous="Un TP suit le fil de l'épreuve : tu prépares, tu manipules, tu exploites tes mesures. Sur la paillasse, tout se fait à la main, et c'est toi qui lis les appareils." />
      <p className="petit discret" style={{ margin: "0 0 4px" }}>Manipuler à l&apos;écran ne remplace pas les gestes du laboratoire. Tu t&apos;entraînes ici à ce qui fait perdre des points : le protocole, l&apos;ordre des gestes, la lecture d&apos;un appareil, l&apos;exploitation des mesures.</p>
      {liste.length > 0 && <p className="labo-bilan"><span><b>{faits}</b> sur {liste.length} TP {faits > 1 ? "terminés" : "terminé"}</span></p>}
      {liste.length === 0 && <p className="carte">Aucun TP n&apos;est disponible pour le moment.</p>}
      {(["chimie", "physique"] as const).map((matiere) => {
        const tps = liste.filter((t) => t.matiere === matiere);
        if (!tps.length) return null;
        return (
          <section key={matiere} aria-labelledby={`tp-${matiere}`}>
            <div className="section-titre"><h2 id={`tp-${matiere}`}>{matiere === "chimie" ? "En chimie" : "En physique"}</h2><span className="petit discret">{pluriel(tps.length, "TP", "TP")}</span></div>
            <ol className="tp-sommaire">
              {tps.map((t) => {
                const bilan = meilleurs.get(t.id);
                const reprise = enCours.get(t.id);
                const fiche = catalogue.fiches.find((f) => f.num === t.fiche);
                const lancer = async () => { "use server"; return demarrerTp({ tp: t.id }); };
                return (
                  <li key={t.id} id={ancreDuTp(t.id)}>
                    <span className="tp-sommaire-rang" aria-hidden="true">{p2(liste.indexOf(t) + 1)}</span>
                    <div>
                      {proposes.has(t.id) && <p className="tp-sommaire-marque"><span className="puce puce-parcours">Dans ton parcours</span></p>}
                      <p className="tp-sommaire-famille">{t.famille} · {t.minutes} min</p>
                      <h3>{t.titre}</h3>
                      <p className="tp-sommaire-accroche">{t.accroche}</p>
                      {(bilan || fiche) && (
                        <p className="petit discret tp-sommaire-suite">
                          {bilan && <span>Ton meilleur bilan : <span className="tp-lettres" role="img" aria-label={COMPETENCES.filter((c) => bilan[c.id]).map((c) => `${c.nom} ${bilan[c.id]}`).join(", ")}>{COMPETENCES.filter((c) => bilan[c.id]).map((c) => <span key={c.id} className={`tp-niveau tp-niveau-${bilan[c.id]}`}>{bilan[c.id]}</span>)}</span></span>}
                          {fiche && <Link href={`/app/fiche/${p2(fiche.num)}`}>Revoir la fiche {fiche.num}</Link>}
                        </p>
                      )}
                    </div>
                    <div className="actions">
                      {reprise && <Link className="btn btn-cuivre" href={`/app/tp/essai/${reprise}`}>Reprendre le TP</Link>}
                      <BoutonAction lancer={lancer} className={reprise || bilan ? "btn btn-ligne" : undefined}>{reprise ? "Recommencer" : bilan ? "Refaire le TP" : "Commencer le TP"}</BoutonAction>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </>
  );
}
