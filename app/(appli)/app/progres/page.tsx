import Link from "next/link";
import { BarresSemaines, CourbeNotes } from "@/components/appli/Graphiques";
import Icone from "@/components/appli/Icone";
import { BarreEtats, Entete, PillNiveau } from "@/components/appli/Morceaux";
import { ajouteJours } from "@/lib/commun/dates";
import { dateSimple, initialeJour, nombre, p2, pluriel } from "@/lib/commun/format";
import * as m from "@/lib/moteur";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export const metadata = { title: "Progrès" };

export default async function Progres() {
  const { ctx, catalogue, devoirs, profil, jour } = await espaceEleve();
  const note = m.noteEstimee(ctx);
  const affichable = note && note.notes >= 1 && note.essais >= 20;
  const vus = m.chapitresVus(ctx);
  const notes = devoirs.filter((d) => d.note != null).sort((a, b) => a.date.localeCompare(b.date));
  const semaines = m.travailParSemaine(ctx, 8);
  const serie = m.series(ctx);
  const prevues = m.seancesPrevues(ctx.reglages, profil.note_visee);
  // les chapitres suivis : ceux vus en classe, et ceux où l'élève a déjà travaillé
  const suivis = catalogue.fiches.map((f) => ({ f, e: m.etatsFiche(ctx, f.num), nv: m.niveauFiche(ctx, f.num) }))
    .filter((x) => vus.includes(x.f.num) || x.e["a-voir"] < x.e.total);
  const nums = suivis.map((x) => x.f.num);
  const reussite = m.reussiteParNiveau(ctx, nums);
  const mois = m.bilanDepuis(ctx, nums, `${jour.slice(0, 7)}-01`);
  const debut = ajouteJours(m.lundi(jour), -21);
  const quatreSemaines = Array.from({ length: 28 }, (_, i) => ajouteJours(debut, i));
  const faits = new Set(ctx.etat.seances.map((s) => s.date));
  const total28 = quatreSemaines.filter((d) => faits.has(d)).length;
  const tests = suivis.filter((x) => x.nv.testDispo && x.nv.prochain);
  const gagnees = mois.notionsMaintenant - mois.notionsAvant;

  return (
    <>
      <Entete titre="Tes progrès" sous={`Tu vises ${profil.note_visee} en physique-chimie.`} />

      <section className="carte">
        <div className="tete"><h2>Ta note estimée</h2>{affichable && <span className="puce">entre {note.bas} et {note.haut}</span>}</div>
        {affichable ? <div className="score-final"><b className="chiffres">{nombre(note.valeur, 1)}</b><span>sur 20</span></div>
          : <p>Elle s&apos;affichera quand tu auras {[
            !vus.length ? "coché dans les cours tes chapitres vus en classe" : "",
            !note || note.notes < 1 ? "saisi une note de DS" : "",
            !note || note.essais < 20 ? `travaillé ${pluriel(20 - (note?.essais ?? 0), "question", "questions")}${note?.essais ? " de plus" : ""} sur ces chapitres` : "",
          ].filter(Boolean).join(", ")}.</p>}
        {notes.length > 0 ? <CourbeNotes aujourdhui={jour} notes={notes.map((d) => ({ jour: d.date, note: d.note as number }))} estimee={affichable ? note : null} />
          : <p className="discret petit" style={{ margin: 0 }}>Après chaque devoir, saisis ta note dans le mode DS : la courbe de tes notes s&apos;affichera ici.</p>}
        <details style={{ marginTop: 8 }}><summary className="petit" style={{ cursor: "pointer", fontWeight: 700 }}>Comment est-elle calculée ?</summary>
          <p className="petit discret" style={{ margin: "8px 0 0" }}>Pour chaque chapitre vu en classe, on regarde ta réussite aux questions des objectifs 10, 14 et 18. Le résultat est ensuite ajusté avec tes trois dernières notes de DS. Plus tu travailles, plus la fourchette se resserre. C&apos;est une estimation, pas une promesse.</p></details>
      </section>

      <div className="section-titre"><h2>Ce mois-ci</h2><span className="petit discret">depuis le {dateSimple(mois.debut)}</span></div>
      <div className="chiffres-cles">
        <div className="carte"><b className="chiffres">{mois.seances}</b><span>{mois.seances > 1 ? "séances faites" : "séance faite"}</span></div>
        <div className="carte"><b className="chiffres">{mois.questions}</b><span>{mois.questions > 1 ? "réponses données" : "réponse donnée"}</span></div>
        <div className="carte"><b className="chiffres">{gagnees > 0 ? `+${gagnees}` : gagnees}</b><span>{Math.abs(gagnees) > 1 ? "notions acquises" : "notion acquise"}</span></div>
      </div>

      <div className="section-titre"><h2>Ton travail, semaine après semaine</h2></div>
      <section className="carte">
        <p className="petit discret" style={{ margin: "0 0 6px" }}>Le nombre de réponses que tu as données chaque semaine, sur 8 semaines. Sous la date : le nombre de séances terminées.</p>
        <BarresSemaines semaines={semaines} />
      </section>

      <div className="grille-2" style={{ marginTop: 14 }}>
        <section className="carte"><div className="tete"><h2>Ta régularité</h2>{serie.jours >= 2 && <span className="puce puce-serie"><Icone nom="flamme" />{serie.jours} jours d&apos;affilée</span>}</div>
          <p className="petit discret">{pluriel(total28, "séance", "séances")} sur les quatre dernières semaines. Ton rythme pour viser {profil.note_visee} : {prevues} séances par semaine.</p>
          <div className="regularite" role="img" aria-label={`${total28} séances sur les quatre dernières semaines`}>
            {quatreSemaines.map((d) => <span key={d} className={`j ${faits.has(d) ? "fait" : ""} ${d === jour ? "auj" : ""}`} title={dateSimple(d)}>{initialeJour(d)}</span>)}
          </div>
          <p className="petit discret" style={{ margin: "10px 0 0" }}>
            {serie.total ? `${pluriel(serie.total, "séance faite", "séances faites")} depuis le début.` : "Tu n'as pas encore terminé de séance."}
            {serie.record >= 2 ? ` Ta meilleure série : ${serie.record} jours d'affilée.` : ""}
            {serie.semaines >= 1 ? ` ${pluriel(serie.semaines, "semaine", "semaines")} d'affilée à ton rythme.` : ""}
          </p>
        </section>
        <section className="carte"><h2>Ta réussite par objectif</h2>
          {reussite.some((r) => r.faits) ? (
            <div className="niveaux-barres">
              {reussite.map((r) => (
                <div key={r.niveau}><div className="tete"><PillNiveau n={r.niveau} /><b>{r.faits ? `${Math.round(r.taux * 100)} %` : "pas commencé"}</b></div>
                  <div className="barre" role="img" aria-label={`Objectif ${r.niveau} : ${Math.round(r.taux * 100)} % de réussite`}><i className="b-solide" style={{ width: `${Math.round(r.taux * 100)}%` }} /></div>
                  <span className="petit discret">{pluriel(r.faits, "question travaillée", "questions travaillées")} sur {r.total}</span></div>
              ))}
            </div>
          ) : <p className="discret" style={{ margin: 0 }}>Travaille quelques questions : ta réussite à chaque objectif s&apos;affichera ici.</p>}
        </section>
      </div>

      {tests.length > 0 && <>
        <div className="section-titre"><h2>Tests de passage disponibles</h2></div>
        <ul className="liste">{tests.map(({ f, nv }) => (
          <li key={f.num}><Link className="ligne" href={`/app/quiz/nouveau?fiche=${f.num}&passage=${nv.prochain}`}><span className="num">F.{f.num}</span>
            <span><span className="tit">{f.titre_court} : passer à l&apos;objectif {nv.prochain}</span><span className="sous"><span>5 questions, 15 minutes, 70 % de bonnes réponses pour réussir</span></span></span>
            <span className="fin"><Icone nom="chevron" /></span></Link></li>
        ))}</ul>
      </>}

      <div className="section-titre"><h2>Chapitre par chapitre</h2><Link href="/app/cours">Tous les cours</Link></div>
      {suivis.length ? <ul className="liste">{suivis.map(({ f, e, nv }) => (
        <li key={f.num}><Link className="ligne" href={`/app/fiche/${p2(f.num)}?onglet=notions`}><span className="num">F.{f.num}</span>
          <span><span className="tit">{f.titre_court}</span>
            <span className="sous">{nv.atteint ? <><PillNiveau n={nv.atteint} /> atteint</> : <span>Objectif 10 en cours</span>}
              {nv.prochain && <span>objectif {nv.prochain} : {pluriel(nv.res[nv.prochain].faits, "question faite", "questions faites")} sur {nv.res[nv.prochain].total}, {Math.round(nv.res[nv.prochain].taux * 100)} % de réussite</span>}</span>
            <span className="sous"><span>{pluriel(e.solide, "notion solide", "notions solides")} · {pluriel(e.acquis, "acquise", "acquises")} · {e["en-cours"]} en cours · {e["a-voir"]} à voir</span></span>
            <span style={{ display: "block", marginTop: 6, maxWidth: 300 }}><BarreEtats e={e} /></span></span>
          <span className="fin"><Icone nom="chevron" /></span></Link></li>
      ))}</ul> : <p className="vide">Coche dans les cours les chapitres que tu as vus en classe : tes progrès sur chaque chapitre s&apos;afficheront ici.</p>}

      <div className="section-titre"><h2>Tes notes de DS</h2><Link href="/app/ds">Mode DS</Link></div>
      {notes.length ? <ul className="liste">{notes.map((d) => (
        <li key={d.id}><div className="ligne"><span className="num">{nombre(d.note as number, 1)}</span>
          <span><span className="tit">{d.fiches.map((n) => catalogue.fiches.find((f) => f.num === n)?.titre_court).join(", ")}</span>
            <span className="sous"><span>{dateSimple(d.date)}</span>{d.moyenneClasse != null && <span>moyenne de la classe : {nombre(d.moyenneClasse, 1)}</span>}</span></span><span className="fin" /></div></li>
      ))}</ul> : <p className="vide">Tu n&apos;as pas encore saisi de note.</p>}
    </>
  );
}
