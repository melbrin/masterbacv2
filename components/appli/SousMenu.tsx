import Link from "next/link";
import { ENTRAINEMENT, SECTIONS, type IdSection } from "@/lib/commun/entrainement";

/**
 * La rangée des sous-sections de « S'entraîner », en haut de la page de chacune : l'entrée en cours est marquée.
 * Une page intérieure (un défi, un essai de TP, un jeu) ne la montre pas.
 */
export default function SousMenu({ actif, ouvertes }: { actif: IdSection; ouvertes: readonly IdSection[] }) {
  return (
    <nav className="onglets sous-menu" aria-label={ENTRAINEMENT.nom}>
      {SECTIONS.filter((s) => s.id === actif || ouvertes.includes(s.id)).map((s) => (
        <Link key={s.id} href={s.href} aria-current={s.id === actif ? "page" : undefined}>{s.nom}</Link>
      ))}
    </nav>
  );
}
