import Link from "next/link";
import { notFound } from "next/navigation";
import { Entete } from "@/components/appli/Morceaux";
import BancDesTp from "@/components/tp/BancDesTp";
import { tp as trouveTp } from "@/lib/serveur/contenu/tp";
import { env } from "@/lib/serveur/env";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";
import { etapePublique } from "@/lib/serveur/tp";

export const metadata = { title: "Banc d'essai" };

// Le banc d'essai d'un TP, en local seulement : ses paillasses, sans les étapes d'avant ni d'après, et sans rien écrire.
// Il sert à mettre au point une paillasse. L'adresse accepte « ?graine=3 » pour changer les valeurs de la situation.
export default async function PageBanc({ params, searchParams }: { params: Promise<{ tp: string }>; searchParams: Promise<{ graine?: string }> }) {
  if (env().APP_ENV !== "local") notFound();
  await espaceEleve();
  const t = trouveTp((await params).tp);
  if (!t) notFound();
  const graine = Math.max(1, Math.min(2 ** 31 - 1, Math.trunc(Number((await searchParams).graine)) || 1));
  const paillasses = t.etapes(graine).flatMap((etape, rang) => (etape.genre === "paillasse" ? [{ rang, etape: etapePublique(etape, graine) }] : []));
  return (
    <>
      <Entete fil={<Link href="/app/tp">TP</Link>} surtitre="Banc d'essai, en local seulement" titre={t.titre} sous={`Graine ${graine}. Rien n'est enregistré.`} />
      <BancDesTp tp={t.id} graine={graine} paillasses={paillasses} />
    </>
  );
}
