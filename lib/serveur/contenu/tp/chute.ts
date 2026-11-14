import "server-only";
import type { Tp } from "./types";

// En construction : ce TP ne se montre nulle part tant que `pret` est faux.
const chute: Tp = {
  id: "chute", titre: "Étudier une chute filmée", matiere: "physique", famille: "Mécanique", fiche: 1, minutes: 20, etat: "brouillon", pret: false,
  accroche: "",
  etapes: () => [],
};

export default chute;
