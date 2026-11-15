import type { LigneDeGrille } from "@/lib/commun/bilan-entrainement";
import type { Niveau } from "@/lib/commun/tp/types";

const NIVEAUX: Niveau[] = ["A", "B", "C", "D"];

/**
 * La grille de l'élève sur la page des progrès, présentée comme la grille d'évaluation de l'épreuve d'ECE :
 * une ligne par compétence, une case par niveau, et la case de son niveau habituel cochée (décision 0015).
 */
export default function GrilleEce({ lignes }: { lignes: LigneDeGrille[] }) {
  return (
    <table className="grille-ece">
      <caption className="sr">Ton niveau habituel dans chaque compétence de l&apos;épreuve d&apos;ECE</caption>
      <thead>
        <tr><th scope="col">Compétence</th>{NIVEAUX.map((n) => <th key={n} scope="col">{n}</th>)}</tr>
      </thead>
      <tbody>
        {lignes.map((c) => (
          <tr key={c.id}>
            <th scope="row"><b>{c.nom}</b><span>{c.quoi}, sur {c.sur} TP</span></th>
            {NIVEAUX.map((n) => (
              <td key={n}>{c.niveau === n
                ? <span className={`grille-ece-case tp-niveau-${n}`}>{n}<span className="sr"> : ton niveau</span></span>
                : <span className="grille-ece-case" aria-hidden="true" />}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
