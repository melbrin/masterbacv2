import { peutOuvrirCorrige } from "@/lib/serveur/acces";
import { figure, telechargeFigure } from "@/lib/serveur/contenu/lecture";
import { sessionCourante } from "@/lib/serveur/session";

// Les figures vivent dans un compartiment privé. Cette route vérifie la session, puis le droit pour une figure de corrigé.
const refus = (statut: number) => new Response(null, { status: statut, headers: { "Cache-Control": "private, no-store" } });

export async function GET(_requete: Request, { params }: { params: Promise<{ fiche: string; nom: string }> }) {
  const { fiche, nom } = await params;
  if (!/^\d{2}$/.test(fiche) || !/^[A-Za-z0-9_.-]+\.webp$/.test(nom) || nom.includes("..")) return refus(404);
  const session = await sessionCourante();
  if (!session) return refus(401);
  const chemin = `${fiche}/${nom}`;
  const f = await figure(chemin);
  if (!f) return refus(404);
  if (f.corrige_seul) {
    let ouvert = false;
    for (const cle of f.items) if (await peutOuvrirCorrige(session.userId, cle)) { ouvert = true; break; }
    if (!ouvert) return refus(403);
  }
  const data = await telechargeFigure(chemin);
  if (!data) return refus(404);
  return new Response(data, { headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" } });
}
