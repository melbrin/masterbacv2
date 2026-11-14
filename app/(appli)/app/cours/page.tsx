import Link from "next/link";
import Icone from "@/components/appli/Icone";
import { BarreEtats, Entete, PillNiveau } from "@/components/appli/Morceaux";
import { p2 } from "@/lib/commun/format";
import * as m from "@/lib/moteur";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export const metadata = { title: "Cours" };

export default async function Cours({ searchParams }: { searchParams: Promise<{ vues?: string }> }) {
  const { ctx, catalogue } = await espaceEleve();
  const seulementVues = (await searchParams).vues === "1";
  const vus = new Set(m.chapitresVus(ctx));
  const carnet = m.carnet(ctx.etat);
  const domaines = [...new Set(catalogue.fiches.map((f) => f.domaine))];
  const groupes = domaines.map((d) => ({ d, fiches: catalogue.fiches.filter((f) => f.domaine === d && (!seulementVues || vus.has(f.num))) })).filter((g) => g.fiches.length);
  return (
    <>
      <Entete surtitre="Physique-chimie · terminale" titre="Les cours de l'année"
        sous={`Les ${catalogue.fiches.length} fiches de l'année, avec toutes les questions tombées au bac de 2004 à 2026.`} />
      <div className="filtres" role="group" aria-label="Filtrer les fiches">
        <Link href="/app/cours" role="button" aria-pressed={!seulementVues}>Toutes les fiches</Link>
        <Link href="/app/cours?vues=1" role="button" aria-pressed={seulementVues}>Vues en classe ({vus.size})</Link>
      </div>
      {groupes.length ? groupes.map((g) => (
        <section key={g.d}>
          <h2 className="groupe-titre">{g.d}</h2>
          <ul className="liste">
            {g.fiches.map((f) => {
              const nv = m.niveauFiche(ctx, f.num);
              const e = m.etatsFiche(ctx, f.num);
              const c = carnet.filter((x) => x.k.startsWith(`${f.num}-`)).length;
              return (
                <li key={f.num}><Link className="ligne" href={`/app/fiche/${p2(f.num)}`}><span className="num">F.{f.num}</span>
                  <span><span className="tit">{f.titre_court}</span>
                    <span className="sous"><span>{f.items.filter((i) => i.k === "q").length} questions · {f.items.filter((i) => i.k === "ex").length} exercices</span>
                      {vus.has(f.num) && <span className="puce puce-bleu">Vu en classe</span>}{nv.atteint > 0 && <PillNiveau n={nv.atteint} />}{c > 0 && <span className="puce puce-ko">{c} à revoir</span>}</span>
                    {e["a-voir"] < e.total && <span style={{ display: "block", marginTop: 8, maxWidth: 300 }}><BarreEtats e={e} /></span>}</span>
                  <span className="fin"><Icone nom="chevron" /></span></Link></li>
              );
            })}
          </ul>
        </section>
      )) : <p className="vide">Tu n&apos;as pas encore coché de chapitre vu en classe.</p>}
      <div className="legende-etats">
        <span><i style={{ background: "var(--vert)" }} />solide</span><span><i style={{ background: "color-mix(in srgb, var(--vert) 55%, var(--carte))" }} />acquis</span>
        <span><i style={{ background: "var(--cuivre)" }} />en cours</span><span><i style={{ background: "var(--carte-2)", border: "1px solid var(--filet)" }} />à voir</span>
      </div>
    </>
  );
}
