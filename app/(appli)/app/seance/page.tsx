import Link from "next/link";
import BoutonAction from "@/components/appli/BoutonAction";
import Icone from "@/components/appli/Icone";
import { Entete } from "@/components/appli/Morceaux";
import ContenuHtml from "@/components/socle/ContenuHtml";
import { p2 } from "@/lib/commun/format";
import * as m from "@/lib/moteur";
import { demarrerQuiz } from "@/lib/serveur/commandes/quiz";
import { commencerSeance, terminerSeance } from "@/lib/serveur/commandes/seance";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export const metadata = { title: "Séance du jour" };

export default async function Seance() {
  const { ctx, catalogue, droits } = await espaceEleve();
  const gardee = ctx.etat.seance;
  const s = m.seanceDuJour(ctx);
  const commencer = async () => { "use server"; return commencerSeance({}); };
  const terminer = async () => { "use server"; return terminerSeance({}); };
  const quiz = async () => { "use server"; return demarrerQuiz({ genre: "seance" }); };
  const item = (c: string) => {
    const d = m.decoupe(c);
    const i = d && catalogue.fiches.find((f) => f.num === d.fiche)?.items.find((x) => x.k === d.k && x.n === d.n);
    return d && i ? { d, i, href: `/app/fiche/${p2(d.fiche)}/${d.k}${d.n}` } : null;
  };
  const carnet = s.revoir.filter((k) => !k.startsWith("quiz:")).map(item).filter((x) => x !== null);
  const nbQuiz = s.revoir.filter((k) => k.startsWith("quiz:")).length;
  const exo = s.exercice ? item(s.exercice) : null;

  if (!gardee) {
    return (
      <>
        <Entete surtitre="25 minutes" titre="Ta séance du jour" sous="5 minutes de questions à revoir, 15 minutes d'un exercice sur papier, 5 minutes de correction." />
        <div className="carte"><p>Prends une feuille et un stylo. Le téléphone donne l&apos;énoncé et la correction : tu rédiges sur papier, comme le jour de l&apos;épreuve.</p>
          <div className="actions"><BoutonAction lancer={commencer}>Commencer la séance</BoutonAction></div></div>
      </>
    );
  }
  return (
    <>
      <Entete fil={<Link href="/app">Aujourd&apos;hui</Link>} surtitre="25 minutes" titre="Ta séance du jour" />
      {droits.coach ? (
        <section className="carte">
          <div className="surtitre">1 · 5 minutes</div><h2>À revoir</h2>
          {carnet.length === 0 && nbQuiz === 0 && <p className="discret">Rien à revoir aujourd&apos;hui : passe à l&apos;exercice.</p>}
          {carnet.length > 0 && <ul className="liste">{carnet.map(({ d, i, href }) => (
            <li key={href}><Link className="ligne" href={href}><span className="num">{d.k === "q" ? `Q.${d.n}` : `Ex. ${d.n}`}</span><span><span className="tit"><ContenuHtml html={i.titre} /></span><span className="sous"><span>Fiche {d.fiche} · carnet d&apos;erreurs</span></span></span><span className="fin"><Icone nom="chevron" /></span></Link></li>
          ))}</ul>}
          {nbQuiz > 0 && <div className="actions" style={{ marginTop: 10 }}><BoutonAction className="btn" lancer={quiz}>Faire {nbQuiz > 1 ? `les ${nbQuiz} questions` : "la question"} de quiz</BoutonAction></div>}
        </section>
      ) : (
        <p className="carte" style={{ borderColor: "var(--cuivre)" }}>Avec l&apos;offre gratuite, la séance se réduit à l&apos;exercice du jour et à sa correction. <Link href="/app/offres">Voir le Pass</Link></p>
      )}
      <section className="carte" style={{ marginTop: 14 }}>
        <div className="surtitre">{droits.coach ? "2 · 15 minutes" : "15 minutes"}</div><h2>Un exercice sur papier</h2>
        {exo ? <ul className="liste"><li><Link className="ligne" href={exo.href}><span className="num">{exo.d.k === "q" ? `Q.${exo.d.n}` : `Ex. ${exo.d.n}`}</span>
          <span><span className="tit"><ContenuHtml html={exo.i.titre} /></span><span className="sous"><span>Fiche {exo.d.fiche}</span><span>son corrigé est ouvert aujourd&apos;hui</span></span></span><span className="fin"><Icone nom="chevron" /></span></Link></li></ul>
          : <p className="discret">Aucune question à proposer sur tes chapitres. Coche un chapitre vu en classe dans les cours.</p>}
      </section>
      <section className="carte" style={{ marginTop: 14 }}>
        <div className="surtitre">{droits.coach ? "3 · 5 minutes" : "5 minutes"}</div><h2>La correction</h2>
        <p>Ouvre le corrigé de l&apos;exercice, compare avec ta feuille et note ce que tu as obtenu. Puis valide ta séance.</p>
        <div className="actions">{gardee.faite ? <span className="puce puce-ok">Séance faite</span> : <BoutonAction lancer={terminer}>J&apos;ai fini ma séance</BoutonAction>}</div>
      </section>
    </>
  );
}
