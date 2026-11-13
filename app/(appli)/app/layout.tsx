import Link from "next/link";
import { redirect } from "next/navigation";
import Navigation from "@/components/appli/Navigation";
import { profilCourant } from "@/lib/serveur/requetes/profil";
import { sessionCourante } from "@/lib/serveur/session";

// Cette mise en page redirige par confort. Elle ne protège rien : chaque page et chaque action vérifie elle-même la session.
export default async function Coquille({ children }: { children: React.ReactNode }) {
  const session = await sessionCourante();
  if (!session) redirect("/compte/connexion");
  const profil = await profilCourant();
  if (!profil) redirect("/compte/profil");
  return (
    <div className="app" data-theme-choisi={profil.theme}>
      <Navigation admin={session.admin} />
      <main className="principal" id="principal">
        <div className="colonne">
          {profil.etat === "limite" ? (
            <div className="carte" style={{ marginTop: 24 }}>
              <h1>Ton compte attend l&apos;accord d&apos;un parent</h1>
              <p>Avant 15 ans, un parent doit donner son accord pour ouvrir l&apos;application. En attendant, le test de niveau reste ouvert.</p>
              <p><Link className="btn btn-cuivre" href="/">Faire le test de niveau</Link></p>
            </div>
          ) : children}
        </div>
      </main>
    </div>
  );
}
