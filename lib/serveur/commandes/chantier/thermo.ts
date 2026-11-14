"use server";

import { regles as archimede } from "@/lib/commun/tp/paillasses/archimede";
import { regles as calorimetre } from "@/lib/commun/tp/paillasses/calorimetre";
import { regles as pile } from "@/lib/commun/tp/paillasses/pile";
import { regles as electrolyse } from "@/lib/commun/tp/paillasses/electrolyse";
import tpArchimede from "@/lib/serveur/contenu/tp/archimede";
import tpCalorimetrie from "@/lib/serveur/contenu/tp/calorimetrie";
import tpPile from "@/lib/serveur/contenu/tp/pile";
import tpElectrolyse from "@/lib/serveur/contenu/tp/electrolyse";
import { actionDeChantier } from "@/lib/serveur/tp-chantier";

// Le banc de chantier « thermo », en local seulement : il juge une manipulation avec les règles en construction.
export const essayerThermo = actionDeChantier("thermo", { archimede: tpArchimede, calorimetrie: tpCalorimetrie, pile: tpPile, electrolyse: tpElectrolyse }, { archimede, calorimetre, pile, electrolyse });
