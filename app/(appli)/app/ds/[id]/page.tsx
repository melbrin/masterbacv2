import Link from "next/link";
import { notFound } from "next/navigation";
import BoutonAction from "@/components/appli/BoutonAction";
import CaseSeance from "@/components/appli/CaseSeance";
import Icone from "@/components/appli/Icone";
import { Entete, PillNiveau, Point } from "@/components/appli/Morceaux";
import NoterDs from "@/components/appli/NoterDs";
import ContenuHtml from "@/components/socle/ContenuHtml";
import { ecartEnJours } from "@/lib/commun/dates";
import { dateLongue, dateSimple, duree, nombre, p2, quand } from "@/lib/commun/format";
import * as m from "@/lib/moteur";
import { supprimerDs } from "@/lib/serveur/commandes/ds";
import { demarrerQuiz } from "@/lib/serveur/commandes/quiz";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export const metadata = { title: "Préparation du DS" };
const FORMATS: Record<string, { nom: string; resume: string }> = {
  express: { nom: "Express", resume: "20 minutes : l'essentiel du chapitre, un quiz de 10 questions au plus, les pièges." },
  "trois-jours": { nom: "Trois jours", resume: "3 séances de 30 minutes : un test, des exercices ciblés sur tes points faibles, un exercice type." },
  semaine: { nom: "Une semaine", resume: "5 séances, puis un DS blanc chronométré au format du devoir, et l'essentiel la veille." },
};

export default async function PlanDs({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const { devoirs, catalogue, ctx, jour } = await espaceEleve();
  const ds = devoirs.find((d) => d.id === id);
  if (!ds) notFound();
  const j = ecartEnJours(jour, ds.date);
  const passe = j < 0;
  const faites = ds.seances.filter((s) => s.faite).length;
  const fmt = FORMATS[ds.format ?? "express"];
  const fiche = (n: number) => catalogue.fiches.find((f) => f.num === n);
  const lienItem = (c: string) => {
    const d = m.decoupe(c);
    const i = d && fiche(d.fiche)?.items.find((x) => x.k === d.k && x.n === d.n);
    if (!d || !i) return null;
    return <li key={c}><Link className="ligne" href={`/app/fiche/${p2(d.fiche)}/${d.k}${d.n}`}><span className="num">{d.k === "q" ? `Q.${d.n}` : `Ex. ${d.n}`}</span>
      <span><span className="tit"><ContenuHtml html={i.titre} /></span><span className="sous"><PillNiveau n={i.niveau} />{i.duree ? <span>{i.duree} min</span> : null}{i.demande ? <span className="puce puce-bac">Tombé au BAC</span> : null}</span></span>
      <span className="fin"><Point statut={m.statut(ctx.etat, c)} /><Icone nom="chevron" /></span></Link></li>;
  };
  const supprimer = async () => { "use server"; return supprimerDs({ id }); };
  return (
    <>
      <Entete fil={<Link href="/app/ds">Mode DS</Link>} surtitre={`DS du ${dateLongue(ds.date)} · ${ds.duree} h`} titre={ds.fiches.map((n) => fiche(n)?.titre_court).join(", ")} />
      <section className="cockpit" style={{ gridTemplateColumns: "1fr" }}>
        <div className="compteurs">
          <div className="compteur"><div className="lib">{passe ? "Le devoir" : "Avant le devoir"}</div><div className="val">{passe ? "Fait" : `J−${j}`}</div><div className="det">{passe ? dateSimple(ds.date) : quand(jour, ds.date)}</div></div>
          <div className="compteur"><div className="lib">Préparation</div><div className="val">{faites}<small>/{ds.seances.length}</small></div><div className="det">format {fmt.nom}, viser {ds.objectif}</div></div>
        </div>
      </section>
      {passe && <div className="carte" style={{ marginTop: 14 }}>
        {ds.note != null ? <><h2>Ta note : {nombre(ds.note, 1)} sur 20</h2><p className="discret" style={{ margin: 0 }}>Elle recale ta note estimée.{ds.moyenneClasse != null ? ` Moyenne de la classe : ${nombre(ds.moyenneClasse, 1)}.` : ""}</p></>
          : <><h2>Quelle note as-tu eue ?</h2><NoterDs id={ds.id} /></>}
      </div>}
      <p className="petit discret" style={{ margin: "14px 0 0" }}>{fmt.resume}{ds.offert ? " Préparation offerte : les corrigés de ce plan sont ouverts jusqu'au lendemain du devoir." : ""}</p>
      <div className="pile" style={{ marginTop: 14 }}>
        {ds.seances.map((s) => (
          <section className="carte" key={s.id}>
            <div className="tete"><div><div className="surtitre">{s.date === jour ? "Aujourd'hui" : s.date < jour ? dateSimple(s.date) : quand(jour, s.date)} · {duree(s.minutes)}</div><h2>{s.titre}</h2></div>
              <CaseSeance ds={ds.id} seance={s.id} faite={s.faite} /></div>
            <ul className="liste">
              {s.taches.map((t, i) => {
                if (t.type === "essentiel") return <li key={i}><Link className="ligne" href={`/app/fiche/${p2(t.fiche)}`}><span className="num"><Icone nom="papier" /></span><span><span className="tit">L&apos;essentiel en une page : {fiche(t.fiche)?.titre_court}</span><span className="sous">les relations à connaître, les pièges</span></span><span className="fin"><Icone nom="chevron" /></span></Link></li>;
                if (t.type === "quiz") {
                  const lancer = async () => { "use server"; return demarrerQuiz({ genre: "ds", ds: id, seance: s.id }); };
                  return <li key={i}><div className="ligne"><span className="num"><Icone nom="eclair" /></span><span><span className="tit">Test de {t.ids.length} question{t.ids.length > 1 ? "s" : ""}</span><span className="sous">corrigé tout de suite</span></span>
                    <span className="fin"><BoutonAction className="btn" lancer={lancer}>Lancer</BoutonAction></span></div></li>;
                }
                if (t.type === "questions") return t.refs.map(lienItem);
                if (t.type === "exercice") return lienItem(t.ref);
                if (t.type === "pieges") return t.fiches.map((n) => <li key={`${i}-${n}`}><Link className="ligne" href={`/app/fiche/${p2(n)}`}><span className="num"><Icone nom="drapeau" /></span><span><span className="tit">Les pièges qui coûtent des points</span><span className="sous">fiche {n}, sous l&apos;essentiel</span></span><span className="fin"><Icone nom="chevron" /></span></Link></li>);
                if (t.type === "carnet") return <li key={i}><Link className="ligne" href="/app/carnet"><span className="num"><Icone nom="carnet" /></span><span><span className="tit">Ton carnet d&apos;erreurs</span><span className="sous">{m.carnetDuJour(ctx).length} questions à revoir</span></span><span className="fin"><Icone nom="chevron" /></span></Link></li>;
                return [
                  <li key={i}><div className="ligne"><span className="num"><Icone nom="horloge" /></span><span><span className="tit">DS blanc chronométré : {duree(t.minutes)}</span><span className="sous">Lance un minuteur, travaille sur feuille sans ouvrir de corrigé, puis corrige-toi au barème.</span></span><span className="fin" /></div></li>,
                  ...t.refs.map(lienItem),
                ];
              })}
            </ul>
          </section>
        ))}
      </div>
      <div className="actions" style={{ marginTop: 16 }}><BoutonAction className="btn-texte" lancer={supprimer} confirmer="Confirmer la suppression">Supprimer ce DS</BoutonAction></div>
    </>
  );
}
