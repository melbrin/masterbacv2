"use client";

import { useEffect, useRef, useState } from "react";

export type PhaseHorloge = "pret" | "marche" | "fini";

/**
 * L'horloge d'un mouvement : l'instant t part de 0 et avance jusqu'à la durée donnée.
 * La phase vaut « pret » avant le départ, « marche » pendant le mouvement, « fini » à l'arrivée.
 * La cadence est le nombre de secondes du mouvement qui passent en une seconde à l'écran : 1 en temps réel, 0,1 au ralenti dix fois.
 * Si l'élève a demandé moins d'animations, il n'y a pas d'animation : t vaut tout de suite la durée, et tout s'affiche d'un coup.
 */
export function useHorloge() {
  const [etat, setEtat] = useState<{ phase: PhaseHorloge; t: number }>({ phase: "pret", t: 0 });
  const image = useRef<number | null>(null);

  const annule = () => {
    if (image.current !== null) cancelAnimationFrame(image.current);
    image.current = null;
  };
  // quand le composant quitte l'écran, l'image demandée est annulée
  useEffect(() => () => {
    if (image.current !== null) cancelAnimationFrame(image.current);
  }, []);

  /** Lance le mouvement, ou le relance. `fin` est appelé une fois, quand t atteint la durée. */
  const lance = (duree: number, fin?: () => void, cadence = 1) => {
    annule();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setEtat({ phase: "fini", t: duree });
      fin?.();
      return;
    }
    // l'heure se lit dans le rappel de requestAnimationFrame : la première image fixe l'instant zéro
    let debut: number | null = null;
    const avance = (maintenant: number) => {
      if (debut === null) debut = maintenant;
      const t = ((maintenant - debut) / 1000) * cadence;
      if (t < duree) {
        setEtat({ phase: "marche", t });
        image.current = requestAnimationFrame(avance);
      } else {
        image.current = null;
        setEtat({ phase: "fini", t: duree });
        fin?.();
      }
    };
    setEtat({ phase: "marche", t: 0 });
    image.current = requestAnimationFrame(avance);
  };

  /** Arrête le mouvement et revient au départ. */
  const remet = () => {
    annule();
    setEtat({ phase: "pret", t: 0 });
  };

  return { phase: etat.phase, t: etat.t, lance, remet };
}
