import Link from "next/link";
import { notFound } from "next/navigation";
import Icone from "@/components/appli/Icone";
import ItemTravail from "@/components/appli/ItemTravail";
import { PillNiveau } from "@/components/appli/Morceaux";
import ContenuHtml from "@/components/socle/ContenuHtml";
import { p2, points } from "@/lib/commun/format";
import * as m from "@/lib/moteur";
import { itemsComplets } from "@/lib/serveur/contenu/lecture";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export default async function Item({ params }: { params: Promise<{ num: string; item: string }> }) {
  const p = await params;
  const num = Number(p.num);
  const lu = p.item.match(/^(q|ex)(\d{1,3})$/);
  if (!lu) notFound();
  const k = lu[1] as "q" | "ex";
  const n = Number(lu[2]);
  const { ctx, catalogue } = await espaceEleve();
  const f = catalogue.fiches.find((x) => x.num === num);
  const leger = f?.items.find((i) => i.k === k && i.n === n);
  if (!f || !leger) notFound();
  const cle = m.cle(num, k, n);
  const [item] = await itemsComplets([cle]);
  if (!item) notFound();
  // Seuls l'énoncé et ses métadonnées partent dans la page. Le corrigé, les étapes et les indices restent sur le serveur.
  const theme = f.themes.find((t) => t.num === item.theme);
  const der = m.derniere(ctx.etat, cle);
  const ordre = f.themes.flatMap((t) => [...t.questions.map((x) => ["q", x] as const), ...t.exercices.map((x) => ["ex", x] as const)]);
  const i = ordre.findIndex(([a, b]) => a === k && b === n);
  const base = `/app/fiche/${p2(num)}`;
  const nom = (a: string, b: number) => (a === "q" ? `Q.${b}` : `Exercice ${b}`);
  return (
    <>
      <header className="entete apparait">
        <nav className="fil" aria-label="Fil d'Ariane"><Link href="/app/cours">Cours</Link> › <Link href={base}>Fiche {num} · {f.titre_court}</Link> › <Link href={`${base}?onglet=${k === "q" ? "questions" : "exercices"}`}>{k === "q" ? "Questions de cours" : "Exercices"}</Link></nav>
      </header>
      <div className={`bandeau-q ${k === "ex" ? "bandeau-ex" : ""}`}><span className="num">{nom(k, n)}</span><h1><ContenuHtml html={item.titre_html} /></h1></div>
      <div className="meta"><PillNiveau n={item.niveau} /><span>{item.type}</span>
        {item.points ? <span>{points(Number(item.points))} points</span> : null}{item.duree ? <span>{item.duree} min</span> : null}
        {item.demande ? <span className="puce puce-bac">{item.demande}</span> : null}
        {der && <span className={`puce ${der.r === "ok" ? "puce-ok" : der.r === "ko" ? "puce-ko" : ""}`}>Dernière fois : {{ ok: "réussi", partiel: "en partie", ko: "raté" }[der.r]}{k === "ex" ? ` (${Math.round(der.s * 100)} %)` : ""}</span>}</div>
      {item.mention && <p className="mention"><b>Sujet du BAC correspondant.</b> <ContenuHtml html={item.mention} /></p>}
      {k === "q" && theme?.preambule && (
        <details className="contexte" open><summary>Contexte commun à plusieurs questions du thème</summary><ContenuHtml bloc className="contenu" html={theme.preambule} /></details>
      )}
      <ContenuHtml bloc className="contenu enonce" html={item.enonce_html} />
      <ItemTravail cle={cle} reference={`fiche ${num} ${k}${n}`} exercice={k === "ex"} nbIndices={Math.min(2, item.indices.length)} />
      <div className="actions" style={{ justifyContent: "space-between", marginTop: 22 }}>
        {i > 0 ? <Link className="btn btn-ligne" href={`${base}/${ordre[i - 1][0]}${ordre[i - 1][1]}`}><Icone nom="retour" />{nom(ordre[i - 1][0], ordre[i - 1][1])}</Link> : <span />}
        {i < ordre.length - 1 ? <Link className="btn btn-ligne" href={`${base}/${ordre[i + 1][0]}${ordre[i + 1][1]}`}>{nom(ordre[i + 1][0], ordre[i + 1][1])}<Icone nom="chevron" /></Link> : <span />}
      </div>
    </>
  );
}
