import Introuvable from "@/components/socle/Introuvable";

export const metadata = { title: "Page introuvable" };

// Une adresse de l'application qui ne mène à rien : un défi, un TP, un devoir ou une fiche qui n'existe pas.
export default function PageIntrouvable() {
  return <Introuvable retour={{ href: "/app", nom: "Revenir à Aujourd'hui" }} />;
}
