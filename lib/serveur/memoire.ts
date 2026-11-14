import "server-only";
import { jeuMemoire } from "@/lib/commun/memoire";
import { clientAdmin, clientUtilisateur } from "@/lib/serveur/supabase/clients";

export interface BilanMemoire {
  /** le meilleur score de l'élève à chaque jeu */
  records: Record<string, number>;
  /** les parties et les jours d'entraînement des sept derniers jours */
  partiesSemaine: number;
  joursSemaine: number;
  parties: number;
}

/** Où l'élève en est dans les jeux de mémoire. Lu avec ses propres droits. */
export async function bilanMemoire(userId: string): Promise<BilanMemoire> {
  const base = await clientUtilisateur();
  const { data, error } = await base.from("memoire").select("jeu, score, cree_le").eq("user_id", userId).order("cree_le", { ascending: false }).limit(2000);
  if (error) throw new Error("La base ne répond pas.");
  const records: Record<string, number> = {};
  const limite = Date.now() - 7 * 86_400_000;
  const jours = new Set<string>();
  let partiesSemaine = 0;
  for (const p of data ?? []) {
    if (!jeuMemoire(p.jeu)) continue;
    records[p.jeu] = Math.max(records[p.jeu] ?? 0, p.score);
    if (Date.parse(p.cree_le) >= limite) {
      partiesSemaine += 1;
      jours.add(p.cree_le.slice(0, 10));
    }
  }
  return { records, partiesSemaine, joursSemaine: jours.size, parties: (data ?? []).length };
}

/**
 * Écrit une partie de mémoire terminée et dit si elle bat le record de l'élève à ce jeu.
 * C'est le serveur qui écrit : l'élève n'a aucun droit d'écriture sur cette table.
 */
export async function ecritPartieMemoire(userId: string, p: { jeu: string; score: number; secondes: number }): Promise<{ record: number; battu: boolean }> {
  const base = clientAdmin();
  const { data: avant } = await base.from("memoire").select("score").eq("user_id", userId).eq("jeu", p.jeu).order("score", { ascending: false }).limit(1);
  const ancien = avant?.[0]?.score ?? null;
  const { error } = await base.from("memoire").insert({ user_id: userId, jeu: p.jeu, score: p.score, secondes: p.secondes });
  if (error) throw new Error("partie refusée par la base");
  return { record: Math.max(ancien ?? 0, p.score), battu: p.score > 0 && (ancien === null || p.score > ancien) };
}
