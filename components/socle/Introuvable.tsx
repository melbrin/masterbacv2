import Link from "next/link";

/** Ce que l'élève voit quand l'adresse ne mène à rien : une page, un défi, un TP ou un devoir qui n'existe pas. */
export default function Introuvable({ retour }: { retour: { href: string; nom: string } }) {
  return (
    <section className="panne" aria-labelledby="titre-introuvable">
      <header className="entete">
        <div className="surtitre">Page introuvable</div>
        <h1 id="titre-introuvable">Cette page n&apos;existe pas</h1>
        <p className="sous-titre">L&apos;adresse est peut-être mal écrite, ou ce que tu cherches a été retiré.</p>
      </header>
      <div className="actions">
        <Link className="btn btn-cuivre" href={retour.href}>{retour.nom}</Link>
      </div>
    </section>
  );
}
