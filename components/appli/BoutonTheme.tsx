"use client";

import { useSyncExternalStore } from "react";
import { COOKIE_THEME, DUREE_COOKIE_THEME, type ChoixTheme } from "@/lib/commun/theme";
import { choisirTheme } from "@/lib/serveur/commandes/profil";
import Icone from "./Icone";

const EVENEMENT = "mb-theme";
const SOMBRE_DU_TELEPHONE = "(prefers-color-scheme: dark)";

/** Prévient quand le thème change : par ce bouton, ou par le réglage du téléphone en mode automatique. */
function abonne(rappel: () => void) {
  const media = window.matchMedia(SOMBRE_DU_TELEPHONE);
  media.addEventListener("change", rappel);
  window.addEventListener(EVENEMENT, rappel);
  return () => { media.removeEventListener("change", rappel); window.removeEventListener(EVENEMENT, rappel); };
}

/** Le thème affiché en ce moment : celui choisi, sinon celui du téléphone. */
function themeAffiche(): "light" | "dark" {
  const choisi = document.documentElement.dataset.theme;
  if (choisi === "light" || choisi === "dark") return choisi;
  return window.matchMedia(SOMBRE_DU_TELEPHONE).matches ? "dark" : "light";
}

/**
 * Le bouton qui passe du mode clair au mode sombre, et inversement. Le changement est immédiat : il ne recharge pas
 * la page. Le choix est gardé dans un cookie (ce navigateur) et, avec un compte, dans le profil (les autres appareils).
 * `libelle` affiche le nom du mode à côté de l'icône, pour le menu de gauche.
 */
export default function BoutonTheme({ initial, libelle = false, className = "btn-texte" }: { initial: ChoixTheme; libelle?: boolean; className?: string }) {
  // avant le premier affichage dans le navigateur, le serveur ne connaît que le choix, pas le réglage du téléphone
  const affiche = useSyncExternalStore(abonne, themeAffiche, () => (initial === "sombre" ? "dark" : "light"));
  const vers: ChoixTheme = affiche === "dark" ? "clair" : "sombre";
  const nom = vers === "clair" ? "Mode clair" : "Mode sombre";
  const change = () => {
    document.documentElement.dataset.theme = vers === "clair" ? "light" : "dark";
    document.cookie = `${COOKIE_THEME}=${vers}; path=/; max-age=${DUREE_COOKIE_THEME}; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
    window.dispatchEvent(new Event(EVENEMENT));
    // garder le choix dans le profil n'est qu'un confort : un échec ne change rien à l'écran
    void choisirTheme({ theme: vers }).catch(() => undefined);
  };
  return (
    <button type="button" className={className} onClick={change} aria-label={libelle ? undefined : `Passer en ${nom.toLowerCase()}`} title={`Passer en ${nom.toLowerCase()}`}>
      <Icone nom={vers === "clair" ? "soleil" : "lune"} taille={libelle ? undefined : 22} />
      {libelle && <span>{nom}</span>}
    </button>
  );
}
