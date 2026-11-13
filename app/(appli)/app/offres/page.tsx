import { Entete } from "@/components/appli/Morceaux";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export const metadata = { title: "Offres" };
const BOUTIQUE = "https://www.masterbac.com";

export default async function Offres() {
  const { droits } = await espaceEleve();
  const offres = [
    { id: "gratuit", nom: "Gratuit", prix: "0 €", lignes: ["Le test de niveau", "Une préparation de DS offerte, corrigés de son plan compris", "L'exercice du jour et son corrigé", "Les énoncés, les indices, les quiz et le carnet d'erreurs"] },
    { id: "mensuel", nom: "Mensuel", prix: "9,99 € par mois", lignes: ["L'application complète", "Tous les corrigés, le mode DS sans limite", "Résiliable à tout moment"] },
    { id: "pass", nom: "Pass Bac 2027", prix: "79 €, une fois", lignes: ["L'application complète jusqu'aux résultats du bac", "Les trois stages en direct : Noël, printemps, sprint final"] },
    { id: "pack", nom: "Pack BAC", prix: "149 €, au printemps 2027", lignes: ["Le Pass", "Le cahier imprimé", "Deux bacs blancs corrigés par un professeur"], aVenir: true },
  ];
  return (
    <>
      <Entete titre="Les offres" sous="L'achat se fait sur la boutique MasterBac. Ton accès est ensuite ouvert sur ce compte, avec l'adresse e-mail utilisée pour la commande." />
      <div className="pile">
        {offres.map((o) => (
          <section className="carte" key={o.id} style={droits.offre === o.id ? { borderColor: "var(--cuivre)" } : undefined}>
            <div className="tete"><h2>{o.nom}</h2><span className="puce">{droits.offre === o.id ? "Ton offre actuelle" : o.prix}</span></div>
            <ul className="contenu">{o.lignes.map((l) => <li key={l}>{l}</li>)}</ul>
            {o.id !== "gratuit" && !o.aVenir && droits.offre !== o.id && <div className="actions"><a className="btn btn-cuivre" href={BOUTIQUE} rel="noopener noreferrer">Acheter sur la boutique</a></div>}
            {o.aVenir && <p className="petit discret" style={{ margin: 0 }}>Disponible au printemps 2027.</p>}
          </section>
        ))}
      </div>
      <p className="petit discret" style={{ marginTop: 14 }}>Après ton achat, connecte-toi ici avec la même adresse e-mail. Si ton accès n&apos;apparaît pas sous 24 heures, réponds à l&apos;e-mail de confirmation de ta commande.</p>
    </>
  );
}
