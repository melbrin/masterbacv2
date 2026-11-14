import Link from "next/link";
import Icone from "@/components/appli/Icone";
import { Coche, Entete, PillNiveau } from "@/components/appli/Morceaux";
import { jourDeParis } from "@/lib/commun/dates";
import { dateSimple, p2, pluriel } from "@/lib/commun/format";
import * as m from "@/lib/moteur";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";
import { calibragesDe, suiviPour } from "@/lib/serveur/suivi";
import { afficheAlerte, afficheEtape } from "./textes";

export const metadata = { title: "Mon parcours" };

// Le parcours (décision 0009) : où l'élève en est sur chaque chapitre vu en classe, palier par palier, et la
// prochaine chose à faire. Tout est recalculé à chaque affichage à partir de ses réponses : le suivi est toujours à jour.
export default async function Parcours({ searchParams }: { searchParams: Promise<{ calibrage?: string }> }) {
  const apresTest = (await searchParams).calibrage === "1";
  const espace = await espaceEleve();
  const { ctx, catalogue, profil, droits, session } = espace;
  const { passes, enCours } = await calibragesDe(session.userId, espace);
  const p = m.parcours(ctx, suiviPour(espace, passes));
  const titreFiche = (n: number) => catalogue.fiches.find((f) => f.num === n)?.titre_court ?? `Fiche ${n}`;
  const prevues = m.seancesPrevues(ctx.reglages, profil.note_visee);
  const etapes = p.etapes.map((e) => afficheEtape(e, titreFiche, droits.coach ? 25 : 20));
  const [prochaine, ...suite] = etapes;
  const dernier = passes[0];
  const avant = passes[1];
  const taux = (bonnes: number, total: number) => (total ? Math.round((100 * bonnes) / total) : 0);

  return (
    <>
      <Entete fil={<Link href="/app">Aujourd&apos;hui</Link>} surtitre="Mon parcours" titre={`Ton parcours pour viser ${p.vise}`}
        sous={p.chapitres.length
          ? p.palier ? `Tu en es au palier « viser ${p.palier} ». Ton parcours se met à jour à chaque question que tu travailles.` : "Tu as atteint ta note visée sur tous tes chapitres vus en classe."
          : "Il se construit à partir de tes chapitres vus en classe et de ton test de calibrage."} />

      {dernier && (
        <section className={`carte ${apresTest ? "fete" : ""}`} style={apresTest ? { textAlign: "left", justifyItems: "stretch" } : undefined}>
          <div className="tete"><h2>{apresTest ? "Le résultat de ton test" : "Ton dernier test de calibrage"}</h2><span className="puce">{dateSimple(jourDeParis(new Date(dernier.quand)))}</span></div>
          <div className="score-final"><b className="chiffres">{dernier.bilan.bonnes}/{dernier.bilan.total}</b><span>{dernier.bilan.bonnes > 1 ? "bonnes réponses" : "bonne réponse"}</span>
            {avant && <span className="petit discret">test précédent : {avant.bilan.bonnes}/{avant.bilan.total}</span>}</div>
          <div className="niveaux-barres">
            {dernier.bilan.niveaux.filter((n) => n.total > 0).map((n) => (
              <div key={n.niveau}><div className="tete"><PillNiveau n={n.niveau} /><b>{n.bonnes} sur {n.total}</b></div>
                <div className="barre" role="img" aria-label={`Objectif ${n.niveau} : ${n.bonnes} bonnes réponses sur ${n.total}`}><i className="b-solide" style={{ width: `${taux(n.bonnes, n.total)}%` }} /></div></div>
            ))}
          </div>
          <p style={{ margin: 0 }}><b>Ton point de départ : viser {dernier.bilan.depart}.</b>{" "}
            {dernier.bilan.depart < p.vise ? `Tu vises ${p.vise} : ton parcours commence par l'objectif ${dernier.bilan.depart}, puis monte palier par palier.`
              : dernier.bilan.depart === p.vise ? `C'est la note que tu vises : ton parcours travaille directement cet objectif, après avoir assuré les précédents.`
              : `C'est au-dessus de la note que tu vises (${p.vise}). Tu peux viser plus haut dans ton profil.`}</p>
          <ul className="liste">{dernier.bilan.chapitres.map((c) => (
            <li key={c.fiche}><Link className="ligne" href={`/app/fiche/${p2(c.fiche)}`}><span className="num">F.{c.fiche}</span>
              <span><span className="tit">{titreFiche(c.fiche)}</span><span className="sous"><span>{pluriel(c.bonnes, "bonne réponse", "bonnes réponses")} sur {c.total}</span></span></span>
              <span className="fin"><Icone nom="chevron" /></span></Link></li>
          ))}</ul>
          <div className="actions"><Link className="btn btn-ligne" href="/app/calibrage">Refaire le test</Link></div>
        </section>
      )}
      {!dernier && (
        <section className="carte" style={{ borderColor: "var(--cuivre)" }}>
          <h2>{enCours ? "Ton test de calibrage est en cours" : "Commence par ton test de calibrage"}</h2>
          <p>Dix minutes pour savoir où tu en es. Sans lui, ton parcours part de zéro sur chaque chapitre.</p>
          <div className="actions"><Link className="btn btn-cuivre" href={enCours ? `/app/quiz/${enCours}` : "/app/calibrage"}>{enCours ? "Reprendre mon test" : "Faire le test"}</Link></div>
        </section>
      )}

      {p.alertes.length > 0 && (
        <div className="pile" style={{ marginTop: 14 }}>
          {p.alertes.map((a, i) => {
            const s = afficheAlerte(a, titreFiche, prevues);
            return <p key={i} className={`carte signal signal-${s.ton}`} role="status"><Icone nom={s.ton === "bravo" ? "ok" : "cible"} taille={20} /><span>{s.texte}{s.href && <> <Link href={s.href}>{s.lien}</Link></>}</span></p>;
          })}
        </div>
      )}

      {prochaine && (
        <>
          <div className="section-titre"><h2>Ta prochaine étape</h2></div>
          <section className="carte" style={{ borderColor: "var(--cuivre)" }}>
            <h2>{prochaine.titre}</h2>
            <p>{prochaine.detail}</p>
            <div className="actions"><Link className="btn btn-cuivre" href={prochaine.href}><Icone nom="lecture" />{prochaine.bouton}</Link></div>
          </section>
        </>
      )}
      {suite.length > 0 && (
        <>
          <div className="section-titre"><h2>Ensuite</h2></div>
          <ol className="liste">{suite.slice(0, 6).map((e, i) => (
            <li key={e.href + i}><Link className="ligne" href={e.href}><span className="num">{i + 2}</span>
              <span><span className="tit">{e.titre}</span><span className="sous"><span>{e.detail}</span></span></span>
              <span className="fin"><Icone nom="chevron" /></span></Link></li>
          ))}</ol>
        </>
      )}

      <div className="section-titre"><h2>Tes paliers</h2><Link href="/app/progres">Mes progrès</Link></div>
      {p.chapitres.length ? (
        <div className="pile">
          {p.paliers.map((palier) => (
            <section className="carte" key={palier.niveau}>
              <div className="tete"><h2>Palier « viser {palier.niveau} »</h2>
                <span className={`puce ${palier.atteints === palier.total ? "puce-ok" : ""}`}>{palier.atteints} {palier.atteints > 1 ? "chapitres" : "chapitre"} sur {palier.total}</span></div>
              <div className="barre" style={{ marginBottom: 10 }}><i className="b-solide" style={{ width: `${taux(palier.atteints, palier.total)}%` }} /></div>
              <ul className="liste">{p.chapitres.map((c) => {
                const fait = c.atteint >= palier.niveau;
                const enCoursIci = !fait && c.prochain === palier.niveau;
                return (
                  <li key={c.fiche}><Link className="ligne" href={`/app/fiche/${p2(c.fiche)}?onglet=questions&niveau=${palier.niveau}`}><span className="num">F.{c.fiche}</span>
                    <span><span className="tit">{titreFiche(c.fiche)}</span>
                      <span className="sous">{fait ? <span>objectif atteint</span>
                        : enCoursIci ? <span>{c.faits ? `${pluriel(c.faits, "question travaillée", "questions travaillées")} sur ${c.total}, ${Math.round(c.taux * 100)} % de réussite` : "à commencer"}{c.testDispo ? " · test de passage disponible" : ""}</span>
                        : <span>après le palier précédent</span>}{c.dansDs && <span className="puce puce-bleu">Au prochain DS</span>}</span></span>
                    <span className="fin"><Coche faite={fait} /><Icone nom="chevron" /></span></Link></li>
                );
              })}</ul>
            </section>
          ))}
        </div>
      ) : <p className="vide">Coche dans les cours les chapitres que tu as vus en classe, ou passe ton test de calibrage : tes paliers s&apos;afficheront ici.</p>}
      <p className="petit discret" style={{ marginTop: 14 }}>Un objectif est atteint sur un chapitre quand tu réussis 70 % de ses questions. Pour les objectifs 14 et 18, il faut aussi réussir un test de passage.</p>
    </>
  );
}
