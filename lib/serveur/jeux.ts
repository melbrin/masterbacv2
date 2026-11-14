import "server-only";
import { ID_JEUX, lignesEssentiel, tire, type ChapitreJeu, type IdJeu, type LigneEssentiel, type QuestionChapitre, type QuestionNotion } from "@/lib/commun/jeux";
import { catalogue, ficheComplete } from "@/lib/serveur/contenu/lecture";
import { clientAdmin, clientUtilisateur } from "@/lib/serveur/supabase/clients";

export interface MatiereDesJeux {
  chapitres: ChapitreJeu[];
  lignes: LigneEssentiel[];
  questions: QuestionChapitre[];
  notions: QuestionNotion[];
}

// Un titre comme « En déduire la hauteur du point d'impact » ne dit rien sans la question d'avant :
// il ne peut pas servir à reconnaître un chapitre ou une notion.
const seComprendSeul = (titre: string) => !/^(en déduire|même question|conclure)/i.test(titre.replace(/<[^>]*>/g, "").trim());

/**
 * La matière des jeux qui tournent dans le navigateur, pour les chapitres choisis. Elle ne contient que ce que
 * tout compte peut déjà lire : le tableau « À connaître par cœur » de l'onglet L'essentiel, les titres des questions
 * et les noms des notions. Aucun corrigé, aucune réponse de quiz.
 */
export async function matiereDesJeux(fiches: number[], graine: number): Promise<MatiereDesJeux> {
  const cat = await catalogue();
  const choisies = cat.fiches.filter((f) => fiches.includes(f.num));
  const completes = await Promise.all(choisies.map((f) => ficheComplete(f.num)));
  const lignes = completes.flatMap((c) => (c ? lignesEssentiel(c.essentiel_html, c.num) : []));
  const questions: QuestionChapitre[] = [];
  const notions: QuestionNotion[] = [];
  for (const f of choisies) {
    const nom = new Map(f.liste_notions.map((n) => [n.id, n.nom]));
    f.items.filter((i) => i.k === "q" && seComprendSeul(i.titre)).forEach((i, rang) => {
      const id = `${f.num}-q${i.n}`;
      questions.push({ id, fiche: f.num, titre: i.titre });
      // la bonne notion : la première que la fiche rattache à la question ; les leurres : trois notions qu'elle ne travaille pas
      const bonne = i.notions.map((n) => nom.get(n)).find((x): x is string => !!x);
      const autres = f.liste_notions.filter((n) => !i.notions.includes(n.id)).map((n) => n.nom);
      if (bonne && autres.length >= 3) notions.push({ id, fiche: f.num, titre: i.titre, notion: bonne, leurres: tire(autres, 3, graine + f.num * 101 + rang) });
    });
  }
  return { chapitres: choisies.map((f) => ({ num: f.num, titre: f.titre_court })), lignes, questions, notions };
}

/** Le meilleur score de l'élève à chaque jeu, et le nombre de parties des sept derniers jours. Lu avec ses propres droits. */
export async function recordsDe(userId: string): Promise<{ records: Partial<Record<IdJeu, number>>; partiesSemaine: number; parties: number }> {
  const base = await clientUtilisateur();
  const { data, error } = await base.from("parties").select("jeu, score, cree_le").eq("user_id", userId).order("cree_le", { ascending: false }).limit(1000);
  if (error) throw new Error("La base ne répond pas.");
  const records: Partial<Record<IdJeu, number>> = {};
  const limite = Date.now() - 7 * 86_400_000;
  let partiesSemaine = 0;
  for (const p of data ?? []) {
    const id = p.jeu as IdJeu;
    if (!ID_JEUX.includes(id)) continue;
    records[id] = Math.max(records[id] ?? 0, p.score);
    if (Date.parse(p.cree_le) >= limite) partiesSemaine += 1;
  }
  return { records, partiesSemaine, parties: (data ?? []).length };
}

/**
 * Écrit une partie terminée et dit si elle bat le record de l'élève à ce jeu.
 * C'est le serveur qui écrit : l'élève n'a aucun droit d'écriture sur cette table.
 */
export async function ecritPartie(userId: string, p: { jeu: IdJeu; fiches: number[]; score: number; secondes: number; verifiee: boolean }): Promise<{ record: number; battu: boolean }> {
  const base = clientAdmin();
  const { data: avant } = await base.from("parties").select("score").eq("user_id", userId).eq("jeu", p.jeu).order("score", { ascending: false }).limit(1);
  const ancien = avant?.[0]?.score ?? null;
  const { error } = await base.from("parties").insert({
    user_id: userId, jeu: p.jeu, fiches: [...new Set(p.fiches)].sort((a, b) => a - b).slice(0, 14), score: p.score, secondes: p.secondes, verifiee: p.verifiee,
  });
  if (error) throw new Error("partie refusée par la base");
  return { record: Math.max(ancien ?? 0, p.score), battu: p.score > 0 && (ancien === null || p.score > ancien) };
}
