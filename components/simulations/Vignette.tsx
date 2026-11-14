import type { Valeurs } from "@/lib/commun/simulations";
import { SCENES } from "./scenes";

/**
 * L'image d'une simulation en plein mouvement, sur les pages du labo. Elle est décorative : la valeur que l'élève
 * doit calculer y est remplacée par une valeur d'attente, et la scène écrit « ? » à sa place.
 */
export default function Vignette({ simulation, p, t, inconnues, className = "" }: { simulation: string; p: Valeurs; t: number; inconnues: string[]; className?: string }) {
  const Scene = SCENES[simulation];
  if (!Scene) return null;
  return (
    <div className={`labo-vignette ${className}`.trim()} aria-hidden="true">
      <Scene p={p} t={t} phase="marche" issue={null} inconnues={inconnues} />
    </div>
  );
}
