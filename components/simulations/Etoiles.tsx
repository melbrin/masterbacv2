import { pluriel } from "@/lib/commun/format";

/** Les étoiles d'un défi du labo : celles qui sont gagnées sont pleines. */
export default function Etoiles({ gagnees, total = 3, grandes = false }: { gagnees: number; total?: number; grandes?: boolean }) {
  return (
    <span className={`labo-etoiles${grandes ? " labo-etoiles-grandes" : ""}`} role="img" aria-label={`${pluriel(gagnees, "étoile", "étoiles")} sur ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" aria-hidden="true" className={i < gagnees ? "est-gagnee" : undefined}>
          <path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5L2.5 9.5l6.6-.9z" />
        </svg>
      ))}
    </span>
  );
}
