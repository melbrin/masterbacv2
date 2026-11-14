// Prépare la session d'un compte d'essai pour les autres essais : connecte le compte, garde sa session dans le fichier donné.
// Usage : node scripts/essais/session.mts <fichier de session, hors du dépôt> [adresse du compte local]
import { ouvre } from "./outils.mts";

const [fichier, adresse] = process.argv.slice(2);
if (!fichier) throw new Error("Usage : node scripts/essais/session.mts <fichier de session> [adresse]");
const essai = await ouvre({ sortie: "sorties/essais", session: fichier, adresse });
console.log(JSON.stringify({ page: new URL(essai.page.url()).pathname, erreurs: essai.erreurs }));
await essai.ferme();
