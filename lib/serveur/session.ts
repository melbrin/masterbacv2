import "server-only";
import { cache } from "react";
import { clientUtilisateur } from "@/lib/serveur/supabase/clients";

export interface Session {
  userId: string;
  email: string;
  admin: boolean;
  /** niveau d'authentification : aal2 quand la double authentification a été passée */
  aal: "aal1" | "aal2";
  sessionId: string;
}

/** La session vérifiée de la requête en cours, ou rien. Le jeton est vérifié sur le serveur, jamais cru sur parole. */
export const sessionCourante = cache(async (): Promise<Session | null> => {
  const base = await clientUtilisateur();
  const { data, error } = await base.auth.getClaims();
  const c = data?.claims;
  if (error || !c || typeof c.sub !== "string" || !c.email) return null;
  const meta = (c.app_metadata ?? {}) as Record<string, unknown>;
  return {
    userId: c.sub,
    email: String(c.email),
    admin: meta.role === "admin",
    aal: c.aal === "aal2" ? "aal2" : "aal1",
    sessionId: String(c.session_id ?? ""),
  };
});
