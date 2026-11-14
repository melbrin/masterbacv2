import "server-only";
import type { Tp } from "./types";

// En construction : ce TP ne se montre nulle part tant que `pret` est faux.
const cinetique: Tp = {
  id: "cinetique", titre: "Suivre une transformation dans le temps", matiere: "chimie", famille: "Cinétique", fiche: 1, minutes: 20, etat: "brouillon", pret: false,
  accroche: "",
  etapes: () => [],
};

export default cinetique;
