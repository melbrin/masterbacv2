import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Le proxy ne protège rien à lui seul : chaque page, chaque action vérifie elle-même la session et le droit.
// Il renouvelle la session avant le rendu, et empêche la mise en cache des pages connectées.
export async function proxy(requete: NextRequest) {
  let reponse = NextResponse.next({ request: requete });
  const url = process.env.SUPABASE_URL;
  const cle = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (url && cle) {
    const base = createServerClient(url, cle, {
      cookies: {
        getAll: () => requete.cookies.getAll(),
        setAll(liste) {
          for (const c of liste) requete.cookies.set(c.name, c.value);
          reponse = NextResponse.next({ request: requete });
          for (const c of liste) {
            reponse.cookies.set(c.name, c.value, { ...c.options, httpOnly: true, sameSite: "lax", path: "/", secure: process.env.APP_ENV !== "local" });
          }
        },
      },
    });
    await base.auth.getClaims();
  }
  reponse.headers.set("Cache-Control", "private, no-store");
  return reponse;
}

export const config = {
  // l'espace connecté, le compte et l'administration ; le test gratuit reste statique
  matcher: ["/app/:path*", "/compte/:path*", "/admin/:path*", "/api/figures/:path*"],
};
