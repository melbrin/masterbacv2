import Link from "next/link";
import { Entete } from "@/components/appli/Morceaux";
import BancOndes from "@/components/tp/chantier/Ondes";
import { essayerOndes } from "@/lib/serveur/commandes/chantier/ondes";
import tpUltrasons from "@/lib/serveur/contenu/tp/ultrasons";
import tpChute from "@/lib/serveur/contenu/tp/chute";
import tpDoppler from "@/lib/serveur/contenu/tp/doppler";
import { bancDeChantier } from "@/lib/serveur/tp-chantier";

export const metadata = { title: "Chantier : ondes" };

// Le banc de chantier « ondes », en local seulement : les TP de cette famille en construction, hors de l'application.
// L'adresse accepte « ?tp=<identifiant>&graine=3 ».
export default async function Chantier({ searchParams }: { searchParams: Promise<{ tp?: string; graine?: string }> }) {
  const { t, graine, paillasses, autres } = await bancDeChantier({ ultrasons: tpUltrasons, chute: tpChute, doppler: tpDoppler }, await searchParams);
  return (
    <>
      <Entete surtitre="Chantier, en local seulement" titre={t.titre} sous={`TP « ${t.id} », graine ${graine}. Rien n'est enregistré.`} />
      <p className="petit discret">{autres.map((id) => <Link key={id} href={`?tp=${id}&graine=${graine}`} style={{ marginRight: 12 }}>{id}</Link>)}</p>
      <BancOndes key={`${t.id}-${graine}`} tp={t.id} graine={graine} paillasses={paillasses} essayer={essayerOndes} />
    </>
  );
}
