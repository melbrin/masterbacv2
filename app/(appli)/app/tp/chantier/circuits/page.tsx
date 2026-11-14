import Link from "next/link";
import { Entete } from "@/components/appli/Morceaux";
import BancCircuits from "@/components/tp/chantier/Circuits";
import { essayerCircuits } from "@/lib/serveur/commandes/chantier/circuits";
import tpCondensateur from "@/lib/serveur/contenu/tp/condensateur";
import tpJauge from "@/lib/serveur/contenu/tp/jauge";
import { bancDeChantier } from "@/lib/serveur/tp-chantier";

export const metadata = { title: "Chantier : circuits" };

// Le banc de chantier « circuits », en local seulement : les TP de cette famille en construction, hors de l'application.
// L'adresse accepte « ?tp=<identifiant>&graine=3 ».
export default async function Chantier({ searchParams }: { searchParams: Promise<{ tp?: string; graine?: string }> }) {
  const { t, graine, paillasses, autres } = await bancDeChantier({ condensateur: tpCondensateur, jauge: tpJauge }, await searchParams);
  return (
    <>
      <Entete surtitre="Chantier, en local seulement" titre={t.titre} sous={`TP « ${t.id} », graine ${graine}. Rien n'est enregistré.`} />
      <p className="petit discret">{autres.map((id) => <Link key={id} href={`?tp=${id}&graine=${graine}`} style={{ marginRight: 12 }}>{id}</Link>)}</p>
      <BancCircuits key={`${t.id}-${graine}`} tp={t.id} graine={graine} paillasses={paillasses} essayer={essayerCircuits} />
    </>
  );
}
