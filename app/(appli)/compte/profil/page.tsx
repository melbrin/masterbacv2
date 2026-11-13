import { redirect } from "next/navigation";
import FormulaireProfil from "@/components/appli/FormulaireProfil";
import { profilCourant } from "@/lib/serveur/requetes/profil";
import { sessionCourante } from "@/lib/serveur/session";

export const metadata = { title: "Ton profil" };

export default async function ProfilInitial() {
  if (!(await sessionCourante())) redirect("/compte/connexion");
  if (await profilCourant()) redirect("/app");
  return (
    <main className="principal" style={{ marginLeft: 0 }}>
      <div className="colonne" style={{ maxWidth: 460 }}>
        <header className="entete">
          <div className="surtitre">Bienvenue</div>
          <h1>Trois questions, et on commence</h1>
        </header>
        <div className="carte"><FormulaireProfil /></div>
      </div>
    </main>
  );
}
