import Link from "next/link";
import FormulaireCalibrage from "@/components/appli/FormulaireCalibrage";
import { Entete } from "@/components/appli/Morceaux";
import { dateSimple } from "@/lib/commun/format";
import { jourDeParis } from "@/lib/commun/dates";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";
import { calibragesDe } from "@/lib/serveur/suivi";

export const metadata = { title: "Test de calibrage" };

// Le test de calibrage (décision 0009) : proposé à la première connexion, refaisable à tout moment.
export default async function Calibrage({ searchParams }: { searchParams: Promise<{ bienvenue?: string }> }) {
  const bienvenue = (await searchParams).bienvenue === "1";
  const espace = await espaceEleve();
  const { profil, catalogue, ctx, session } = espace;
  const { passes, enCours } = await calibragesDe(session.userId, espace);
  return (
    <>
      <Entete fil={bienvenue ? undefined : <Link href="/app/parcours">Mon parcours</Link>} surtitre="Test de calibrage"
        titre={bienvenue ? `Bienvenue ${profil.prenom}. On commence par un test.` : passes.length ? "Refaire le test de calibrage" : "Ton test de calibrage"}
        sous="Dix minutes pour savoir où tu en es. Ton parcours part de ce test." />
      <div className="carte">
        <ol className="contenu" style={{ margin: 0 }}>
          <li>Tu coches les chapitres que tu as vus en classe.</li>
          <li>Tu réponds à 15 questions au plus : pour chaque chapitre, une question de l&apos;objectif 10, une de l&apos;objectif 14, une de l&apos;objectif 18.</li>
          <li>Tu obtiens ton point de départ et ton parcours pour viser {profil.note_visee}.</li>
        </ol>
        <p className="petit discret" style={{ margin: "10px 0 0" }}>Ce n&apos;est pas une note. Réponds sans ton cours : le test sert à savoir quoi travailler d&apos;abord. Tu peux le refaire quand tu veux.</p>
      </div>
      {enCours && (
        <div className="carte" style={{ marginTop: 14, borderColor: "var(--cuivre)" }}>
          <b>Tu as un test en cours.</b> Tu peux le reprendre là où tu t&apos;es arrêté.
          <div className="actions" style={{ marginTop: 10 }}><Link className="btn btn-cuivre" href={`/app/quiz/${enCours}`}>Reprendre mon test</Link></div>
        </div>
      )}
      <div style={{ marginTop: 14 }}>
        <FormulaireCalibrage fiches={catalogue.fiches.map((f) => ({
          num: f.num, titre: f.titre_court, vu: !!ctx.etat.vuEnClasse[String(f.num)], questions: (catalogue.sommaire.quizParFiche.get(f.num) ?? []).length,
        }))} />
      </div>
      {bienvenue && <p style={{ marginTop: 14 }}><Link className="btn-texte" href="/app">Faire le test plus tard</Link></p>}
      {passes.length > 0 && <>
        <div className="section-titre"><h2>Tes tests précédents</h2></div>
        <ul className="liste">{passes.map((c) => (
          <li key={c.id}><div className="ligne"><span className="num">{c.bilan.bonnes}/{c.bilan.total}</span>
            <span><span className="tit">Test du {dateSimple(jourDeParis(new Date(c.quand)))}</span>
              <span className="sous"><span>point de départ conseillé : viser {c.bilan.depart}</span></span></span><span className="fin" /></div></li>
        ))}</ul>
      </>}
    </>
  );
}
