import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env } from "@/lib/serveur/env";
import type { Database } from "./types";

export type Base = SupabaseClient<Database>;

/** Options de tous les cookies de session : illisibles par un script, jamais envoyés à un autre site. */
export const OPTIONS_COOKIE = { httpOnly: true, sameSite: "lax" as const, path: "/" };

/**
 * Le client de la personne connectée : clé publiable et session lue dans les cookies.
 * Les règles d'accès de la base s'appliquent : une requête mal filtrée ne renvoie que ses lignes.
 */
export async function clientUtilisateur(): Promise<Base> {
  const e = env();
  const pot = await cookies();
  return createServerClient<Database>(e.SUPABASE_URL, e.SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => pot.getAll(),
      setAll(liste) {
        try {
          for (const c of liste) pot.set(c.name, c.value, { ...c.options, ...OPTIONS_COOKIE, secure: e.APP_ENV !== "local" });
        } catch {
          // Dans un composant serveur, les cookies ne s'écrivent pas : le proxy renouvelle la session.
        }
      },
    },
  });
}

let admin: Base | null = null;

/**
 * Le client de service : il contourne les règles d'accès. Il ne s'importe que depuis commandes/, contenu/,
 * requetes/ du serveur et admin/, et chaque usage filtre explicitement par la session.
 */
export function clientAdmin(): Base {
  if (!admin) {
    const e = env();
    admin = createClient<Database>(e.SUPABASE_URL, e.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return admin;
}
