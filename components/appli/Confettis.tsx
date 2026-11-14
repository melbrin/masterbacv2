import type { CSSProperties } from "react";

/**
 * Des confettis qui tombent une fois, dessinés en CSS. Aucun hasard au rendu : la place, le retard et la couleur
 * de chaque confetti se calculent à partir de son rang. Ils ne s'affichent pas si l'élève a demandé moins d'animations.
 */
export default function Confettis({ nombre = 44 }: { nombre?: number }) {
  return (
    <div className="confettis" aria-hidden="true">
      {Array.from({ length: nombre }, (_, i) => (
        <i key={i} className={`c${i % 5}`} style={{
          left: `${(i * 37 + 11) % 100}%`,
          animationDelay: `${((i * 53) % 90) / 100}s`,
          animationDuration: `${2 + ((i * 29) % 14) / 10}s`,
          "--r": `${(i * 47) % 360}deg`,
          "--dx": `${((i * 31) % 80) - 40}px`,
        } as CSSProperties} />
      ))}
    </div>
  );
}
