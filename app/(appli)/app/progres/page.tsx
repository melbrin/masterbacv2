import Link from "next/link";
import Icone from "@/components/appli/Icone";
import { BarreEtats, Entete, PillNiveau } from "@/components/appli/Morceaux";
import { dateSimple, nombre, p2 } from "@/lib/commun/format";
import * as m from "@/lib/moteur";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export const metadata = { title: "Progrès" };

export default async function Progres() {
  const { ctx, catalogue, devoirs, profil } = await espaceEleve();
  const note = m.noteEstimee(ctx);
  const affichable = note && note.notes >= 1 && note.essais >= 20;
  const vus = m.chapitresVus(ctx);
  const notes = devoirs.filter((d) => d.note != null).sort((a, b) => a.date.localeCompare(b.date));
  const periode = m.periodeActuelle(ctx);
  return (
    <>
      <Entete titre="Tes progrès" sous={`Tu vises ${profil.note_visee}. Période en cours : ${periode.nom.toLowerCase()}.`} />
      <section className="cockpit" style={{ gridTemplateColumns: "1fr" }}>
        {affichable ? (
          <div className="note"><span>Note estimée en physique-chimie</span><b className="chiffres">{nombre(note.valeur, 1)}</b><span>entre {note.bas} et {note.haut}</span></div>
        ) : (
          <div className="note"><span>Ta note estimée ne s&apos;affiche pas encore. Il manque : {[
            !note || note.notes < 1 ? "une note de DS saisie" : "",
            !note || note.essais < 20 ? `${20 - (note?.essais ?? 0)} questions travaillées de plus` : "",
          ].filter(Boolean).join(" et ")}.</span></div>
        )}
      </section>
      <p className="petit discret" style={{ marginTop: 10 }}>La note estimée part de ta réussite aux trois niveaux de chaque chapitre vu en classe, puis se recale sur tes trois dernières notes de DS. Elle est donnée avec sa fourchette : ce n&apos;est pas une promesse.</p>

      <div className="section-titre"><h2>Tes chapitres</h2><Link href="/app/cours">Tous les cours</Link></div>
      {vus.length ? <ul className="liste">{vus.map((n) => {
        const f = catalogue.fiches.find((x) => x.num === n)!;
        const nv = m.niveauFiche(ctx, n);
        const e = m.etatsFiche(ctx, n);
        return (
          <li key={n}><Link className="ligne" href={`/app/fiche/${p2(n)}`}><span className="num">F.{n}</span>
            <span><span className="tit">{f.titre_court}</span>
              <span className="sous">{nv.atteint ? <><PillNiveau n={nv.atteint} /> atteint</> : <span>Niveau 10 en cours</span>}
                {nv.prochain && <span>pour le niveau {nv.prochain} : {nv.res[nv.prochain].faits} questions faites sur {nv.res[nv.prochain].total}, {Math.round(nv.res[nv.prochain].taux * 100)} % de réussite</span>}
                {nv.testDispo && <span className="puce puce-ok">Test de passage disponible</span>}</span>
              <span className="sous"><span>{e.solide} solides · {e.acquis} acquises · {e["en-cours"]} en cours · {e["a-voir"]} à voir</span></span>
              <span style={{ display: "block", marginTop: 6, maxWidth: 300 }}><BarreEtats e={e} /></span></span>
            <span className="fin"><Icone nom="chevron" /></span></Link></li>
        );
      })}</ul> : <p className="vide">Coche dans les cours les chapitres vus en classe pour suivre tes niveaux.</p>}

      <div className="section-titre"><h2>Tes notes de DS</h2><Link href="/app/ds">Mode DS</Link></div>
      {notes.length ? <ul className="liste">{notes.map((d) => (
        <li key={d.id}><div className="ligne"><span className="num">{nombre(d.note as number, 1)}</span>
          <span><span className="tit">{d.fiches.map((n) => catalogue.fiches.find((f) => f.num === n)?.titre_court).join(", ")}</span>
            <span className="sous"><span>{dateSimple(d.date)}</span>{d.moyenneClasse != null && <span>moyenne de la classe : {nombre(d.moyenneClasse, 1)}</span>}</span></span><span className="fin" /></div></li>
      ))}</ul> : <p className="vide">Aucune note saisie pour l&apos;instant. Après chaque devoir, saisis ta note : elle mesure tes progrès.</p>}
    </>
  );
}
