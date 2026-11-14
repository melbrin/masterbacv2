import Link from "next/link";
import Icone from "@/components/appli/Icone";
import { BarreEtats, PillNiveau } from "@/components/appli/Morceaux";
import NoterDs from "@/components/appli/NoterDs";
import ContenuHtml from "@/components/socle/ContenuHtml";
import { ajouteJours, ecartEnJours } from "@/lib/commun/dates";
import { ENTRAINEMENT, SECTIONS, type IdSection } from "@/lib/commun/entrainement";
import { dateLongue, dateSimple, duree, initialeJour, nombre, p2, pluriel } from "@/lib/commun/format";
import { JEUX } from "@/lib/commun/jeux";
import { JEUX_MEMOIRE } from "@/lib/commun/memoire";
import * as m from "@/lib/moteur";
import { simulationsVisibles } from "@/lib/serveur/defis";
import { sectionsDe } from "@/lib/serveur/entrainement";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";
import { tpVisibles } from "@/lib/serveur/tp";
import { calibragesDe, suiviPour } from "@/lib/serveur/suivi";
import { afficheAlerte, afficheEtape } from "./parcours/textes";

export const metadata = { title: "Aujourd'hui" };

export default async function Aujourdhui() {
  const espace = await espaceEleve();
  const { profil, droits, ctx, catalogue, jour, devoirs, session } = espace;
  // le parcours : le palier en cours, un signal s'il y en a un, et la prochaine étape hors séance du jour (elle a sa carte)
  const { passes, enCours } = await calibragesDe(session.userId, espace);
  const parcours = m.parcours(ctx, suiviPour(espace, passes));
  const titreFiche = (n: number) => catalogue.fiches.find((f) => f.num === n)?.titre_court ?? `Fiche ${n}`;
  const etape = parcours.etapes.find((e) => e.type !== "seance" && e.type !== "calibrage");
  const prochaine = etape ? afficheEtape(etape, titreFiche, droits.coach ? 25 : 20) : null;
  const signal = parcours.alertes[0] ? afficheAlerte(parcours.alertes[0], titreFiche, m.seancesPrevues(ctx.reglages, profil.note_visee)) : null;
  const palier = parcours.paliers.find((x) => x.niveau === parcours.palier);
  const titre = (fiches: number[]) => fiches.map((n) => catalogue.sommaire.parNum.get(n) && catalogue.fiches.find((f) => f.num === n)?.titre_court).join(", ");
  const ds = m.prochainDS(ctx);
  const dsComplet = ds ? devoirs.find((d) => d.id === ds.id) : null;
  const note = m.noteEstimee(ctx);
  const noteAffichable = note && note.notes >= 1 && note.essais >= 20;
  const seance = m.seanceDuJour(ctx);
  const commencee = !!ctx.etat.seance;
  const faite = ctx.etat.seances.some((s) => s.date === jour);
  const avancement = m.avancementSeance(ctx, droits.coach);
  const exo = seance.exercice ? m.decoupe(seance.exercice) : null;
  const exoLeger = exo ? catalogue.fiches.find((f) => f.num === exo.fiche)?.items.find((i) => i.k === exo.k && i.n === exo.n) : null;
  const aRevoir = m.carnetDuJour(ctx);
  const nbSemaine = m.seancesSemaine(ctx);
  const cible = m.seancesPrevues(ctx.reglages, profil.note_visee);
  const serie = m.series(ctx);
  const lundi = m.lundi(jour);
  const semaine = Array.from({ length: 7 }, (_, i) => ajouteJours(lundi, i));
  const aNoter = m.dsANoter(ctx);
  const vus = m.chapitresVus(ctx);
  const nbQuiz = seance.revoir.filter((k) => k.startsWith("quiz:")).length;
  const nbCarnet = seance.revoir.length - nbQuiz;
  const revoirTexte = [
    nbCarnet ? `${pluriel(nbCarnet, "question", "questions")} de ton carnet d'erreurs` : "",
    nbQuiz ? `${pluriel(nbQuiz, "question", "questions")} de quiz` : "",
  ].filter(Boolean).join(" et ") || "Rien à revoir aujourd'hui";
  // la section « S'entraîner » : ses sous-sections qui ont du contenu pour ce compte, et ce que chacune contient
  const ouvertes = sectionsDe(session.admin);
  const contenu: Record<IdSection, string> = {
    labo: pluriel(simulationsVisibles(session.admin).reduce((s, x) => s + x.defis.length, 0), "défi", "défis"),
    tp: `${tpVisibles(session.admin).length} TP`,
    memoire: pluriel(JEUX_MEMOIRE.length, "jeu", "jeux"),
    jeux: pluriel(JEUX.length, "jeu", "jeux"),
  };
  const heure = Number(new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric", hour12: false }).format(new Date(ctx.maintenant)));
  const salut = heure < 5 || heure >= 18 ? "Bonsoir" : "Bonjour";
  // les étapes de la séance, avec ce qui est déjà fait ; l'offre gratuite n'a pas la partie « à revoir »
  const etapes = [
    ...(droits.coach ? [{ min: 5, t: "À revoir", d: <>{revoirTexte}</>, ok: faite || (commencee && avancement.etape >= 1) }] : []),
    { min: 15, t: "Un exercice sur papier", d: exo && exoLeger ? <>Fiche {exo.fiche} · {exo.k === "q" ? `Q.${exo.n}` : `Exercice ${exo.n}`} : <ContenuHtml html={exoLeger.titre} /></> : <>Une question à ton niveau</>, ok: faite || avancement.exerciceFait },
    { min: 5, t: "La correction", d: <>Tu compares ta copie au corrigé, puis tu te notes.</>, ok: faite || avancement.exerciceFait },
  ];

  return (
    <>
      <section className="cockpit apparait" aria-label="Tes échéances" style={{ marginTop: 14 }}>
        <div className="salut">{salut} <b>{profil.prenom}</b>. {faite ? "Ta séance du jour est faite." : ds && ecartEnJours(jour, ds.date) <= 7 ? "Aujourd'hui, tu prépares ton DS." : "Voici ta séance du jour."}</div>
        <div className="compteurs">
          {ds ? (
            <div className="compteur"><div className="lib">Prochain DS</div><div className="val">J−{ecartEnJours(jour, ds.date)}</div><div className="det">{titre(ds.fiches)}, {dateLongue(ds.date)}</div></div>
          ) : (
            <div className="compteur"><div className="lib">Prochain DS</div><div className="val" style={{ fontSize: "1.6rem", fontStretch: "90%" }}>Aucun</div>
              <div className="det"><Link href="/app/ds/nouveau" style={{ color: "#D7A983" }}>Je saisis la date de mon prochain DS</Link></div></div>
          )}
          <div className="compteur"><div className="lib">Le bac</div><div className="val">J−{Math.max(0, ecartEnJours(jour, m.BAC))}</div><div className="det">Épreuves de spécialité, 16 et 17 juin</div></div>
        </div>
        {noteAffichable ? (
          <div className="note"><span>Note estimée en physique-chimie</span><b className="chiffres">{nombre(note.valeur, 1)}</b><span>entre {note.bas} et {note.haut}</span>
            <Link href="/app/progres" style={{ color: "#D7A983" }}>Comment est-elle calculée ?</Link></div>
        ) : (
          <div className="note"><span>Ta note estimée s&apos;affichera quand tu auras saisi une note de DS et travaillé 20 questions.</span></div>
        )}
      </section>

      {!droits.coach && (
        <div className="carte" style={{ marginTop: 14, borderColor: "var(--cuivre)" }}>
          <b>Offre gratuite.</b> Tu as l&apos;exercice du jour, le test de niveau et une préparation de DS offerte. <Link href="/app/offres">Voir le Pass Bac 2027</Link>
        </div>
      )}

      <div className="section-titre"><h2>Ton parcours pour viser {parcours.vise}</h2><Link href="/app/parcours">Voir mon parcours</Link></div>
      {passes.length === 0 ? (
        <div className="carte" style={{ borderColor: "var(--cuivre)" }}>
          <b>{enCours ? "Ton test de calibrage est en cours." : "Commence par ton test de calibrage."}</b> Dix minutes pour savoir où tu en es et construire ton parcours.
          <div className="actions" style={{ marginTop: 10 }}><Link className="btn btn-cuivre" href={enCours ? `/app/quiz/${enCours}` : "/app/calibrage"}>{enCours ? "Reprendre mon test" : "Faire le test"}</Link></div>
        </div>
      ) : (
        <div className="carte">
          {palier && parcours.chapitres.length > 0 ? (
            <><p style={{ margin: "0 0 8px" }}>Palier « viser {palier.niveau} » : <b>{palier.atteints} {palier.atteints > 1 ? "chapitres" : "chapitre"} sur {palier.total}</b>.</p>
              <div className="barre" style={{ marginBottom: 10 }}><i className="b-solide" style={{ width: `${(100 * palier.atteints) / Math.max(1, palier.total)}%` }} /></div></>
          ) : parcours.chapitres.length > 0 ? <p style={{ margin: "0 0 8px" }}>Tu as atteint ta note visée sur tous tes chapitres vus en classe.</p> : null}
          {signal && <p className={`signal signal-${signal.ton}`} role="status"><Icone nom={signal.ton === "bravo" ? "ok" : "cible"} taille={20} /><span>{signal.texte}</span></p>}
          {prochaine && <p style={{ margin: 0 }}><b>Prochaine étape :</b> {prochaine.titre}. <Link href={prochaine.href}>{prochaine.bouton}</Link></p>}
        </div>
      )}

      <div className="section-titre"><h2>Ta séance du jour · {droits.coach ? 25 : 20} min</h2>
        <span className={`puce ${seance.raison === "ds" ? "puce-bleu" : ""}`}>{seance.raison === "ds" ? "Pour préparer ton DS" : seance.raison === "defaut" ? "Premier chapitre de l'année" : "Chapitres vus en classe"}</span></div>
      <div className="carte seance">
        <ol>
          {etapes.map((e, i) => (
            <li key={e.t}><span className="min">{e.min}<small>MIN</small></span><span className="quoi"><b>{i + 1}. {e.t}</b><span>{e.d}</span></span>
              <span>{e.ok && <span className="fait" role="img" aria-label="Fait"><Icone nom="ok" taille={22} /></span>}</span></li>
          ))}
        </ol>
        <div className="actions" style={{ marginTop: 12 }}>
          <Link className="btn btn-cuivre" href={commencee && !faite ? "/app/seance?suite=1" : "/app/seance"}><Icone nom="lecture" />{faite ? "Voir mon bilan" : commencee ? "Reprendre ma séance" : "Commencer ma séance"}</Link>
          {exo && <Link className="btn-texte" href={`/app/fiche/${p2(exo.fiche)}`}>Ouvrir la fiche {exo.fiche}</Link>}
        </div>
      </div>

      {aNoter.length > 0 && (
        <div className="pile" style={{ marginTop: 14 }}>
          {aNoter.map((d) => (
            <div className="carte" key={d.id}>
              <h2>Ton DS du {dateSimple(d.date)} est passé</h2>
              <p className="discret">{titre(d.fiches)}. Saisis ta note : elle sert à suivre tes progrès et à calculer ta note estimée.</p>
              <NoterDs id={d.id} />
            </div>
          ))}
        </div>
      )}

      <div className="grille-2" style={{ marginTop: 14 }}>
        {ds && dsComplet ? (() => {
          const faites = dsComplet.seances.filter((s) => m.seancePlanFaite(ctx, dsComplet.creeA, s)).length;
          const prochaine = dsComplet.seances.find((s) => !m.seancePlanFaite(ctx, dsComplet.creeA, s));
          return (
            <Link className="carte carte-lien" href={`/app/ds/${ds.id}`}>
              <div className="tete"><h2>Préparation du DS</h2><span className="puce">{pluriel(faites, "séance", "séances")} sur {dsComplet.seances.length}</span></div>
              <div className="barre" style={{ marginBottom: 10 }}><i className="b-solide" style={{ width: `${(100 * faites) / Math.max(1, dsComplet.seances.length)}%` }} /></div>
              <p style={{ margin: 0 }}>{prochaine ? <>Prochaine séance {prochaine.date <= jour ? "aujourd'hui" : dateLongue(prochaine.date)} : <b>{prochaine.titre}</b>, {duree(prochaine.minutes)}.</> : "Toutes les séances sont faites. Bon courage pour ton devoir !"}</p>
            </Link>
          );
        })() : (
          <Link className="carte carte-lien" href="/app/ds/nouveau"><h2>Tu as un DS bientôt ?</h2><p className="discret" style={{ margin: 0 }}>Saisis la date et les chapitres. Ton plan de révision est généré automatiquement.</p></Link>
        )}
        <Link className="carte carte-lien" href="/app/carnet">
          <div className="tete"><h2>Carnet d&apos;erreurs</h2><span className={`puce ${aRevoir.length ? "puce-ko" : "puce-ok"}`}>{aRevoir.length} à revoir</span></div>
          <p className="discret" style={{ margin: 0 }}>Tu revois chaque question ratée 2 jours plus tard, puis une semaine après, puis trois semaines après.</p>
        </Link>
      </div>

      <section className="entrainement" aria-labelledby="titre-entrainement">
        <div className="entrainement-tete">
          <h2 id="titre-entrainement"><Link href={ENTRAINEMENT.href}>{ENTRAINEMENT.nom}<Icone nom="chevron" taille={18} /></Link></h2>
          <p>{ENTRAINEMENT.phrase}</p>
        </div>
        <ul>
          {SECTIONS.filter((s) => ouvertes.includes(s.id)).map((s) => <li key={s.id}><Link href={s.href}><b>{s.nom}</b><span>{contenu[s.id]}</span></Link></li>)}
        </ul>
      </section>

      <div className="section-titre"><h2>Ta semaine</h2>{serie.jours >= 2 && <span className="puce puce-serie"><Icone nom="flamme" />{serie.jours} jours d&apos;affilée</span>}</div>
      <div className="carte">
        <p style={{ margin: "0 0 10px" }}><b>{pluriel(nbSemaine, "séance", "séances")}</b> sur {cible} prévues cette semaine pour viser {profil.note_visee}. Si tu rates une séance, son contenu se reporte sur la séance du lendemain.</p>
        <div className="regularite" role="img" aria-label="Séances faites cette semaine">
          {semaine.map((d) => <span key={d} className={`j ${ctx.etat.seances.some((s) => s.date === d) ? "fait" : ""} ${d === jour ? "auj" : ""}`}>{initialeJour(d)}</span>)}
        </div>
        {serie.total > 0 && (
          <p className="petit discret" style={{ margin: "10px 0 0" }}>
            {pluriel(serie.total, "séance faite", "séances faites")} depuis le début.
            {serie.record >= 2 ? ` Ta meilleure série : ${serie.record} jours d'affilée.` : ""}
            {serie.semaines >= 2 ? ` ${serie.semaines} semaines d'affilée à ton rythme.` : ""}
          </p>
        )}
      </div>

      <div className="section-titre"><h2>Tes chapitres vus en classe</h2><Link href="/app/cours">Tous les cours</Link></div>
      {vus.length ? (
        <ul className="liste">
          {vus.map((n) => {
            const f = catalogue.fiches.find((x) => x.num === n)!;
            const nv = m.niveauFiche(ctx, n);
            const e = m.etatsFiche(ctx, n);
            return (
              <li key={n}><Link className="ligne" href={`/app/fiche/${p2(n)}`}><span className="num">F.{n}</span>
                <span><span className="tit">{f.titre_court}</span>
                  <span className="sous">{nv.atteint ? <><PillNiveau n={nv.atteint} /> atteint</> : <span>Objectif 10 en cours</span>}<span>{e.acquis + e.solide} notions acquises sur {e.total}</span></span>
                  <span style={{ display: "block", marginTop: 6, maxWidth: 260 }}><BarreEtats e={e} /></span></span>
                <span className="fin"><Icone nom="chevron" /></span></Link></li>
            );
          })}
        </ul>
      ) : <p className="vide">Coche dans les cours les chapitres que tu as déjà vus en classe. Ta séance du jour portera sur ces chapitres.</p>}
    </>
  );
}
