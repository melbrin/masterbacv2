import Introuvable from "@/components/socle/Introuvable";

export const metadata = { title: "Page introuvable" };

// Une adresse du compte ou de l'administration qui ne mène à rien.
export default function PageIntrouvable() {
  return (
    <main className="principal" style={{ marginLeft: 0 }}>
      <div className="colonne" style={{ maxWidth: 520 }}>
        <Introuvable retour={{ href: "/app", nom: "Revenir à l'accueil" }} />
      </div>
    </main>
  );
}
