import Link from "next/link";
import { BarresSemaines, CourbeNotes } from "@/components/appli/Graphiques";
import Icone from "@/components/appli/Icone";
import { BarreEtats, Entete, PillNiveau } from "@/components/appli/Morceaux";
import Etoiles from "@/components/simulations/Etoiles";
import GrilleEce from "@/components/tp/GrilleEce";
import { ajouteJours } from "@/lib/commun/dates";
import { ENTRAINEMENT } from "@/lib/commun/entrainement";
import { dateSimple, initialeJour, nombre, p2, pluriel } from "@/lib/commun/format";
import * as m from "@/lib/moteur";
import { entrainementDe } from "@/lib/serveur/entrainement";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export const metadata = { title: "Progrès" };

export default async function Progres() {
  const { ctx, catalogue, devoirs, profil, jour, session } = await espaceEleve();
  // l'entraînement (décision 0015) : le labo, les TP, la mémoire et les jeux comptent dans les progrès
  const { offre, bilan: pratique } = await entrainementDe(session, ctx.maintenant);
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
  // ce qui a été fait à l'entraînement ce mois-ci : un chiffre par sous-section qui a quelque chose à proposer
  const pratiqueDuMois = [
    ...(offre.defis.length ? [{ n: pratique.mois.defis, un: "défi du labo réussi", plusieurs: "défis du labo réussis" }] : []),
    ...(offre.tp.length ? [{ n: pratique.mois.tp, un: "TP terminé", plusieurs: "TP terminés" }] : []),
    { n: pratique.mois.parties, un: "partie jouée", plusieurs: "parties jouées" },
  ];
  const pratiqueDeLaSemaine = [
    pratique.semaine.defis ? pluriel(pratique.semaine.defis, "défi du labo réussi", "défis du labo réussis") : "",
    pratique.semaine.tp ? pluriel(pratique.semaine.tp, "TP terminé", "TP terminés") : "",
    pratique.semaine.parties ? pluriel(pratique.semaine.parties, "partie jouée", "parties jouées") : "",
  ].filter(Boolean);
  const grille = pratique.tp.grille.filter((c) => c.niveau);

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
      <div className="chiffres-cles" style={{ marginTop: 8, gridTemplateColumns: `repeat(${pratiqueDuMois.length}, minmax(0, 1fr))` }}>
        {pratiqueDuMois.map((c) => <div className="carte" key={c.un}><b className="chiffres">{c.n}</b><span>{c.n > 1 ? c.plusieurs : c.un}</span></div>)}
      </div>

      <div className="section-titre"><h2>Ton travail, semaine après semaine</h2></div>
      <section className="carte">
        <p className="petit discret" style={{ margin: "0 0 6px" }}>Le nombre de réponses que tu as données chaque semaine, sur 8 semaines. Sous la date : le nombre de séances terminées.</p>
        <BarresSemaines semaines={semaines} />
        {pratiqueDeLaSemaine.length > 0 && <p className="petit discret" style={{ margin: "8px 0 0" }}>Cette semaine, à l&apos;entraînement : {pratiqueDeLaSemaine.join(", ")}.</p>}
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

      <div className="section-titre"><h2>À l&apos;entraînement</h2><Link href={ENTRAINEMENT.href}>{ENTRAINEMENT.nom}</Link></div>
      <div className="progres-entrainement" id="entrainement">
        {offre.defis.length > 0 && (
          <section className="carte"><div className="tete"><h2>Au labo</h2><span className="puce"><Etoiles gagnees={1} total={1} /> {pratique.labo.etoiles} sur {pratique.labo.etoilesMax}</span></div>
            <div className="niveaux-barres">
              {pratique.labo.parNiveau.map((n) => (
                <div key={n.niveau}><div className="tete"><PillNiveau n={n.niveau} /><b>{n.reussis} sur {n.defis}</b></div>
                  <div className="barre" role="img" aria-label={`Objectif ${n.niveau} : ${pluriel(n.reussis, "défi réussi", "défis réussis")} sur ${n.defis}`}><i className="b-solide" style={{ width: `${(100 * n.reussis) / Math.max(1, n.defis)}%` }} /></div></div>
              ))}
            </div>
            <p className="petit discret" style={{ margin: "10px 0 0" }}>Les défis réussis, objectif par objectif. Trois étoiles : réussi au premier essai.</p>
          </section>
        )}
        {offre.tp.length > 0 && (
          <section className="carte progres-tp"><div className="tete"><h2>En TP</h2><span className="puce">{pratique.tp.finis} {pratique.tp.finis > 1 ? "terminés" : "terminé"} sur {pratique.tp.tp}</span></div>
            {grille.length > 0 ? (
              <>
                <GrilleEce lignes={grille} />
                <p className="petit discret" style={{ margin: "10px 0 0" }}>Ton niveau habituel dans chaque compétence de l&apos;épreuve d&apos;ECE, sur tes TP terminés. A : réussi sans aide. B : une erreur, ou une manipulation faite avec le guide. C : plusieurs erreurs. D : à reprendre.</p>
              </>
            ) : <p className="discret" style={{ margin: 0 }}>Termine un TP : ton niveau dans chaque compétence de l&apos;épreuve d&apos;ECE s&apos;affichera ici.</p>}
          </section>
        )}
        <section className="carte"><h2>Mémoire et jeux</h2>
          <p style={{ margin: "0 0 6px" }}>Mémoire : <b>{pluriel(pratique.memoire.jours, "jour", "jours")}</b> d&apos;entraînement sur les 7 derniers, {pluriel(pratique.memoire.parties, "partie", "parties")}.</p>
          <p style={{ margin: 0 }}>Jeux de révision : <b>{pluriel(pratique.jeux.parties, "partie", "parties")}</b> sur les 7 derniers jours.</p>
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
      {suivis.length ? <ul className="liste">{suivis.map(({ f, e, nv }) => {
        const labo = pratique.chapitres.get(f.num);
        return (
        <li key={f.num}><Link className="ligne" href={`/app/fiche/${p2(f.num)}?onglet=notions`}><span className="num">F.{f.num}</span>
          <span><span className="tit">{f.titre_court}</span>
            <span className="sous">{nv.atteint ? <><PillNiveau n={nv.atteint} /> atteint</> : <span>Objectif 10 en cours</span>}
              {nv.prochain && <span>objectif {nv.prochain} : {pluriel(nv.res[nv.prochain].faits, "question faite", "questions faites")} sur {nv.res[nv.prochain].total}, {Math.round(nv.res[nv.prochain].taux * 100)} % de réussite</span>}</span>
            <span className="sous"><span>{pluriel(e.solide, "notion solide", "notions solides")} · {pluriel(e.acquis, "acquise", "acquises")} · {e["en-cours"]} en cours · {e["a-voir"]} à voir</span></span>
            {labo && <span className="sous"><span>{[
              labo.defis ? `Labo : ${pluriel(labo.etoiles, "étoile", "étoiles")} sur ${3 * labo.defis}` : "",
              labo.tp ? `TP : ${labo.tpFinis} ${labo.tpFinis > 1 ? "terminés" : "terminé"} sur ${labo.tp}` : "",
            ].filter(Boolean).join(" · ")}</span></span>}
            <span style={{ display: "block", marginTop: 6, maxWidth: 300 }}><BarreEtats e={e} /></span></span>
          <span className="fin"><Icone nom="chevron" /></span></Link></li>
        );
      })}</ul> : <p className="vide">Coche dans les cours les chapitres que tu as vus en classe : tes progrès sur chaque chapitre s&apos;afficheront ici.</p>}

      <div className="section-titre"><h2>Tes notes de DS</h2><Link href="/app/ds">Mode DS</Link></div>
      {notes.length ? <ul className="liste">{notes.map((d) => (
        <li key={d.id}><div className="ligne"><span className="num">{nombre(d.note as number, 1)}</span>
          <span><span className="tit">{d.fiches.map((n) => catalogue.fiches.find((f) => f.num === n)?.titre_court).join(", ")}</span>
            <span className="sous"><span>{dateSimple(d.date)}</span>{d.moyenneClasse != null && <span>moyenne de la classe : {nombre(d.moyenneClasse, 1)}</span>}</span></span><span className="fin" /></div></li>
      ))}</ul> : <p className="vide">Tu n&apos;as pas encore saisi de note.</p>}
    </>
  );
}
