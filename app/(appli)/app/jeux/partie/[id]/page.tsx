import Link from "next/link";
import { notFound } from "next/navigation";
import { Entete } from "@/components/appli/Morceaux";
import { JeuChrono, JeuOrdre, JeuVraiFaux } from "@/components/jeux/JeuxQuiz";
import { jeu as ficheDuJeu } from "@/lib/commun/jeux";
import { demarrerJeu } from "@/lib/serveur/commandes/jeux";
import { sessionQuiz } from "@/lib/serveur/requetes/quiz";

export const metadata = { title: "Jeu" };
const SECONDES_CHRONO = 90;

// Une partie d'un jeu corrigé par le serveur. Le composant du jeu reste affiché du début à la fin :
// la page se recharge après chaque réponse, et le score de fin doit rester à l'écran.
export default async function Partie({ params }: { params: Promise<{ id: string }> }) {
  const s = await sessionQuiz((await params).id);
  if (!s || s.genre !== "jeu" || !s.jeu) notFound();
  const infos = ficheDuJeu(s.jeu);
  if (!infos) notFound();
  const { jeu, fiches } = s;
  const retour = `/app/jeux${fiches.length === 1 ? `?fiche=${fiches[0]}` : ""}`;
  const rejouer = async () => { "use server"; return demarrerJeu({ jeu, fiches }); };
  // la partie était déjà finie à l'ouverture de la page : on montre son score, sans record
  const bonnes = s.bonnes ?? s.justes;
  const finInitiale = s.terminee
    ? { score: jeu === "chrono" ? 10 * bonnes : Math.round((100 * bonnes) / Math.max(1, s.total)), bonnes, total: jeu === "chrono" ? s.rang : s.total, record: null, battu: false }
    : null;
  const commun = { session: s.id, rangInitial: s.rang, vueInitiale: s.vue, justesInitiales: s.justes, total: s.total, finInitiale, rejouer, retour };
  return (
    <>
      <Entete fil={<Link href={retour}>Jeux</Link>} titre={infos.nom} />
      {jeu === "chrono" && <JeuChrono {...commun} limite={s.limite ?? new Date(Date.parse(s.debut) + (SECONDES_CHRONO + 3) * 1000).toISOString()} secondes={SECONDES_CHRONO} />}
      {jeu === "vraifaux" && <JeuVraiFaux {...commun} />}
      {jeu === "ordre" && <JeuOrdre {...commun} />}
    </>
  );
}
