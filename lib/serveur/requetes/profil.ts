import "server-only";
import { cache } from "react";
import { sessionCourante } from "@/lib/serveur/session";
import { clientUtilisateur } from "@/lib/serveur/supabase/clients";

/** Le profil de la personne connectée, lu avec son propre client : les règles d'accès s'appliquent. */
export const profilCourant = cache(async () => {
  const session = await sessionCourante();
  if (!session) return null;
  const base = await clientUtilisateur();
  const { data } = await base.from("profils").select("*").eq("user_id", session.userId).maybeSingle();
  return data;
});
