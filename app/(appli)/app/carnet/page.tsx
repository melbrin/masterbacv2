import Link from "next/link";
import BoutonAction from "@/components/appli/BoutonAction";
import Icone from "@/components/appli/Icone";
import { Entete } from "@/components/appli/Morceaux";
import ContenuHtml from "@/components/socle/ContenuHtml";
import { p2, quand } from "@/lib/commun/format";
import * as m from "@/lib/moteur";
import { demarrerQuiz } from "@/lib/serveur/commandes/quiz";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export const metadata = { title: "Carnet d'erreurs" };

export default async function Carnet() {
  const { ctx, catalogue, jour } = await espaceEleve();
  const tout = m.carnet(ctx.etat);
  const duJour = tout.filter((c) => c.due <= jour);
  const ensuite = tout.filter((c) => c.due > jour);
  const nbQuiz = duJour.filter((c) => c.k.startsWith("quiz:")).length;
  const ligne = (c: (typeof tout)[number]) => {
    const d = m.decoupe(c.k);
    const f = d && catalogue.fiches.find((x) => x.num === d.fiche);
    const item = f?.items.find((i) => i.k === d?.k && i.n === d?.n);
    const contenu = (
      <>
        <span className="num">{d ? (d.k === "q" ? `Q.${d.n}` : `Ex. ${d.n}`) : "Quiz"}</span>
        <span><span className="tit">{item ? <ContenuHtml html={item.titre} /> : "Question de quiz"}</span>
          <span className="sous">{d && <span>Fiche {d.fiche}</span>}<span>{c.due <= jour ? "à revoir aujourd'hui" : `revient ${quand(jour, c.due)}`}</span><span>révision {c.step + 1} sur 3</span></span></span>
      </>
    );
    return d
      ? <li key={c.k}><Link className="ligne" href={`/app/fiche/${p2(d.fiche)}/${d.k}${d.n}?de=carnet`}>{contenu}<span className="fin"><Icone nom="chevron" /></span></Link></li>
      : <li key={c.k}><div className="ligne">{contenu}<span className="fin" /></div></li>;
  };
  const lancer = async () => { "use server"; return demarrerQuiz({ genre: "carnet" }); };
  return (
    <>
      <Entete titre="Carnet d'erreurs" sous="Tu revois ici chaque question ratée ou réussie en partie : 2 jours plus tard, puis une semaine après, puis trois semaines après. Si tu la rates encore, elle repart du début." />
      <div className="section-titre"><h2>À revoir aujourd&apos;hui</h2><span className={`puce ${duJour.length ? "puce-ko" : "puce-ok"}`}>{duJour.length}</span></div>
      {duJour.length ? <ul className="liste">{duJour.map(ligne)}</ul> : <p className="vide">Rien à revoir aujourd&apos;hui.</p>}
      {nbQuiz > 0 && <div className="actions" style={{ marginTop: 12 }}><BoutonAction lancer={lancer}>Réviser les {nbQuiz > 1 ? `${nbQuiz} questions` : "la question"} de quiz</BoutonAction></div>}
      <div className="section-titre"><h2>Ce qui arrive ensuite</h2><span className="puce">{ensuite.length}</span></div>
      {ensuite.length ? <ul className="liste">{ensuite.map(ligne)}</ul> : <p className="vide">Aucune révision prévue.</p>}
    </>
  );
}
