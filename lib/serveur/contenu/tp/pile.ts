import "server-only";
import type { Tp } from "./types";

// En construction : ce TP ne se montre nulle part tant que `pret` est faux.
const pile: Tp = {
  id: "pile", titre: "Construire une pile", matiere: "chimie", famille: "Pile", fiche: 1, minutes: 20, etat: "brouillon", pret: false,
  accroche: "",
  etapes: () => [],
};

export default pile;
