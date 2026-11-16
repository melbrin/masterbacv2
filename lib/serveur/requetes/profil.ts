import "server-only";
import { cache } from "react";
import { sessionCourante } from "@/lib/serveur/session";
import { clientUtilisateur } from "@/lib/serveur/supabase/clients";

/** Le profil de la personne connectée, lu avec son propre client : les règles d'accès s'appliquent. */
export const profilCourant = cache(async () => {
  const session = await sessionCourante();
  if (!session) return null;
  const base = await clientUtilisateur();
  const { data, error } = await base.from("profils").select("*").eq("user_id", session.userId).maybeSingle();
  // une lecture qui échoue n'est pas « pas de profil » : sans cela, une panne de la base renvoyait l'élève à la création de son profil
  if (error) throw new Error("La base ne répond pas.");
  return data;
});
