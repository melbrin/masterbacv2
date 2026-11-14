// Le plateau de chaque jeu de mémoire, par identifiant. Ce fichier n'est pas un composant du navigateur :
// la page du serveur y lit le plateau à monter.
import type { ComponentType } from "react";
import type { PropsMemoire } from "@/lib/commun/memoire";
import Associes from "./Associes";
import Calcul from "./Calcul";
import Cases from "./Cases";
import Change from "./Change";
import Chemin from "./Chemin";
import Chiffres from "./Chiffres";
import Couleurs from "./Couleurs";
import Duos from "./Duos";
import Envers from "./Envers";
import File from "./File";
import Flash from "./Flash";
import Histoire from "./Histoire";
import Intrus from "./Intrus";
import Manquant from "./Manquant";
import Mots from "./Mots";
import Palais from "./Palais";
import Paquets from "./Paquets";
import Places from "./Places";
import Prenoms from "./Prenoms";
import Retour from "./Retour";
import Symboles from "./Symboles";
import Tri from "./Tri";

export const PLATEAUX: Record<string, ComponentType<PropsMemoire>> = {
  chiffres: Chiffres,
  envers: Envers,
  couleurs: Couleurs,
  calcul: Calcul,
  tri: Tri,
  retour: Retour,
  cases: Cases,
  chemin: Chemin,
  places: Places,
  symboles: Symboles,
  manquant: Manquant,
  change: Change,
  flash: Flash,
  intrus: Intrus,
  duos: Duos,
  mots: Mots,
  associes: Associes,
  histoire: Histoire,
  file: File,
  prenoms: Prenoms,
  paquets: Paquets,
  palais: Palais,
};
