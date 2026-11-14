import "server-only";
import type { Tp } from "./types";

// En construction : ce TP ne se montre nulle part tant que `pret` est faux.
const synthese: Tp = {
  id: "synthese", titre: "Réaliser une synthèse", matiere: "chimie", famille: "Synthèse organique", fiche: 1, minutes: 20, etat: "brouillon", pret: false,
  accroche: "",
  etapes: () => [],
};

export default synthese;
