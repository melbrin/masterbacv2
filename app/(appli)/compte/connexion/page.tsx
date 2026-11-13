import { redirect } from "next/navigation";
import FormulaireConnexion from "@/components/appli/FormulaireConnexion";
import { sessionCourante } from "@/lib/serveur/session";

export const metadata = { title: "Connexion" };

export default async function Connexion() {
  if (await sessionCourante()) redirect("/app");
  return (
    <main className="principal" style={{ marginLeft: 0 }}>
      <div className="colonne" style={{ maxWidth: 460 }}>
        <header className="entete">
          <div className="surtitre">MasterBac</div>
          <h1>Connexion</h1>
          <p className="sous-titre">Le même écran sert à créer ton compte et à te connecter.</p>
        </header>
        <div className="carte"><FormulaireConnexion /></div>
      </div>
    </main>
  );
}
