"use server";

import { regles as optique } from "@/lib/commun/tp/paillasses/optique";
import { regles as diffraction } from "@/lib/commun/tp/paillasses/diffraction";
import tpFocale from "@/lib/serveur/contenu/tp/focale";
import tpLunette from "@/lib/serveur/contenu/tp/lunette";
import tpCheveu from "@/lib/serveur/contenu/tp/cheveu";
import tpYoung from "@/lib/serveur/contenu/tp/young";
import { actionDeChantier } from "@/lib/serveur/tp-chantier";

// Le banc de chantier « optique », en local seulement : il juge une manipulation avec les règles en construction.
export const essayerOptique = actionDeChantier("optique", { focale: tpFocale, lunette: tpLunette, cheveu: tpCheveu, young: tpYoung }, { optique, diffraction });
