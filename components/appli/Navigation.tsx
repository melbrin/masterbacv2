"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ENTRAINEMENT, dansEntrainement, sectionDe, sectionsOuvertes } from "@/lib/commun/entrainement";
import type { ChoixTheme } from "@/lib/commun/theme";
import BoutonTheme from "./BoutonTheme";
import Icone from "./Icone";

const NAV = [
  { href: "/app", nom: "Aujourd'hui", icone: "aujourdhui", bas: true },
  { href: "/app/cours", nom: "Cours", icone: "cours", bas: true },
  { href: "/app/ds", nom: "DS", long: "Mode DS", icone: "ds", bas: true },
  { href: ENTRAINEMENT.href, nom: ENTRAINEMENT.nom, icone: "haltere", bas: true },
  { href: "/app/progres", nom: "Progrès", icone: "progres", bas: true },
  { href: "/app/parcours", nom: "Parcours", long: "Mon parcours", icone: "plan", bas: false },
  { href: "/app/carnet", nom: "Carnet", long: "Carnet d'erreurs", icone: "carnet", bas: false },
  { href: "/app/offres", nom: "Offres", icone: "offres", bas: false },
  { href: "/app/profil", nom: "Profil", icone: "profil", bas: false },
];

export default function Navigation({ admin, labo, tp, python, theme }: { admin: boolean; labo: boolean; tp: boolean; python: boolean; theme: ChoixTheme }) {
  const chemin = usePathname();
  const sousSections = sectionsOuvertes({ labo, tp, python });
  const ici = sectionDe(chemin);
  // en bas du téléphone, les sous-sections de « S'entraîner » n'ont pas d'onglet : on y entre par le sien, qui reste allumé.
  // Dans la barre latérale, chacune a son entrée : c'est elle qui porte la marque.
  const actif = (href: string, enBas = false) => (href === "/app" ? chemin === "/app" || chemin.startsWith("/app/seance")
    : href === ENTRAINEMENT.href ? (enBas ? dansEntrainement(chemin) : chemin === href)
    : chemin.startsWith(href) || (href === "/app/cours" && chemin.startsWith("/app/fiche")) || (href === "/app/parcours" && chemin.startsWith("/app/calibrage")));
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
          {NAV.map((n) => (n.href === ENTRAINEMENT.href ? (
            <div key={n.href} className="lateral-groupe" role="group" aria-label={ENTRAINEMENT.nom} data-ouvert={ici ? "" : undefined}>
              {lien(n, true)}
              {sousSections.map((s) => <Link key={s.id} className="lateral-sous" href={s.href} aria-current={ici === s.id ? "page" : undefined}>{s.nom}</Link>)}
            </div>
          ) : lien(n, true)))}
          {admin && <><div className="sep" /><Link href="/admin"><Icone nom="cle" /><span>Administration</span></Link></>}
        </nav>
        <div className="pied"><BoutonTheme initial={theme} libelle className="lateral-theme" /></div>
      </aside>
      <header className="barre-haut">
        <Link className="marque" href="/app"><b>MASTERBAC</b><span>Académie de l&apos;Élite</span></Link>
        <span className="espace" />
        <BoutonTheme initial={theme} />
        <Link className="btn-texte" href="/app/parcours" aria-label="Mon parcours" aria-current={actif("/app/parcours") ? "page" : undefined}><Icone nom="plan" taille={22} /></Link>
        <Link className="btn-texte" href="/app/carnet" aria-label="Carnet d'erreurs"><Icone nom="carnet" taille={22} /></Link>
        <Link className="btn-texte" href="/app/profil" aria-label="Profil" aria-current={actif("/app/profil") ? "page" : undefined}><Icone nom="profil" taille={22} /></Link>
      </header>
      <nav className="onglets-bas" aria-label="Navigation principale">{NAV.filter((n) => n.bas).map((n) => lien(n, false))}</nav>
    </>
  );
}
