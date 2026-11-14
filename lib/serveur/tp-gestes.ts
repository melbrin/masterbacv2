import "server-only";
import { z } from "zod";

// Un geste de manipulation : un nom, et au plus sept valeurs simples et bornées. Chaque paillasse y lit ce qu'elle connaît
// et ignore le reste (lib/commun/tp/types.ts).
export const geste = z.record(z.string().regex(/^[a-z][a-zA-Z0-9]{0,11}$/), z.union([z.number().min(-1e6).max(1e6), z.string().regex(/^[a-zA-Z0-9+_.:-]{0,24}$/), z.boolean()]))
  .refine((g) => typeof g.g === "string" && /^[a-z]{2,20}$/.test(g.g) && Object.keys(g).length <= 8);

/** La liste des gestes d'une manipulation. */
export const gestes = z.array(geste).max(4000);
