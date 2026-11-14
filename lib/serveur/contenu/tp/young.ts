import "server-only";
import type { Tp } from "./types";

// En construction : ce TP ne se montre nulle part tant que `pret` est faux.
const young: Tp = {
  id: "young", titre: "Mesurer une longueur d'onde par interférences", matiere: "physique", famille: "Interférences", fiche: 1, minutes: 20, etat: "brouillon", pret: false,
  accroche: "",
  etapes: () => [],
};

export default young;
