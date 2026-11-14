import Link from "next/link";
import Icone from "./Icone";

export function Entete({ fil, surtitre, titre, sous }: { fil?: React.ReactNode; surtitre?: string; titre?: React.ReactNode; sous?: string }) {
  return (
    <header className="entete apparait">
      {fil && <nav className="fil" aria-label="Fil d'Ariane">{fil}</nav>}
      {surtitre && <div className="surtitre">{surtitre}</div>}
      {titre && <h1>{titre}</h1>}
      {sous && <p className="sous-titre">{sous}</p>}
    </header>
  );
}

export const PillNiveau = ({ n }: { n: number }) => <span className={`niv niv-${n}`}>Objectif {n}</span>;

const LIBELLE_ETAT: Record<string, string> = { ok: "Réussi", partiel: "En partie", ko: "Raté" };
export function Point({ statut }: { statut: string | null }) {
  const lib = (statut && LIBELLE_ETAT[statut]) || "Pas encore fait";
  return <span className={`etat ${statut ? `etat-${statut}` : ""}`} role="img" aria-label={lib} title={lib} />;
}

export interface Etats { "a-voir": number; "en-cours": number; acquis: number; solide: number; total: number }
export function BarreEtats({ e }: { e: Etats }) {
  const t = e.total || 1;
  const w = (x: number) => `${(100 * x) / t}%`;
  return (
    <div className="barre" role="img" aria-label={`${e.solide} solides, ${e.acquis} acquises, ${e["en-cours"]} en cours, ${e["a-voir"]} à voir sur ${e.total} notions`}>
      <i className="b-solide" style={{ width: w(e.solide) }} /><i className="b-acquis" style={{ width: w(e.acquis) }} /><i className="b-cours" style={{ width: w(e["en-cours"]) }} />
    </div>
  );
}

export function LigneLien({ href, num, children, fin }: { href: string; num: string; children: React.ReactNode; fin?: React.ReactNode }) {
  return (
    <li>
      <Link className="ligne" href={href}>
        <span className="num">{num}</span>
        <span>{children}</span>
        <span className="fin">{fin}<Icone nom="chevron" /></span>
      </Link>
    </li>
  );
}

/** Les étapes d'une séance : celles d'avant sont faites, l'étape en cours est marquée. */
export function Etapes({ noms, actif }: { noms: string[]; actif: number }) {
  return (
    <ol className="etapes" aria-label="Étapes de la séance">
      {noms.map((n, i) => <li key={n} className={i < actif ? "fait" : ""} aria-current={i === actif ? "step" : undefined}>{i + 1}. {n}</li>)}
    </ol>
  );
}

/** Une case d'état devant une étape : faite ou à faire. */
export function Coche({ faite }: { faite: boolean }) {
  return <span className={`coche ${faite ? "coche-faite" : ""}`} role="img" aria-label={faite ? "Fait" : "À faire"}>{faite && <Icone nom="ok" />}</span>;
}
