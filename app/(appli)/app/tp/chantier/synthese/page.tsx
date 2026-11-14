import Link from "next/link";
import { Entete } from "@/components/appli/Morceaux";
import BancSynthese from "@/components/tp/chantier/Synthese";
import { essayerSynthese } from "@/lib/serveur/commandes/chantier/synthese";
import tpSynthese from "@/lib/serveur/contenu/tp/synthese";
import { bancDeChantier } from "@/lib/serveur/tp-chantier";

export const metadata = { title: "Chantier : synthese" };

// Le banc de chantier « synthese », en local seulement : les TP de cette famille en construction, hors de l'application.
// L'adresse accepte « ?tp=<identifiant>&graine=3 ».
export default async function Chantier({ searchParams }: { searchParams: Promise<{ tp?: string; graine?: string }> }) {
  const { t, graine, paillasses, autres } = await bancDeChantier({ synthese: tpSynthese }, await searchParams);
  return (
    <>
      <Entete surtitre="Chantier, en local seulement" titre={t.titre} sous={`TP « ${t.id} », graine ${graine}. Rien n'est enregistré.`} />
      <p className="petit discret">{autres.map((id) => <Link key={id} href={`?tp=${id}&graine=${graine}`} style={{ marginRight: 12 }}>{id}</Link>)}</p>
      <BancSynthese key={`${t.id}-${graine}`} tp={t.id} graine={graine} paillasses={paillasses} essayer={essayerSynthese} />
    </>
  );
}
