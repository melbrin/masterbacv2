import ContenuHtml from "@/components/socle/ContenuHtml";
import { etiquetteBac, points } from "@/lib/commun/format";
import { PillNiveau } from "./Morceaux";

// L'énoncé d'une question ou d'un exercice, tel qu'il s'affiche dans les cours, dans la séance du jour
// et dans une séance de DS. Il ne reçoit que l'énoncé : le corrigé et les indices restent sur le serveur.
export interface ItemAffiche {
  genre: "q" | "ex";
  numero: number;
  niveau: number;
  type: string;
  demande: string;
  mention: string;
  points: number | null;
  duree: number | null;
  titre_html: string;
  enonce_html: string;
}

const NOM_RESULTAT = { ok: "réussi", partiel: "en partie", ko: "raté" };

export default function VueItem({ item, preambule, derniere, fiche }: {
  item: ItemAffiche;
  /** le contexte commun aux questions du thème, s'il y en a un */
  preambule?: string;
  derniere?: { r: "ok" | "partiel" | "ko"; s: number } | null;
  /** affiché devant le numéro quand l'énoncé sort de sa fiche (séance, DS) */
  fiche?: number;
}) {
  const exercice = item.genre === "ex";
  return (
    <>
      <div className={`bandeau-q ${exercice ? "bandeau-ex" : ""}`}>
        <span className="num">{fiche ? `Fiche ${fiche} · ` : ""}{exercice ? `Exercice ${item.numero}` : `Q.${item.numero}`}</span>
        <h1><ContenuHtml html={item.titre_html} /></h1>
      </div>
      <div className="meta"><PillNiveau n={item.niveau} /><span>{item.type}</span>
        {item.points ? <span>{points(Number(item.points))} points</span> : null}{item.duree ? <span>{item.duree} min</span> : null}
        {item.demande ? <span className="puce puce-bac" title={item.demande}>{etiquetteBac(item.demande)}</span> : null}
        {derniere && <span className={`puce ${derniere.r === "ok" ? "puce-ok" : derniere.r === "ko" ? "puce-ko" : ""}`}>Dernière fois : {NOM_RESULTAT[derniere.r]}{exercice ? ` (${Math.round(derniere.s * 100)} %)` : ""}</span>}</div>
      {item.mention && <p className="mention"><b>Sujet du BAC correspondant.</b> <ContenuHtml html={item.mention} /></p>}
      {!exercice && preambule && (
        <details className="contexte" open><summary>Contexte commun à plusieurs questions</summary><ContenuHtml bloc className="contenu" html={preambule} /></details>
      )}
      <ContenuHtml bloc className="contenu enonce" html={item.enonce_html} />
    </>
  );
}
