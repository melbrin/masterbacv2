import Link from "next/link";
import { notFound } from "next/navigation";
import Icone from "@/components/appli/Icone";
import ItemTravail from "@/components/appli/ItemTravail";
import VueItem from "@/components/appli/VueItem";
import { p2 } from "@/lib/commun/format";
import * as m from "@/lib/moteur";
import { enonceSeul, itemsComplets } from "@/lib/serveur/contenu/lecture";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export default async function Item({ params, searchParams }: { params: Promise<{ num: string; item: string }>; searchParams: Promise<{ de?: string }> }) {
  const p = await params;
  const num = Number(p.num);
  const lu = p.item.match(/^(q|ex)(\d{1,3})$/);
  if (!lu) notFound();
  const k = lu[1] as "q" | "ex";
  const n = Number(lu[2]);
  // ouverte depuis le carnet d'erreurs, la question y ramène une fois corrigée
  const duCarnet = (await searchParams).de === "carnet";
  const { ctx, catalogue } = await espaceEleve();
  const f = catalogue.fiches.find((x) => x.num === num);
  const leger = f?.items.find((i) => i.k === k && i.n === n);
  if (!f || !leger) notFound();
  const cle = m.cle(num, k, n);
  const [item] = await itemsComplets([cle]);
  if (!item) notFound();
  // Seuls l'énoncé et ses métadonnées partent dans la page. Le corrigé, les étapes et les indices restent sur le serveur.
  const theme = f.themes.find((t) => t.num === item.theme);
  const ordre = f.themes.flatMap((t) => [...t.questions.map((x) => ["q", x] as const), ...t.exercices.map((x) => ["ex", x] as const)]);
  const i = ordre.findIndex(([a, b]) => a === k && b === n);
  const base = `/app/fiche/${p2(num)}`;
  const nom = (a: string, b: number) => (a === "q" ? `Q.${b}` : `Exercice ${b}`);
  return (
    <>
      <header className="entete apparait">
        <nav className="fil" aria-label="Fil d'Ariane">
          {duCarnet ? <Link href="/app/carnet">Carnet d&apos;erreurs</Link>
            : <><Link href="/app/cours">Cours</Link> › <Link href={base}>Fiche {num} · {f.titre_court}</Link> › <Link href={`${base}?onglet=${k === "q" ? "questions" : "exercices"}`}>{k === "q" ? "Questions de cours" : "Exercices"}</Link></>}
        </nav>
      </header>
      <VueItem fiche={duCarnet ? num : undefined} item={enonceSeul(item)} preambule={theme?.preambule} derniere={m.derniere(ctx.etat, cle)} />
      <ItemTravail key={cle} cle={cle} reference={`fiche ${num} ${k}${n}`} exercice={k === "ex"} nbIndices={Math.min(2, item.indices.length)}
        contexte={duCarnet ? "carnet" : "libre"} suite={duCarnet ? { href: "/app/carnet", libelle: "Retour au carnet" } : undefined} />
      {!duCarnet && (
        <div className="actions" style={{ justifyContent: "space-between", marginTop: 22 }}>
          {i > 0 ? <Link className="btn btn-ligne" href={`${base}/${ordre[i - 1][0]}${ordre[i - 1][1]}`}><Icone nom="retour" />{nom(ordre[i - 1][0], ordre[i - 1][1])}</Link> : <span />}
          {i < ordre.length - 1 ? <Link className="btn btn-ligne" href={`${base}/${ordre[i + 1][0]}${ordre[i + 1][1]}`}>{nom(ordre[i + 1][0], ordre[i + 1][1])}<Icone nom="chevron" /></Link> : <span />}
        </div>
      )}
    </>
  );
}
