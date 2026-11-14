import Link from "next/link";
import Icone from "@/components/appli/Icone";
import { Entete } from "@/components/appli/Morceaux";
import { dateLongue, nombre } from "@/lib/commun/format";
import { ecartEnJours } from "@/lib/commun/dates";
import * as m from "@/lib/moteur";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export const metadata = { title: "Mode DS" };

export default async function ListeDs() {
  const { devoirs, catalogue, jour, droits, profil, ctx } = await espaceEleve();
  const titre = (fiches: number[]) => fiches.map((n) => catalogue.fiches.find((f) => f.num === n)?.titre_court).join(", ");
  const aVenir = devoirs.filter((d) => d.date >= jour).sort((a, b) => a.date.localeCompare(b.date));
  const passes = devoirs.filter((d) => d.date < jour).sort((a, b) => b.date.localeCompare(a.date));
  const peutCreer = droits.coach || profil.ds_offertes > 0;
  return (
    <>
      <Entete surtitre="Mode DS" titre="Prépare ton prochain DS" sous="Saisis la date, la durée et les chapitres de ton devoir. Ton plan de révision est généré automatiquement, selon la note que tu vises." />
      <div className="actions">
        {peutCreer ? <Link className="btn btn-cuivre" href="/app/ds/nouveau"><Icone nom="plus" />Préparer un DS</Link>
          : <p className="carte" style={{ borderColor: "var(--cuivre)" }}>Ta préparation offerte est utilisée. Le Pass ouvre le mode DS sans limite. <Link href="/app/offres">Voir les offres</Link></p>}
        {!droits.coach && profil.ds_offertes > 0 && <span className="puce puce-ok">Une préparation offerte</span>}
      </div>
      <div className="section-titre"><h2>À venir</h2></div>
      {aVenir.length ? <ul className="liste">{aVenir.map((d) => {
        const faites = d.seances.filter((s) => m.seancePlanFaite(ctx, d.creeA, s)).length;
        return <li key={d.id}><Link className="ligne" href={`/app/ds/${d.id}`}><span className="num">J−{ecartEnJours(jour, d.date)}</span>
          <span><span className="tit">{titre(d.fiches)}</span><span className="sous"><span>{dateLongue(d.date)} · {d.duree} h</span><span>{faites} séance{faites > 1 ? "s" : ""} sur {d.seances.length}</span>{d.offert && <span className="puce puce-ok">Offerte</span>}</span></span>
          <span className="fin"><Icone nom="chevron" /></span></Link></li>;
      })}</ul> : <p className="vide">Aucun devoir à venir.</p>}
      {passes.length > 0 && <>
        <div className="section-titre"><h2>Passés</h2></div>
        <ul className="liste">{passes.map((d) => (
          <li key={d.id}><Link className="ligne" href={`/app/ds/${d.id}`}><span className="num">{d.note != null ? nombre(d.note, 1) : "?"}</span>
            <span><span className="tit">{titre(d.fiches)}</span><span className="sous"><span>{dateLongue(d.date)}</span>{d.note == null ? <span className="puce puce-ko">Note à saisir</span> : d.moyenneClasse != null ? <span>moyenne de la classe : {nombre(d.moyenneClasse, 1)}</span> : null}</span></span>
            <span className="fin"><Icone nom="chevron" /></span></Link></li>
        ))}</ul>
      </>}
    </>
  );
}
