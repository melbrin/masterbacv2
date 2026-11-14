import Link from "next/link";
import { Entete } from "@/components/appli/Morceaux";
import BancOptique from "@/components/tp/chantier/Optique";
import { essayerOptique } from "@/lib/serveur/commandes/chantier/optique";
import tpFocale from "@/lib/serveur/contenu/tp/focale";
import tpLunette from "@/lib/serveur/contenu/tp/lunette";
import tpCheveu from "@/lib/serveur/contenu/tp/cheveu";
import tpYoung from "@/lib/serveur/contenu/tp/young";
import { bancDeChantier } from "@/lib/serveur/tp-chantier";

export const metadata = { title: "Chantier : optique" };

// Le banc de chantier « optique », en local seulement : les TP de cette famille en construction, hors de l'application.
// L'adresse accepte « ?tp=<identifiant>&graine=3 ».
export default async function Chantier({ searchParams }: { searchParams: Promise<{ tp?: string; graine?: string }> }) {
  const { t, graine, paillasses, autres } = await bancDeChantier({ focale: tpFocale, lunette: tpLunette, cheveu: tpCheveu, young: tpYoung }, await searchParams);
  return (
    <>
      <Entete surtitre="Chantier, en local seulement" titre={t.titre} sous={`TP « ${t.id} », graine ${graine}. Rien n'est enregistré.`} />
      <p className="petit discret">{autres.map((id) => <Link key={id} href={`?tp=${id}&graine=${graine}`} style={{ marginRight: 12 }}>{id}</Link>)}</p>
      <BancOptique key={`${t.id}-${graine}`} tp={t.id} graine={graine} paillasses={paillasses} essayer={essayerOptique} />
    </>
  );
}
