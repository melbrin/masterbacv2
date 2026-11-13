// npm run env:local : prépare .env.local à partir de la base locale, sans afficher aucune valeur.
// Les clés de la base locale ne protègent rien de réel, mais la règle est la même partout : une clé ne s'affiche pas.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const brut = execFileSync("npx", ["supabase", "status", "-o", "env"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const etat = Object.fromEntries(
  brut.split("\n").map((l) => l.match(/^([A-Z0-9_]+)="?(.*?)"?$/)).filter(Boolean).map((m) => [m[1], m[2]]),
);
const valeurs = {
  APP_ENV: "local",
  APP_URL: "http://localhost:3457",
  SUPABASE_URL: etat.API_URL,
  SUPABASE_PUBLISHABLE_KEY: etat.PUBLISHABLE_KEY || etat.ANON_KEY,
  SUPABASE_SECRET_KEY: etat.SECRET_KEY || etat.SERVICE_ROLE_KEY,
  BOITE_LOCALE_URL: etat.MAILPIT_URL || etat.INBUCKET_URL,
};
const manquantes = Object.entries(valeurs).filter(([, v]) => !v).map(([k]) => k);
if (manquantes.length) {
  console.error(`La base locale ne répond pas (npm run db:demarrer). Valeurs introuvables : ${manquantes.join(", ")}`);
  process.exit(1);
}
const fichier = ".env.local";
const avant = existsSync(fichier) ? readFileSync(fichier, "utf8").split("\n") : [];
// on garde les lignes ajoutées à la main, on remplace celles que ce script gère
const gardees = avant.filter((l) => l.trim() && !Object.keys(valeurs).some((k) => l.startsWith(`${k}=`)));
writeFileSync(fichier, [...Object.entries(valeurs).map(([k, v]) => `${k}=${v}`), ...gardees, ""].join("\n"), { mode: 0o600 });
console.log(`.env.local prêt : ${Object.keys(valeurs).join(", ")}.`);
