import { notFound, redirect } from "next/navigation";
import * as m from "@/lib/moteur";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

// Reprendre une séance d'un plan de DS : on va droit à la première étape qui reste à faire.
// Quand tout est fait, on revient au plan, qui fête la séance terminée.
export default async function Reprise({ params }: { params: Promise<{ id: string; seance: string }> }) {
  const { id, seance } = await params;
  const { devoirs, ctx } = await espaceEleve();
  const ds = devoirs.find((d) => d.id === id);
  const s = ds?.seances.find((x) => x.id === seance);
  if (!ds || !s) notFound();
  const rang = m.prochaineEtape(ctx, ds.creeA, s);
  if (rang >= 0) redirect(`/app/ds/${id}/${seance}/${rang + 1}`);
  redirect(m.etapesDeSeance(s).length ? `/app/ds/${id}?fin=${seance}` : `/app/ds/${id}`);
}
