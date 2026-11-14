import "server-only";
import type { Tp } from "./types";

// En construction : ce TP ne se montre nulle part tant que `pret` est faux.
const doppler: Tp = {
  id: "doppler", titre: "Mesurer une vitesse par effet Doppler", matiere: "physique", famille: "Effet Doppler", fiche: 1, minutes: 20, etat: "brouillon", pret: false,
  accroche: "",
  etapes: () => [],
};

export default doppler;
