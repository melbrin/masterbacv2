import Link from "next/link";
import { notFound } from "next/navigation";
import { Entete } from "@/components/appli/Morceaux";
import CadreTp from "@/components/tp/CadreTp";
import { demarrerTp } from "@/lib/serveur/commandes/tp";
import { tp as trouveTp } from "@/lib/serveur/contenu/tp";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";
import { essaiDe, etapePublique, tpVisible } from "@/lib/serveur/tp";

export const metadata = { title: "TP" };

// Un essai de TP. La page n'envoie au navigateur que l'énoncé de chaque étape, sans les réponses, et ce que le serveur
// a déjà répondu aux étapes validées : l'élève reprend là où il s'est arrêté.
export default async function PageEssai({ params }: { params: Promise<{ id: string }> }) {
  const { session } = await espaceEleve();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const essai = await essaiDe(session.userId, id);
  const t = essai ? trouveTp(essai.tp) : null;
  if (!essai || !t || !tpVisible(t, session.admin)) notFound();
  const identifiant = t.id;
  const refaire = async () => { "use server"; return demarrerTp({ tp: identifiant }); };
  return (
    <>
      <Entete fil={<Link href="/app/tp">TP</Link>} surtitre={`${t.famille} · ${t.minutes} min`} titre={t.titre} />
      <CadreTp key={essai.id} essai={essai.id} etapes={t.etapes(essai.graine).map((e) => etapePublique(e, essai.graine))} retours={essai.retours} bilan={essai.bilan} retour="/app/tp" refaire={refaire} />
    </>
  );
}
