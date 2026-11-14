import Link from "next/link";
import { redirect } from "next/navigation";
import BoutonAction from "@/components/appli/BoutonAction";
import Confettis from "@/components/appli/Confettis";
import Icone from "@/components/appli/Icone";
import { Entete, Etapes } from "@/components/appli/Morceaux";
import ContenuHtml from "@/components/socle/ContenuHtml";
import { pluriel, rangFeminin } from "@/lib/commun/format";
import * as m from "@/lib/moteur";
import { demarrerQuiz } from "@/lib/serveur/commandes/quiz";
import { commencerSeance, terminerSeance } from "@/lib/serveur/commandes/seance";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export const metadata = { title: "Séance du jour" };
const ETAPES = ["À revoir", "Un exercice sur papier", "La correction"];
const ETAPES_GRATUIT = ["Un exercice sur papier", "La correction"];

export default async function Seance({ searchParams }: { searchParams: Promise<{ suite?: string; bravo?: string }> }) {
  const sp = await searchParams;
  const { ctx, catalogue, droits, profil } = await espaceEleve();
  const commencer = async () => { "use server"; return commencerSeance({}); };
  const terminer = async () => { "use server"; return terminerSeance({}); };
  const quiz = async () => { "use server"; return demarrerQuiz({ genre: "seance" }); };
  const noms = droits.coach ? ETAPES : ETAPES_GRATUIT;
  const fil = <Link href="/app">Aujourd&apos;hui</Link>;

  // la séance n'est pas commencée : on dit ce qu'elle contient, et un bouton la lance
  if (!ctx.etat.seance) {
    return (
      <>
        <Entete fil={fil} surtitre={`Séance du jour · ${droits.coach ? 25 : 20} minutes`} titre="Ta séance du jour"
          sous={droits.coach ? "5 minutes de questions à revoir, 15 minutes pour un exercice sur papier, 5 minutes pour te corriger." : "15 minutes pour un exercice sur papier, 5 minutes pour te corriger."} />
        <div className="carte"><p>Prends une feuille et un stylo. L&apos;application te donne l&apos;énoncé, puis la correction. Tu rédiges sur papier, comme le jour de l&apos;épreuve.</p>
          <div className="actions"><BoutonAction lancer={commencer}>Commencer la séance</BoutonAction></div></div>
      </>
    );
  }

  const seance = ctx.etat.seance;
  const a = m.avancementSeance(ctx, droits.coach);
  const item = (c: string) => {
    const d = m.decoupe(c);
    const i = d && catalogue.fiches.find((f) => f.num === d.fiche)?.items.find((x) => x.k === d.k && x.n === d.n);
    return d && i ? { d, i } : null;
  };

  // la séance est finie : le bilan, avec la série en cours
  if (seance.faite) {
    const s = m.series(ctx);
    const faites = m.seancesSemaine(ctx);
    const prevues = m.seancesPrevues(ctx.reglages, profil.note_visee);
    return (
      <>
        {sp.bravo === "1" && <Confettis />}
        <Entete fil={fil} surtitre="Séance du jour" titre="Séance terminée" />
        <section className="carte fete">
          <span className="medaille"><Icone nom="ok" /></span>
          <h2>Bravo {profil.prenom} ! Tu as terminé ta {rangFeminin(Math.max(1, s.total))} séance.</h2>
          <p>{s.jours >= 2 ? `Tu travailles depuis ${s.jours} jours d'affilée. Reviens demain pour continuer ta série.`
            : s.total <= 1 ? "Reviens demain : deux jours d'affilée, et ta série commence."
            : "Reviens demain pour commencer une nouvelle série."}</p>
          <div className="chiffres-fete">
            <div><b className="chiffres">{s.total}</b><span>{s.total > 1 ? "séances faites" : "séance faite"}</span></div>
            <div><b className="chiffres">{s.jours}</b><span>{s.jours > 1 ? "jours d'affilée" : "jour d'affilée"}</span></div>
            <div><b className="chiffres">{faites}<small>/{prevues}</small></b><span>cette semaine</span></div>
          </div>
          <p className="petit discret" style={{ margin: 0 }}>
            {faites >= prevues ? `Objectif de la semaine atteint pour viser ${profil.note_visee}.` : `Encore ${pluriel(prevues - faites, "séance", "séances")} cette semaine pour viser ${profil.note_visee}.`}
            {s.semaines >= 2 ? ` ${s.semaines} semaines d'affilée à ton rythme.` : ""}
            {s.record > s.jours && s.record >= 2 ? ` Ta meilleure série : ${s.record} jours.` : ""}
          </p>
          <div className="actions"><Link className="btn btn-cuivre" href="/app">Retour à l&apos;accueil</Link><Link className="btn btn-ligne" href="/app/progres">Voir mes progrès</Link></div>
        </section>
      </>
    );
  }

  // « Continuer » mène droit à la prochaine question, sans repasser par cet écran
  const prochaine = a.questions[0] ?? (a.etape === 1 ? a.exercice : null);
  if (sp.suite === "1" && a.quiz.length === 0 && prochaine) redirect(`/app/seance/${prochaine}`);

  const exo = a.exercice ? item(a.exercice) : null;
  return (
    <>
      <Entete fil={fil} surtitre={`Séance du jour · ${droits.coach ? 25 : 20} minutes`}
        titre={a.etape === 0 ? "D'abord, ce qui est à revoir" : a.etape === 1 ? "Un exercice à ton niveau, sur papier" : "Tu as tout fait"} />
      <Etapes noms={noms} actif={droits.coach ? a.etape : Math.max(0, a.etape - 1)} />
      {!droits.coach && <p className="carte" style={{ borderColor: "var(--cuivre)", marginBottom: 14 }}>Avec l&apos;offre gratuite, ta séance contient l&apos;exercice du jour et sa correction. Le Pass ajoute les questions à revoir. <Link href="/app/offres">Voir le Pass</Link></p>}

      {a.etape === 0 && (
        <section className="carte">
          <h2>{pluriel(a.quiz.length + a.questions.length, "question", "questions")} à revoir</h2>
          {a.quiz.length > 0 ? (
            <>
              <p>{a.quiz.length > 1 ? `Commence par ces ${a.quiz.length} questions de quiz.` : "Commence par cette question de quiz."} La correction s&apos;affiche après chaque réponse.</p>
              <div className="actions"><BoutonAction lancer={quiz}>{a.quiz.length > 1 ? `Faire les ${a.quiz.length} questions de quiz` : "Faire la question de quiz"}</BoutonAction></div>
            </>
          ) : (
            <>
              <p>{a.questions.length > 1 ? `Il te reste ${a.questions.length} questions de ton carnet d'erreurs.` : "Il te reste une question de ton carnet d'erreurs."} Réponds sur ta feuille, puis compare avec le corrigé.</p>
              <div className="actions"><Link className="btn btn-cuivre" href={`/app/seance/${a.questions[0]}`}><Icone nom="lecture" />Revoir la question</Link></div>
            </>
          )}
        </section>
      )}

      {a.etape === 1 && exo && (
        <section className="carte">
          <div className="surtitre">Fiche {exo.d.fiche} · {exo.d.k === "q" ? `Q.${exo.d.n}` : `Exercice ${exo.d.n}`}</div>
          <h2><ContenuHtml html={exo.i.titre} /></h2>
          <p>Prends une feuille et un stylo. Rédige ta réponse comme le jour du DS. Ensuite, ouvre le corrigé et note-toi.</p>
          <div className="actions"><Link className="btn btn-cuivre" href={`/app/seance/${a.exercice}`}><Icone nom="lecture" />Faire l&apos;exercice</Link></div>
        </section>
      )}

      {a.etape === 2 && (
        <section className="carte">
          <h2>{a.exercice ? "Tout est fait pour aujourd'hui" : "Pas d'exercice à te proposer aujourd'hui"}</h2>
          <p>{a.exercice ? "Tu as répondu à tout ce que la séance demandait. Il ne reste qu'à la terminer." : "Coche dans les cours les chapitres que tu as vus en classe : ta prochaine séance portera dessus."}</p>
          <div className="actions"><BoutonAction lancer={terminer}>Terminer ma séance</BoutonAction>{!a.exercice && <Link className="btn btn-ligne" href="/app/cours">Ouvrir les cours</Link>}</div>
        </section>
      )}
    </>
  );
}
