import Link from "next/link";
import { notFound } from "next/navigation";
import BoutonAction from "@/components/appli/BoutonAction";
import Icone from "@/components/appli/Icone";
import ItemTravail from "@/components/appli/ItemTravail";
import Minuteur from "@/components/appli/Minuteur";
import VueItem from "@/components/appli/VueItem";
import ContenuHtml from "@/components/socle/ContenuHtml";
import { dateLongue, duree, pluriel } from "@/lib/commun/format";
import * as m from "@/lib/moteur";
import { cocherEtape } from "@/lib/serveur/commandes/ds";
import { demarrerQuiz } from "@/lib/serveur/commandes/quiz";
import { enonceSeul, ficheComplete, itemsComplets } from "@/lib/serveur/contenu/lecture";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export const metadata = { title: "Préparation du DS" };

// Une étape d'une séance de préparation. Tout se passe ici, dans le mode DS : la lecture, le test,
// la question et sa correction. Un bouton mène à l'étape suivante.
export default async function Etape({ params }: { params: Promise<{ id: string; seance: string; rang: string }> }) {
  const p = await params;
  const { devoirs, catalogue, ctx } = await espaceEleve();
  const ds = devoirs.find((d) => d.id === p.id);
  const s = ds?.seances.find((x) => x.id === p.seance);
  if (!ds || !s || !/^\d{1,2}$/.test(p.rang)) notFound();
  const etapes = m.etapesDeSeance(s);
  const rang = Number(p.rang);
  const e = etapes[rang - 1];
  if (!e) notFound();
  const plan = `/app/ds/${ds.id}`;
  const reprise = `${plan}/${s.id}`;
  const faite = m.etapeFaite(ctx, ds.creeA, s, e);
  const resteAilleurs = etapes.some((x, i) => i !== rang - 1 && !m.etapeFaite(ctx, ds.creeA, s, x));
  const suite = { href: reprise, libelle: resteAilleurs ? "Étape suivante" : "Terminer la séance" };
  const fiche = (n: number) => catalogue.fiches.find((f) => f.num === n);
  const cocher = async () => { "use server"; return cocherEtape({ id: p.id, seance: p.seance, etape: e.id }); };
  const lancerTest = async () => { "use server"; return demarrerQuiz({ genre: "ds", ds: p.id, seance: p.seance }); };

  const tete = (titre?: string) => (
    <header className="entete apparait">
      <nav className="fil" aria-label="Fil d'Ariane"><Link href="/app/ds">Mode DS</Link> › <Link href={plan}>DS du {dateLongue(ds.date)}</Link></nav>
      <div className="surtitre">{s.titre} · étape {rang} sur {etapes.length}</div>
      {titre && <h1>{titre}</h1>}
    </header>
  );
  // sous une lecture : le bouton qui la coche, ou le rappel qu'elle est faite
  const validation = (libelle: string) => (
    <div className="actions suite-travail">
      {faite ? <><span className="puce puce-ok"><Icone nom="ok" />Étape faite</span><Link className="btn btn-cuivre" href={reprise}>{suite.libelle}<Icone nom="chevron" /></Link></>
        : <BoutonAction lancer={cocher}>{libelle}</BoutonAction>}
    </div>
  );
  const pied = (
    <div className="actions" style={{ justifyContent: "space-between", marginTop: 22 }}>
      <Link className="btn btn-ligne" href={plan}><Icone nom="retour" />Retour au plan</Link>
      {rang < etapes.length && <Link className="btn-texte" href={`${reprise}/${rang + 1}`}>Passer cette étape</Link>}
    </div>
  );

  if (e.type === "essentiel") {
    const complet = await ficheComplete(e.fiche);
    if (!complet) notFound();
    return (
      <>
        {tete(`L'essentiel : ${complet.titre_court}`)}
        <p className="discret">Relis ces relations jusqu&apos;à pouvoir les réécrire sans regarder.</p>
        <ContenuHtml bloc className="carte contenu" html={complet.essentiel_html} />
        {validation(resteAilleurs ? "J'ai relu : étape suivante" : "J'ai relu : terminer la séance")}
        {pied}
      </>
    );
  }

  if (e.type === "pieges") {
    const completes = (await Promise.all(e.fiches.map((n) => ficheComplete(n)))).filter((x) => x !== null);
    return (
      <>
        {tete("Les pièges à éviter")}
        <p className="discret">Ce sont les erreurs qui font perdre des points dans une copie. Relis-les avant le devoir.</p>
        <div className="pile">
          {completes.map((c) => (
            <section className="carte" key={c.num}><h2>{c.titre_court}</h2>
              {c.pieges.length ? <ul className="contenu">{c.pieges.map((x, i) => <li key={i}><ContenuHtml html={x} /></li>)}</ul> : <p className="discret">Pas de piège relevé pour ce chapitre.</p>}
            </section>
          ))}
        </div>
        {validation(resteAilleurs ? "J'ai relu : étape suivante" : "J'ai relu : terminer la séance")}
        {pied}
      </>
    );
  }

  if (e.type === "carnet") {
    const aRevoir = m.carnetDuJour(ctx).length;
    return (
      <>
        {tete("Ton carnet d'erreurs")}
        <section className="carte">
          <p>{aRevoir ? `Tu as ${pluriel(aRevoir, "question", "questions")} à revoir aujourd'hui dans ton carnet d'erreurs. ${aRevoir > 1 ? "Refais-les" : "Refais-la"}, puis reviens ici.` : "Tu n'as rien à revoir aujourd'hui dans ton carnet d'erreurs."}</p>
          {aRevoir > 0 && <div className="actions"><Link className="btn btn-ligne" href="/app/carnet"><Icone nom="carnet" />Ouvrir mon carnet</Link></div>}
        </section>
        {validation(resteAilleurs ? "C'est fait : étape suivante" : "C'est fait : terminer la séance")}
        {pied}
      </>
    );
  }

  if (e.type === "quiz") {
    return (
      <>
        {tete(`Test de ${pluriel(e.ids.length, "question", "questions")}`)}
        <section className="carte">
          {faite ? <p>Tu as fait ce test. Les questions ratées sont dans ton carnet d&apos;erreurs.</p>
            : <p>Réponds sans regarder ton cours. La correction s&apos;affiche après chaque réponse.</p>}
          <div className="actions">
            {faite ? <Link className="btn btn-cuivre" href={reprise}>{suite.libelle}<Icone nom="chevron" /></Link> : <BoutonAction lancer={lancerTest}>Commencer le test</BoutonAction>}
          </div>
        </section>
        {pied}
      </>
    );
  }

  if (e.type === "blanc") {
    const items = await itemsComplets(e.refs);
    const parCle = new Map(items.map((i) => [i.cle, i]));
    return (
      <>
        {tete(`DS blanc : ${duree(e.minutes)}`)}
        <div className="consigne"><p>Travaille dans les conditions du devoir : une copie, une calculatrice, pas de cours et pas de corrigé. Lance le minuteur et rédige sur papier.</p><Minuteur minutes={e.minutes} /></div>
        <div className="pile">
          {e.refs.map((ref, i) => {
            const item = parCle.get(ref);
            const d = m.decoupe(ref);
            if (!item || !d) return null;
            return <section className="carte" key={ref}><div className="surtitre">Partie {i + 1}</div>
              <VueItem fiche={d.fiche} item={enonceSeul(item)} preambule={fiche(d.fiche)?.themes.find((t) => t.num === item.theme)?.preambule} /></section>;
          })}
        </div>
        {validation("J'ai fini l'épreuve : passer à la correction")}
        {pied}
      </>
    );
  }

  // une question ou un exercice, avec sa correction
  const d = m.decoupe(e.ref);
  const [item] = await itemsComplets([e.ref]);
  if (!d || !item) notFound();
  return (
    <>
      {tete()}
      {e.blanc && <p className="petit discret">Correction de ton DS blanc : compare ta copie au corrigé.</p>}
      <VueItem fiche={d.fiche} item={enonceSeul(item)} preambule={fiche(d.fiche)?.themes.find((t) => t.num === item.theme)?.preambule} derniere={m.derniere(ctx.etat, e.ref)} />
      <ItemTravail key={e.ref} cle={e.ref} reference={`fiche ${d.fiche} ${d.k}${d.n}`} exercice={d.k === "ex"} nbIndices={e.blanc ? 0 : Math.min(2, item.indices.length)} contexte="ds" suite={suite} dejaFait={faite} />
      {pied}
    </>
  );
}
