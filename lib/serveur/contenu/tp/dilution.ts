import "server-only";
import type { Tp } from "./types";

// En construction : ce TP ne se montre nulle part tant que `pret` est faux.
const dilution: Tp = {
  id: "dilution", titre: "Préparer une solution par dilution", matiere: "chimie", famille: "Dilution", fiche: 1, minutes: 20, etat: "brouillon", pret: false,
  accroche: "",
  etapes: () => [],
};

export default dilution;
