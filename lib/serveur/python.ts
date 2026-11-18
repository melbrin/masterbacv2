import "server-only";
import { cache } from "react";
import { THEMES_PYTHON, type ExercicePython, type ThemePython } from "@/lib/commun/python/types";
import { EXERCICES_PYTHON } from "@/lib/serveur/contenu/python";
import { env } from "@/lib/serveur/env";
import { clientUtilisateur } from "@/lib/serveur/supabase/clients";

// Le hub Python (décision 0016) côté serveur : quels exercices ce compte peut voir, et où l'élève en est.

/** L'interrupteur du hub : fermé (variable HUB_PYTHON=ferme), le hub disparaît, pages et actions comprises. */
export const hubOuvert = (): boolean => env().HUB_PYTHON !== "ferme";

/**
 * Un exercice écrit par Claude Code reste un brouillon tant que Yane ne l'a pas validé (docs/07-contenu.md).
 * Un brouillon ne se montre qu'en local, ou à l'administrateur : jamais à un élève sur la recette ou la production.
 */
export const exerciceVisible = (e: ExercicePython, admin: boolean): boolean => hubOuvert() && (e.etat === "valide" || admin || env().APP_ENV === "local");

/** Les exercices que ce compte peut voir, dans l'ordre du hub. */
export const exercicesVisibles = (admin: boolean): ExercicePython[] => EXERCICES_PYTHON.filter((e) => exerciceVisible(e, admin));

/** L'exercice demandé, s'il existe et si ce compte peut le voir ; sinon null. Les pages et les actions passent par ici. */
export function exercicePourCompte(id: string, admin: boolean): ExercicePython | null {
  const e = EXERCICES_PYTHON.find((x) => x.id === id);
  return e && exerciceVisible(e, admin) ? e : null;
}

/** Les exercices visibles, rangés par thème dans l'ordre des thèmes ; un thème vide ne se montre pas. */
export function exercicesParTheme(admin: boolean): { theme: ThemePython; nom: string; exercices: ExercicePython[] }[] {
  const visibles = exercicesVisibles(admin);
  return THEMES_PYTHON.map((t) => ({ theme: t.id, nom: t.nom, exercices: visibles.filter((e) => e.theme === t.id) })).filter((t) => t.exercices.length > 0);
}

export interface AvancementPython {
  /** les vérifications lancées */
  essais: number;
  reussi: boolean;
}

/** Où l'élève en est sur chaque exercice qu'il a essayé. Lu avec ses propres droits. */
export const avancementPython = cache(async (userId: string): Promise<Map<string, AvancementPython>> => {
  const base = await clientUtilisateur();
  const { data, error } = await base.from("python").select("exercice, essais, reussi_le").eq("user_id", userId);
  if (error) throw new Error("La base ne répond pas.");
  return new Map((data ?? []).map((l) => [l.exercice, { essais: l.essais, reussi: l.reussi_le !== null }]));
});

/**
 * Le programme de la première réussite de l'élève à cet exercice : il le retrouve en revenant, sur un autre appareil
 * aussi. Lu avec ses propres droits ; effacé avec son compte.
 */
export async function programmeReussi(userId: string, exercice: string): Promise<string | null> {
  const base = await clientUtilisateur();
  const { data, error } = await base.from("python").select("code").eq("user_id", userId).eq("exercice", exercice).maybeSingle();
  if (error) throw new Error("La base ne répond pas.");
  return data?.code ?? null;
}

/** Le premier exercice que l'élève n'a pas encore réussi, dans l'ordre du hub ; null s'il les a tous réussis. */
export const prochainExercice = (visibles: readonly ExercicePython[], avancement: ReadonlyMap<string, AvancementPython>): ExercicePython | null =>
  visibles.find((e) => !avancement.get(e.id)?.reussi) ?? null;
