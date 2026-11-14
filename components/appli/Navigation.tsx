"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { JEUX_MEMOIRE } from "@/lib/commun/memoire";
import Icone from "./Icone";

const NAV = [
  { href: "/app", nom: "Aujourd'hui", icone: "aujourdhui", bas: true },
  { href: "/app/cours", nom: "Cours", icone: "cours", bas: true },
  { href: "/app/ds", nom: "DS", long: "Mode DS", icone: "ds", bas: true },
  { href: "/app/jeux", nom: "Jeux", icone: "jeux", bas: true },
  { href: "/app/tp", nom: "TP", icone: "fiole", bas: false },
  { href: "/app/memoire", nom: "Mémoire", icone: "ampoule", bas: false },
  { href: "/app/progres", nom: "Progrès", icone: "progres", bas: true },
  { href: "/app/parcours", nom: "Parcours", long: "Mon parcours", icone: "plan", bas: false },
  { href: "/app/carnet", nom: "Carnet", long: "Carnet d'erreurs", icone: "carnet", bas: false },
  { href: "/app/offres", nom: "Offres", icone: "offres", bas: false },
  { href: "/app/profil", nom: "Profil", icone: "profil", bas: false },
];

export default function Navigation({ admin, tp }: { admin: boolean; tp: boolean }) {
  const chemin = usePathname();
  // en bas du téléphone, la mémoire n'a pas son onglet : on y entre par les jeux, dont l'onglet reste allumé
  const actif = (href: string, enBas = false) => (href === "/app" ? chemin === "/app" || chemin.startsWith("/app/seance") : chemin.startsWith(href) || (enBas && href === "/app/jeux" && (chemin.startsWith("/app/memoire") || chemin.startsWith("/app/tp"))) || (href === "/app/cours" && chemin.startsWith("/app/fiche")) || (href === "/app/parcours" && chemin.startsWith("/app/calibrage")));
  const lien = (n: (typeof NAV)[number], long: boolean) => (
    <Link key={n.href} href={n.href} aria-current={actif(n.href, !long) ? "page" : undefined}>
      <Icone nom={n.icone} /><span>{long ? n.long ?? n.nom : n.nom}</span>
    </Link>
  );
  return (
    <>
      <aside className="lateral" aria-label="Navigation">
        <Link className="marque" href="/app"><b>MASTERBAC</b><span>Académie de l&apos;Élite · physique-chimie</span></Link>
        <nav>
          {NAV.filter((n) => (n.href !== "/app/memoire" || JEUX_MEMOIRE.length > 0) && (n.href !== "/app/tp" || tp)).map((n) => lien(n, true))}
          {admin && <><div className="sep" /><Link href="/admin"><Icone nom="cle" /><span>Administration</span></Link></>}
        </nav>
      </aside>
      <header className="barre-haut">
        <Link className="marque" href="/app"><b>MASTERBAC</b><span>Académie de l&apos;Élite</span></Link>
        <span className="espace" />
        <Link className="btn-texte" href="/app/parcours" aria-label="Mon parcours" aria-current={actif("/app/parcours") ? "page" : undefined}><Icone nom="plan" taille={22} /></Link>
        <Link className="btn-texte" href="/app/carnet" aria-label="Carnet d'erreurs"><Icone nom="carnet" taille={22} /></Link>
        <Link className="btn-texte" href="/app/profil" aria-label="Profil" aria-current={actif("/app/profil") ? "page" : undefined}><Icone nom="profil" taille={22} /></Link>
      </header>
      <nav className="onglets-bas" aria-label="Navigation principale">{NAV.filter((n) => n.bas).map((n) => lien(n, false))}</nav>
    </>
  );
}
