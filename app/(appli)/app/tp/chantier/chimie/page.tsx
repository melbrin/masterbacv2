import Link from "next/link";
import { Entete } from "@/components/appli/Morceaux";
import BancChimie from "@/components/tp/chantier/Chimie";
import { essayerChimie } from "@/lib/serveur/commandes/chantier/chimie";
import tpDilution from "@/lib/serveur/contenu/tp/dilution";
import tpEtalonnage from "@/lib/serveur/contenu/tp/etalonnage";
import tpCinetique from "@/lib/serveur/contenu/tp/cinetique";
import { bancDeChantier } from "@/lib/serveur/tp-chantier";

export const metadata = { title: "Chantier : chimie" };

// Le banc de chantier « chimie », en local seulement : les TP de cette famille en construction, hors de l'application.
// L'adresse accepte « ?tp=<identifiant>&graine=3 ».
export default async function Chantier({ searchParams }: { searchParams: Promise<{ tp?: string; graine?: string }> }) {
  const { t, graine, paillasses, autres } = await bancDeChantier({ dilution: tpDilution, etalonnage: tpEtalonnage, cinetique: tpCinetique }, await searchParams);
  return (
    <>
      <Entete surtitre="Chantier, en local seulement" titre={t.titre} sous={`TP « ${t.id} », graine ${graine}. Rien n'est enregistré.`} />
      <p className="petit discret">{autres.map((id) => <Link key={id} href={`?tp=${id}&graine=${graine}`} style={{ marginRight: 12 }}>{id}</Link>)}</p>
      <BancChimie key={`${t.id}-${graine}`} tp={t.id} graine={graine} paillasses={paillasses} essayer={essayerChimie} />
    </>
  );
}
