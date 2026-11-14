// Les couleurs des solutions sur la paillasse : celle que donne un indicateur coloré à un pH donné.

/** L'eau, ou une solution incolore. */
export const INCOLORE = "rgba(190, 215, 240, 0.22)";
const melange = (a: number[], b: number[], k: number) => `rgba(${a.map((x, i) => Math.round(x + (b[i] - x) * k)).join(", ")}, 0.88)`;
const JAUNE = [236, 200, 60], VERT = [96, 182, 96], BLEU = [62, 122, 226], ROSE = [242, 110, 172];

/** La couleur de la solution : jaune, vert puis bleu pour le bleu de bromothymol ; incolore puis rose pour la phénolphtaléine. */
export function couleurIndicateur(indicateur: "bbt" | "phenolphtaleine", pH: number): string {
  if (indicateur === "bbt") {
    if (pH <= 6) return melange(JAUNE, JAUNE, 0);
    if (pH >= 7.6) return melange(BLEU, BLEU, 0);
    return pH < 6.8 ? melange(JAUNE, VERT, (pH - 6) / 0.8) : melange(VERT, BLEU, (pH - 6.8) / 0.8);
  }
  if (pH <= 8.2) return INCOLORE;
  const k = Math.min(1, (pH - 8.2) / 1.8);
  return `rgba(${ROSE.join(", ")}, ${Math.round((0.25 + 0.65 * k) * 100) / 100})`;
}
/** Les deux couleurs à reconnaître, avec leurs noms. */
export const TEINTES_INDICATEUR = {
  bbt: { nom: "bleu de bromothymol", avant: "jaune", apres: "bleu", couleurs: [melange(JAUNE, JAUNE, 0), melange(BLEU, BLEU, 0)] },
  phenolphtaleine: { nom: "phénolphtaléine", avant: "incolore", apres: "rose", couleurs: [INCOLORE, `rgba(${ROSE.join(", ")}, 0.9)`] },
} as const;
