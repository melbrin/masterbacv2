import { notFound, redirect } from "next/navigation";
import DoubleAuthentification from "@/components/appli/DoubleAuthentification";
import { sessionCourante } from "@/lib/serveur/session";

export const metadata = { title: "Double authentification" };

export default async function PageDoubleAuthentification() {
  const session = await sessionCourante();
  if (!session) redirect("/compte/connexion");
  // une personne sans le rôle ne doit même pas apprendre que cette page existe
  if (!session.admin) notFound();
  if (session.aal === "aal2") redirect("/admin");
  return (
    <main className="principal" style={{ marginLeft: 0 }}>
      <div className="colonne" style={{ maxWidth: 460 }}>
        <header className="entete"><div className="surtitre">Administration</div><h1>Double authentification</h1>
          <p className="sous-titre">L&apos;administration demande, à chaque connexion, le code de ton application d&apos;authentification.</p></header>
        <div className="carte"><DoubleAuthentification /></div>
      </div>
    </main>
  );
}
