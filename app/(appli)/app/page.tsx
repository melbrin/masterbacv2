import Link from "next/link";
import Icone from "@/components/appli/Icone";
import { BarreEtats, PillNiveau } from "@/components/appli/Morceaux";
import NoterDs from "@/components/appli/NoterDs";
import ContenuHtml from "@/components/socle/ContenuHtml";
import { ajouteJours, ecartEnJours } from "@/lib/commun/dates";
import { dateLongue, dateSimple, duree, initialeJour, nombre, p2 } from "@/lib/commun/format";
import * as m from "@/lib/moteur";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export const metadata = { title: "Aujourd'hui" };

export default async function Aujourdhui() {
  const { profil, droits, ctx, catalogue, jour, devoirs } = await espaceEleve();
  const titre = (fiches: number[]) => fiches.map((n) => catalogue.sommaire.parNum.get(n) && catalogue.fiches.find((f) => f.num === n)?.titre_court).join(", ");
  const ds = m.prochainDS(ctx);
  const dsComplet = ds ? devoirs.find((d) => d.id === ds.id) : null;
  const note = m.noteEstimee(ctx);
  const noteAffichable = note && note.notes >= 1 && note.essais >= 20;
  const seance = m.seanceDuJour(ctx);
  const faite = ctx.etat.seances.some((s) => s.date === jour);
  const exo = seance.exercice ? m.decoupe(seance.exercice) : null;
  const exoLeger = exo ? catalogue.fiches.find((f) => f.num === exo.fiche)?.items.find((i) => i.k === exo.k && i.n === exo.n) : null;
  const aRevoir = m.carnetDuJour(ctx);
  const nbSemaine = m.seancesSemaine(ctx);
  const cible = m.seancesPrevues(ctx.reglages, profil.note_visee);
  const lundi = m.lundi(jour);
  const semaine = Array.from({ length: 7 }, (_, i) => ajouteJours(lundi, i));
  const aNoter = m.dsANoter(ctx);
  const vus = m.chapitresVus(ctx);
  const nbQuiz = seance.revoir.filter((k) => k.startsWith("quiz:")).length;
  const nbCarnet = seance.revoir.length - nbQuiz;
  const revoirTexte = [
    nbCarnet ? `${nbCarnet} question${nbCarnet > 1 ? "s" : ""} de ton carnet d'erreurs` : "",
    nbQuiz ? `${nbQuiz} question${nbQuiz > 1 ? "s" : ""} de quiz${nbCarnet ? "" : " sur ton chapitre"}` : "",
  ].filter(Boolean).join(" et ") || "Rien à revoir : on passe à l'exercice";
  const heure = Number(new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric", hour12: false }).format(new Date(ctx.maintenant)));
  const salut = heure < 5 || heure >= 18 ? "Bonsoir" : "Bonjour";

  return (
    <>
      <section className="cockpit apparait" aria-label="Tes échéances" style={{ marginTop: 14 }}>
        <div className="salut">{salut} <b>{profil.prenom}</b>. {faite ? "Ta séance du jour est faite." : ds && ecartEnJours(jour, ds.date) <= 7 ? "Ce soir, on prépare ton DS." : "Voici ce qui t'attend ce soir."}</div>
        <div className="compteurs">
          {ds ? (
            <div className="compteur"><div className="lib">Prochain DS</div><div className="val">J−{ecartEnJours(jour, ds.date)}</div><div className="det">{titre(ds.fiches)}, {dateLongue(ds.date)}</div></div>
          ) : (
            <div className="compteur"><div className="lib">Prochain DS</div><div className="val" style={{ fontSize: "1.6rem", fontStretch: "90%" }}>Aucun</div>
              <div className="det"><Link href="/app/ds/nouveau" style={{ color: "#D7A983" }}>Donne-moi la date et le chapitre</Link></div></div>
          )}
          <div className="compteur"><div className="lib">Le bac</div><div className="val">J−{Math.max(0, ecartEnJours(jour, m.BAC))}</div><div className="det">Épreuves de spécialité, 16 et 17 juin</div></div>
        </div>
        {noteAffichable ? (
          <div className="note"><span>Note estimée en physique-chimie</span><b className="chiffres">{nombre(note.valeur, 1)}</b><span>entre {note.bas} et {note.haut}</span>
            <Link href="/app/progres" style={{ color: "#D7A983" }}>Comment est-elle calculée ?</Link></div>
        ) : (
          <div className="note"><span>Ta note estimée s&apos;affichera après une première note de DS et 20 questions travaillées.</span></div>
        )}
      </section>

      {!droits.coach && (
        <div className="carte" style={{ marginTop: 14, borderColor: "var(--cuivre)" }}>
          <b>Offre gratuite.</b> Tu as l&apos;exercice du jour, le test de niveau et une préparation de DS offerte. <Link href="/app/offres">Voir le Pass Bac 2027</Link>
        </div>
      )}

      <div className="section-titre"><h2>Ta séance du jour · 25 min</h2>
        <span className={`puce ${seance.raison === "ds" ? "puce-bleu" : ""}`}>{seance.raison === "ds" ? "Elle prépare ton DS" : seance.raison === "defaut" ? "Premier chapitre de l'année" : "Chapitres vus en classe"}</span></div>
      <div className="carte seance">
        <ol>
          {[
            { min: 5, t: "À revoir", d: <>{revoirTexte}</> },
            { min: 15, t: "Un exercice sur papier", d: exo && exoLeger ? <>Fiche {exo.fiche} · {exo.k === "q" ? `Q.${exo.n}` : `Exercice ${exo.n}`} : <ContenuHtml html={exoLeger.titre} /></> : <>Une question à ton niveau</> },
            { min: 5, t: "La correction", d: <>Tu compares ta copie au corrigé et tu notes ce que tu as obtenu.</> },
          ].map((e, i) => (
            <li key={i}><span className="min">{e.min}<small>MIN</small></span><span className="quoi"><b>{i + 1}. {e.t}</b><span>{e.d}</span></span>
              <span>{faite && <span className="fait" aria-label="Fait"><Icone nom="ok" taille={22} /></span>}</span></li>
          ))}
        </ol>
        <div className="actions" style={{ marginTop: 12 }}>
          <Link className="btn btn-cuivre" href="/app/seance"><Icone nom="lecture" />{faite ? "Revoir la séance" : seance.etape > 0 ? "Reprendre la séance" : "Commencer la séance"}</Link>
          {exo && <Link className="btn-texte" href={`/app/fiche/${p2(exo.fiche)}`}>Ouvrir la fiche {exo.fiche}</Link>}
        </div>
      </div>

      {aNoter.length > 0 && (
        <div className="pile" style={{ marginTop: 14 }}>
          {aNoter.map((d) => (
            <div className="carte" key={d.id}>
              <h2>Ton DS du {dateSimple(d.date)} est passé</h2>
              <p className="discret">{titre(d.fiches)}. Ta note sert à mesurer tes progrès et à recaler ta note estimée.</p>
              <NoterDs id={d.id} />
            </div>
          ))}
        </div>
      )}

      <div className="grille-2" style={{ marginTop: 14 }}>
        {ds && dsComplet ? (() => {
          const faites = dsComplet.seances.filter((s) => s.faite).length;
          const prochaine = dsComplet.seances.find((s) => !s.faite);
          return (
            <Link className="carte carte-lien" href={`/app/ds/${ds.id}`}>
              <div className="tete"><h2>Préparation du DS</h2><span className="puce">{faites} séance{faites > 1 ? "s" : ""} sur {dsComplet.seances.length}</span></div>
              <div className="barre" style={{ marginBottom: 10 }}><i className="b-solide" style={{ width: `${(100 * faites) / Math.max(1, dsComplet.seances.length)}%` }} /></div>
              <p style={{ margin: 0 }}>{prochaine ? <>Prochaine séance {prochaine.date === jour ? "aujourd'hui" : dateLongue(prochaine.date)} : <b>{prochaine.titre}</b>, {duree(prochaine.minutes)}.</> : "Toutes les séances sont faites. Bonne chance pour le devoir."}</p>
            </Link>
          );
        })() : (
          <Link className="carte carte-lien" href="/app/ds/nouveau"><h2>Tu as un DS bientôt ?</h2><p className="discret" style={{ margin: 0 }}>Donne la date, les chapitres et la note visée : le plan sort tout seul.</p></Link>
        )}
        <Link className="carte carte-lien" href="/app/carnet">
          <div className="tete"><h2>Carnet d&apos;erreurs</h2><span className={`puce ${aRevoir.length ? "puce-ko" : "puce-ok"}`}>{aRevoir.length} à revoir</span></div>
          <p className="discret" style={{ margin: 0 }}>Chaque question ratée revient deux jours, une semaine, puis trois semaines plus tard.</p>
        </Link>
      </div>

      <div className="section-titre"><h2>Ta semaine</h2></div>
      <div className="carte">
        <p style={{ margin: "0 0 10px" }}><b>{nbSemaine} séance{nbSemaine > 1 ? "s" : ""}</b> sur {cible} prévues cette semaine pour viser {profil.note_visee}. Une séance sautée ne casse rien : celle du lendemain se recalcule.</p>
        <div className="regularite" role="img" aria-label="Séances faites cette semaine">
          {semaine.map((d) => <span key={d} className={`j ${ctx.etat.seances.some((s) => s.date === d) ? "fait" : ""} ${d === jour ? "auj" : ""}`}>{initialeJour(d)}</span>)}
        </div>
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
                  <span className="sous">{nv.atteint ? <><PillNiveau n={nv.atteint} /> atteint</> : <span>Niveau 10 en cours</span>}<span>{e.acquis + e.solide} notions acquises sur {e.total}</span></span>
                  <span style={{ display: "block", marginTop: 6, maxWidth: 260 }}><BarreEtats e={e} /></span></span>
                <span className="fin"><Icone nom="chevron" /></span></Link></li>
            );
          })}
        </ul>
      ) : <p className="vide">Coche dans les cours les chapitres déjà vus en classe : ta séance du jour les suivra.</p>}
    </>
  );
}
