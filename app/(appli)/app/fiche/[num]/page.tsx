import Link from "next/link";
import { notFound } from "next/navigation";
import CaseVu from "@/components/appli/CaseVu";
import Icone from "@/components/appli/Icone";
import { BarreEtats, Entete, PillNiveau, Point } from "@/components/appli/Morceaux";
import ContenuHtml from "@/components/socle/ContenuHtml";
import { etiquetteBac, etiquetteDapres, p2, pluriel, points } from "@/lib/commun/format";
import * as m from "@/lib/moteur";
import { ficheComplete, type ItemLeger } from "@/lib/serveur/contenu/lecture";
import { exercicesVisibles } from "@/lib/serveur/python";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

const ONGLETS = [["essentiel", "L'essentiel"], ["questions", "Questions de cours"], ["exercices", "Exercices type BAC"], ["quiz", "Quiz"], ["tombe", "Tombé au BAC"], ["notions", "Notions"]] as const;
const NOM_ETAT = { "a-voir": "à voir", "en-cours": "en cours", acquis: "acquis", solide: "solide" };

export async function generateMetadata({ params }: { params: Promise<{ num: string }> }) {
  return { title: `Fiche ${Number((await params).num)}` };
}

export default async function Fiche({ params, searchParams }: { params: Promise<{ num: string }>; searchParams: Promise<{ onglet?: string; niveau?: string }> }) {
  const num = Number((await params).num);
  const sp = await searchParams;
  const onglet = ONGLETS.some(([id]) => id === sp.onglet) ? (sp.onglet as string) : "essentiel";
  const jeux = `/app/jeux?fiche=${num}`;
  const { ctx, catalogue, profil, session } = await espaceEleve();
  // les questions s'affichent pour un objectif : viser 14 demande aussi celles de l'objectif 10. Par défaut, l'objectif de l'élève.
  const visee = [10, 14, 18].includes(Number(sp.niveau)) ? Number(sp.niveau) : profil.note_visee;
  const f = catalogue.fiches.find((x) => x.num === num);
  if (!f) notFound();
  const complet = await ficheComplete(num);
  if (!complet) notFound();
  const nv = m.niveauFiche(ctx, num);
  const e = m.etatsFiche(ctx, num);
  const base = `/app/fiche/${p2(num)}`;
  const quiz = catalogue.quiz.filter((q) => q.fiche === num);
  // les exercices du hub Python sur ce chapitre (décision 0016)
  const enPython = exercicesVisibles(session.admin).filter((x) => x.fiche === num);

  const ligne = (i: ItemLeger) => {
    const k = m.cle(num, i.k, i.n);
    return (
      <li key={k}><Link className="ligne" href={`${base}/${i.k}${i.n}`}>
        <span className="num">{i.k === "q" ? `Q.${i.n}` : `Ex. ${i.n}`}</span>
        <span><span className="tit"><ContenuHtml html={i.titre} /></span>
          <span className="sous"><PillNiveau n={i.niveau} />
            {i.k === "ex" ? <span>{i.points ? `${points(i.points)} points` : ""}{i.duree ? ` · ${i.duree} min` : ""}</span> : <span>{i.type}</span>}
            {i.k === "ex" && i.voir_bac ? <span className="puce puce-bac">{etiquetteDapres(i.voir_bac)}</span> : i.demande ? <span className="puce puce-bac" title={i.demande}>{etiquetteBac(i.demande)}</span> : null}
            {ctx.etat.carnet[k] && <span className="puce puce-ko">À revoir</span>}</span></span>
        <span className="fin"><Point statut={m.statut(ctx.etat, k)} /><Icone nom="chevron" /></span></Link></li>
    );
  };

  let corps: React.ReactNode;
  if (onglet === "essentiel") {
    corps = <>
      <ContenuHtml bloc className="carte contenu" html={complet.essentiel_html} />
      {complet.pieges.length > 0 && <div className="carte" style={{ marginTop: 14 }}><h2>Les pièges qui coûtent des points</h2>
        <ul className="contenu">{complet.pieges.map((p, i) => <li key={i}><ContenuHtml html={p} /></li>)}</ul></div>}
      <Link className="carte carte-lien" href={jeux} style={{ marginTop: 14, display: "block" }}><h2>Retiens ces relations en jouant</h2>
        <p className="discret" style={{ margin: 0 }}>Paires, cartes mémoire, pluie de formules : dix jeux sur ce chapitre.</p></Link>
      {enPython.length > 0 && (
        <Link className="carte carte-lien" href={`/app/python?fiche=${num}`} style={{ marginTop: 14, display: "block" }}><h2>Programme-le en Python</h2>
          <p className="discret" style={{ margin: 0 }}>{pluriel(enPython.length, "exercice", "exercices")} du hub Python sur ce chapitre, proches de ceux des sujets du bac : {enPython.map((x) => `« ${x.titre} »`).join(", ")}.</p></Link>
      )}
    </>;
  } else if (onglet === "questions") {
    const nb = f.items.filter((i) => i.k === "q" && i.niveau <= visee).length;
    corps = <>
      <div className="filtres" role="group" aria-label="Choisir la note visée">
        {[10, 14, 18].map((L) => <Link key={L} href={`${base}?onglet=questions&niveau=${L}`} role="button" aria-pressed={visee === L}>Viser {L}</Link>)}
      </div>
      <p className="discret petit" style={{ margin: "8px 0 0" }}>Pour viser {visee} : {pluriel(nb, "question", "questions")}{visee === 10 ? ", celles de l'objectif 10" : visee === 14 ? ", celles des objectifs 10 et 14" : ", celles des objectifs 10, 14 et 18"}.</p>
      {f.themes.map((t) => {
        const items = t.questions.map((n) => f.items.find((i) => i.k === "q" && i.n === n)).filter((i): i is ItemLeger => !!i && i.niveau <= visee);
        return items.length ? <section key={t.num}><h2 className="groupe-titre">Thème {t.num} · <ContenuHtml html={t.titre} /></h2><ul className="liste">{items.map(ligne)}</ul></section> : null;
      })}
    </>;
  } else if (onglet === "exercices") {
    corps = <>
      <p className="discret">Des exercices de type bac, avec leur durée et leur barème.</p>
      <ul className="liste">{f.items.filter((i) => i.k === "ex").map(ligne)}</ul>
    </>;
  } else if (onglet === "quiz") {
    const parNiveau = [10, 14, 18].map((L) => quiz.filter((q) => q.niveau === L).length);
    const faits = quiz.filter((q) => m.statut(ctx.etat, m.cleQuiz(q.id))).length;
    corps = quiz.length ? (
      <div className="carte"><h2>Quiz du chapitre</h2>
        <p>{quiz.length} questions dans cette fiche : {parNiveau[0]} d&apos;objectif 10, {parNiveau[1]} d&apos;objectif 14, {parNiveau[2]} d&apos;objectif 18. Tu en as déjà fait {faits}.</p>
        <p className="discret petit">{quiz.length > 10 ? "Chaque quiz pose 10 questions" : "Le quiz pose toutes les questions"} : d&apos;abord celles que tu as ratées, puis celles que tu n&apos;as jamais faites. Il n&apos;est pas chronométré.</p>
        <div className="actions"><Link className="btn btn-cuivre" href={`/app/quiz/nouveau?fiche=${num}`}><Icone nom="lecture" />Lancer le quiz</Link></div></div>
    ) : <p className="vide">Cette fiche n&apos;a pas encore de quiz.</p>;
  } else if (onglet === "tombe") {
    corps = <ContenuHtml bloc className="carte contenu" html={complet.tombe_html} />;
  } else {
    corps = <>
      <p className="discret">Une notion est d&apos;abord à voir, puis en cours, puis acquise. Elle devient solide quand tu la réussis deux fois à une semaine d&apos;écart.</p>
      <ul className="liste">{f.liste_notions.map((n) => {
        const etat = m.etatNotion(ctx, num, n);
        return (
          <li key={n.id}><div className="ligne" style={{ gridTemplateColumns: "1fr auto" }}>
            <span><span className="tit"><ContenuHtml html={n.nom} /></span>
              <span className="sous">{n.refs.map(([k, x], i) => <span key={`${k}${x}`}>{i > 0 && " · "}<Link href={`${base}/${k}${x}`}>{k === "q" ? `Q.${x}` : `Ex. ${x}`}</Link></span>)}</span></span>
            <span className={etat === "acquis" || etat === "solide" ? "puce puce-ok" : "puce"} style={etat === "solide" ? { background: "var(--vert)", color: "var(--fond)" } : undefined}>{NOM_ETAT[etat]}</span>
          </div></li>
        );
      })}</ul>
    </>;
  }

  return (
    <>
      <Entete fil={<><Link href="/app/cours">Cours</Link> › <span>{f.domaine}</span></>} surtitre={`Fiche ${num} · physique-chimie`} titre={f.titre} />
      <div className="carte" style={{ display: "grid", gap: 10 }}>
        <CaseVu fiche={num} vu={!!ctx.etat.vuEnClasse[String(num)]} />
        <div className="actions">{nv.atteint ? <><PillNiveau n={nv.atteint} /> atteint</> : <span className="puce">Objectif 10 en cours</span>}<span className="petit discret">{e.acquis + e.solide} notions acquises sur {e.total}</span></div>
        <BarreEtats e={e} />
        <div className="actions">
          {nv.testDispo && nv.prochain ? <Link className="btn btn-cuivre" href={`/app/quiz/nouveau?fiche=${num}&passage=${nv.prochain}`}><Icone nom="medaille" />Test de passage à l&apos;objectif {nv.prochain}</Link>
            : nv.prochain ? <span className="petit discret">Pour atteindre l&apos;objectif {nv.prochain} : réussis 70 % de ses questions{nv.prochain > 10 ? ", puis passe un test de 15 minutes" : ""}.</span>
            : <span className="petit discret">Tu as atteint l&apos;objectif le plus haut.</span>}
        </div>
      </div>
      <nav className="onglets" aria-label="Parties de la fiche">
        {ONGLETS.map(([id, nom]) => <Link key={id} href={id === "essentiel" ? base : `${base}?onglet=${id}`} aria-current={id === onglet ? "page" : undefined}>{nom}</Link>)}
        <Link href={jeux}>Jeux</Link>
      </nav>
      {corps}
      <p className="petit discret" style={{ marginTop: 18 }}>Objectif visé : {profil.note_visee}.</p>
    </>
  );
}
