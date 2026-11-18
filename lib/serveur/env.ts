import "server-only";
import { z } from "zod";

// Le seul endroit où les variables d'environnement sont lues. Une variable manquante arrête
// le démarrage avec son nom, jamais sa valeur.
const schema = z.object({
  APP_ENV: z.enum(["local", "recette", "production"]),
  APP_URL: z.url(),
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  SUPABASE_SECRET_KEY: z.string().min(20),
  BOITE_LOCALE_URL: z.url().optional(),
  // l'interrupteur du hub Python (décision 0016) : « ferme » le retire de l'application, pages comprises
  HUB_PYTHON: z.enum(["ouvert", "ferme"]).default("ouvert"),
});

export type Env = z.infer<typeof schema>;
let memo: Env | null = null;

export function env(): Env {
  if (memo) return memo;
  const lu = schema.safeParse(process.env);
  if (!lu.success) {
    const noms = [...new Set(lu.error.issues.map((i) => i.path.join(".")))].join(", ");
    throw new Error(`Variables d'environnement manquantes ou invalides : ${noms}. Lance « npm run env:local ».`);
  }
  memo = lu.data;
  return memo;
}
