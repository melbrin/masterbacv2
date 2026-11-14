import Link from "next/link";
import { notFound } from "next/navigation";
import BoutonAction from "@/components/appli/BoutonAction";
import CaseSeance from "@/components/appli/CaseSeance";
import Confettis from "@/components/appli/Confettis";
import Icone from "@/components/appli/Icone";
import { Coche, Entete, PillNiveau } from "@/components/appli/Morceaux";
import NoterDs from "@/components/appli/NoterDs";
import ContenuHtml from "@/components/socle/ContenuHtml";
import { ecartEnJours } from "@/lib/commun/dates";
import { dateLongue, dateSimple, duree, etiquetteBac, nombre, pluriel, quand } from "@/lib/commun/format";
import * as m from "@/lib/moteur";
import { supprimerDs } from "@/lib/serveur/commandes/ds";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export const metadata = { title: "Préparation du DS" };
const FORMATS: Record<string, { nom: string; resume: string }> = {
  express: { nom: "Express", resume: "Une séance de 20 minutes : l'essentiel du chapitre, un test de 10 questions au plus, les pièges à éviter." },
  "trois-jours": { nom: "Trois jours", resume: "3 séances de 30 minutes : un test, des questions sur tes points faibles, puis un exercice type." },
  semaine: { nom: "Une semaine", resume: "5 séances de travail, puis un DS blanc avec minuteur, puis l'essentiel la veille du devoir." },
};

export default async function PlanDs({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ fin?: string }> }) {
  const id = (await params).id;
  const fin = (await searchParams).fin;
  const { devoirs, catalogue, ctx, jour } = await espaceEleve();
  const ds = devoirs.find((d) => d.id === id);
  if (!ds) notFound();
  const j = ecartEnJours(jour, ds.date);
  const passe = j < 0;
  const fmt = FORMATS[ds.format ?? "express"];
  const fiche = (n: number) => catalogue.fiches.find((f) => f.num === n);
  const seances = ds.seances.map((s) => {
    const etapes = m.etapesDeSeance(s).map((e) => ({ e, faite: m.etapeFaite(ctx, ds.creeA, s, e) }));
    return { s, etapes, faite: m.seancePlanFaite(ctx, ds.creeA, s) };
  });
  const faites = seances.filter((x) => x.faite).length;
  const enCours = seances.find((x) => !x.faite);
  // la séance qu'on vient de terminer se fête une fois, à l'arrivée
  const fetee = seances.find((x) => x.s.id === fin && x.faite);
  const supprimer = async () => { "use server"; return supprimerDs({ id }); };

  const libelle = (e: m.EtapePlan) => {
    if (e.type === "essentiel") return { num: <Icone nom="papier" />, tit: <>L&apos;essentiel : {fiche(e.fiche)?.titre_court}</>, sous: <span>les relations à connaître</span> };
    if (e.type === "quiz") return { num: <Icone nom="eclair" />, tit: <>Test de {pluriel(e.ids.length, "question", "questions")}</>, sous: <span>corrigé après chaque réponse</span> };
    if (e.type === "pieges") return { num: <Icone nom="drapeau" />, tit: <>Les pièges à éviter</>, sous: <span>{e.fiches.map((n) => `fiche ${n}`).join(", ")}</span> };
    if (e.type === "carnet") return { num: <Icone nom="carnet" />, tit: <>Ton carnet d&apos;erreurs</>, sous: <span>{pluriel(m.carnetDuJour(ctx).length, "question", "questions")} à revoir aujourd&apos;hui</span> };
    if (e.type === "blanc") return { num: <Icone nom="horloge" />, tit: <>DS blanc : {duree(e.minutes)}</>, sous: <span>sur feuille, sans corrigé, avec le minuteur</span> };
    const d = m.decoupe(e.ref);
    const i = d && fiche(d.fiche)?.items.find((x) => x.k === d.k && x.n === d.n);
    return {
      num: d ? (d.k === "q" ? `Q.${d.n}` : `Ex. ${d.n}`) : "",
      tit: <>{e.blanc ? "Correction : " : ""}{i ? <ContenuHtml html={i.titre} /> : "Question"}</>,
      sous: i ? <>{ds.fiches.length > 1 && d ? <span>Fiche {d.fiche}</span> : null}<PillNiveau n={i.niveau} />{i.duree ? <span>{i.duree} min</span> : null}{i.demande ? <span className="puce puce-bac">{etiquetteBac(i.demande)}</span> : null}</> : null,
    };
  };

  return (
    <>
      {fetee && <Confettis />}
      <Entete fil={<Link href="/app/ds">Mode DS</Link>} surtitre={`DS du ${dateLongue(ds.date)} · ${ds.duree} h`} titre={ds.fiches.map((n) => fiche(n)?.titre_court).join(", ")} />
      {fetee && (
        <section className="carte fete" style={{ marginBottom: 14 }}>
          <span className="medaille"><Icone nom="ok" /></span>
          <h2>Séance terminée, bravo !</h2>
          <p style={{ margin: 0 }}>{pluriel(faites, "séance faite", "séances faites")} sur {seances.length}. {enCours
            ? <>Prochaine séance {enCours.s.date <= jour ? "dès maintenant" : quand(jour, enCours.s.date)} : <b>{enCours.s.titre}</b>.</>
            : "Toute ta préparation est faite. Bon courage pour ton devoir !"}</p>
        </section>
      )}
      <section className="cockpit" style={{ gridTemplateColumns: "1fr" }}>
        <div className="compteurs">
          <div className="compteur"><div className="lib">{passe ? "Le devoir" : "Avant le devoir"}</div><div className="val">{passe ? "Fait" : `J−${j}`}</div><div className="det">{passe ? dateSimple(ds.date) : quand(jour, ds.date)}</div></div>
          <div className="compteur"><div className="lib">Préparation</div><div className="val">{faites}<small>/{seances.length}</small></div><div className="det">format {fmt.nom}, viser {ds.objectif}</div></div>
        </div>
      </section>
      {passe && <div className="carte" style={{ marginTop: 14 }}>
        {ds.note != null ? <><h2>Ta note : {nombre(ds.note, 1)} sur 20</h2><p className="discret" style={{ margin: 0 }}>Elle sert à calculer ta note estimée.{ds.moyenneClasse != null ? ` Moyenne de la classe : ${nombre(ds.moyenneClasse, 1)}.` : ""}</p></>
          : <><h2>Quelle note as-tu eue ?</h2><NoterDs id={ds.id} /></>}
      </div>}
      <p className="petit discret" style={{ margin: "14px 0 0" }}>{fmt.resume}{ds.offert ? " C'est ta préparation offerte : tous les corrigés de ce plan sont ouverts jusqu'au lendemain du devoir." : ""}</p>
      <div className="pile" style={{ marginTop: 14 }}>
        {seances.map(({ s, etapes, faite }) => {
          const commencee = etapes.some((x) => x.faite);
          return (
            <section className="carte" key={s.id}>
              <div className="tete"><div><div className="surtitre">{s.date === jour ? "Aujourd'hui" : s.date < jour ? dateSimple(s.date) : quand(jour, s.date)} · {duree(s.minutes)}</div><h2>{s.titre}</h2></div>
                {faite && etapes.length > 0 && !s.faite ? <span className="puce puce-ok"><Icone nom="ok" />Faite</span> : <CaseSeance ds={ds.id} seance={s.id} faite={s.faite} />}</div>
              {etapes.length ? (
                <ol className="liste">
                  {etapes.map(({ e, faite: ok }, i) => {
                    const l = libelle(e);
                    return (
                      <li key={e.id}><Link className="ligne" href={`/app/ds/${ds.id}/${s.id}/${i + 1}`}><span className="num">{l.num}</span>
                        <span><span className="tit">{l.tit}</span><span className="sous">{l.sous}</span></span>
                        <span className="fin"><Coche faite={ok} /><Icone nom="chevron" /></span></Link></li>
                    );
                  })}
                </ol>
              ) : <p className="discret" style={{ margin: 0 }}>Rien à travailler dans cette séance : tes points faibles sont déjà revus.</p>}
              {!faite && etapes.length > 0 && (
                <div className="actions" style={{ marginTop: 12 }}>
                  <Link className={`btn ${s === enCours?.s ? "btn-cuivre" : "btn-ligne"}`} href={`/app/ds/${ds.id}/${s.id}`}><Icone nom="lecture" />{commencee ? "Continuer cette séance" : "Commencer cette séance"}</Link>
                </div>
              )}
            </section>
          );
        })}
      </div>
      <div className="actions" style={{ marginTop: 16 }}><BoutonAction className="btn-texte" lancer={supprimer} confirmer="Confirmer la suppression">Supprimer ce DS</BoutonAction></div>
    </>
  );
}
