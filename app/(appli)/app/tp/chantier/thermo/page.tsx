import Link from "next/link";
import { Entete } from "@/components/appli/Morceaux";
import BancThermo from "@/components/tp/chantier/Thermo";
import { essayerThermo } from "@/lib/serveur/commandes/chantier/thermo";
import tpArchimede from "@/lib/serveur/contenu/tp/archimede";
import tpCalorimetrie from "@/lib/serveur/contenu/tp/calorimetrie";
import tpPile from "@/lib/serveur/contenu/tp/pile";
import tpElectrolyse from "@/lib/serveur/contenu/tp/electrolyse";
import { bancDeChantier } from "@/lib/serveur/tp-chantier";

export const metadata = { title: "Chantier : thermo" };

// Le banc de chantier « thermo », en local seulement : les TP de cette famille en construction, hors de l'application.
// L'adresse accepte « ?tp=<identifiant>&graine=3 ».
export default async function Chantier({ searchParams }: { searchParams: Promise<{ tp?: string; graine?: string }> }) {
  const { t, graine, paillasses, autres } = await bancDeChantier({ archimede: tpArchimede, calorimetrie: tpCalorimetrie, pile: tpPile, electrolyse: tpElectrolyse }, await searchParams);
  return (
    <>
      <Entete surtitre="Chantier, en local seulement" titre={t.titre} sous={`TP « ${t.id} », graine ${graine}. Rien n'est enregistré.`} />
      <p className="petit discret">{autres.map((id) => <Link key={id} href={`?tp=${id}&graine=${graine}`} style={{ marginRight: 12 }}>{id}</Link>)}</p>
      <BancThermo key={`${t.id}-${graine}`} tp={t.id} graine={graine} paillasses={paillasses} essayer={essayerThermo} />
    </>
  );
}
