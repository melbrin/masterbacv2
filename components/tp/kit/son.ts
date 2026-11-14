// Le kit des paillasses : les petits sons et les vibrations des gestes. Les sons sont fabriqués par le navigateur
// (aucun fichier à charger) et ne partent qu'après un geste de l'élève. Ils se coupent d'un bouton ; le choix est gardé
// sur l'appareil.

export type Son = "clic" | "pose" | "goutte" | "bip" | "juste" | "faux";

const CLE = "mb-sons";
let contexte: AudioContext | null = null;
let coupe: boolean | null = null;

function lisCoupe(): boolean {
  if (coupe === null) {
    try { coupe = window.localStorage.getItem(CLE) === "non"; } catch { coupe = false; }
  }
  return coupe;
}

/** Vrai si les sons sont en marche. */
export const sonsEnMarche = (): boolean => typeof window !== "undefined" && !lisCoupe();

/** Met les sons en marche ou les coupe, et garde le choix sur l'appareil. */
export function regleSons(enMarche: boolean): void {
  coupe = !enMarche;
  try { window.localStorage.setItem(CLE, enMarche ? "oui" : "non"); } catch { /* le choix ne sera pas gardé : sans gravité */ }
}

// Chaque son : une note qui glisse d'une fréquence à une autre, pendant une durée, à un volume. Deux notes pour un accord.
const NOTES: Record<Son, { forme: OscillatorType; de: number; a: number; duree: number; volume: number; puis?: number }> = {
  clic: { forme: "square", de: 900, a: 500, duree: 0.03, volume: 0.03 },
  pose: { forme: "sine", de: 240, a: 150, duree: 0.07, volume: 0.09 },
  goutte: { forme: "sine", de: 1150, a: 520, duree: 0.07, volume: 0.06 },
  bip: { forme: "sine", de: 880, a: 880, duree: 0.09, volume: 0.05 },
  juste: { forme: "sine", de: 620, a: 620, duree: 0.1, volume: 0.07, puis: 930 },
  faux: { forme: "triangle", de: 260, a: 170, duree: 0.2, volume: 0.07 },
};

/** Joue un son court, si les sons sont en marche. Sans effet si le navigateur ne sait pas en fabriquer. */
export function son(nom: Son): void {
  if (typeof window === "undefined" || lisCoupe()) return;
  try {
    contexte ??= new AudioContext();
    const c = contexte;
    if (c.state === "suspended") void c.resume();
    const n = NOTES[nom];
    const joue = (de: number, a: number, quand: number) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = n.forme;
      o.frequency.setValueAtTime(de, quand);
      o.frequency.exponentialRampToValueAtTime(Math.max(40, a), quand + n.duree);
      g.gain.setValueAtTime(n.volume, quand);
      g.gain.exponentialRampToValueAtTime(0.0001, quand + n.duree);
      o.connect(g).connect(c.destination);
      o.start(quand);
      o.stop(quand + n.duree + 0.02);
    };
    joue(n.de, n.a, c.currentTime);
    if (n.puis) joue(n.puis, n.puis, c.currentTime + n.duree);
  } catch { /* pas de son sur cet appareil : la paillasse marche sans */ }
}

/** Une courte vibration sur les téléphones qui le permettent, si les sons sont en marche. */
export function vibre(ms: number): void {
  if (typeof navigator === "undefined" || lisCoupe()) return;
  try { navigator.vibrate?.(ms); } catch { /* sans gravité */ }
}
