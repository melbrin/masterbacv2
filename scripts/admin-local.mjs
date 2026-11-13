// npm run admin:local -- adresse@exemple.fr : donne le rôle administrateur à un compte de la base LOCALE.
// En recette et en production, ce rôle se donne par une commande SQL que Yane lance lui-même (docs/06, section 7).
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SECRET_KEY, APP_ENV } = process.env;
const adresse = (process.argv[2] ?? "").toLowerCase();
if (APP_ENV !== "local") { console.error("Cette commande ne vise que la base locale."); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !adresse) { console.error("Usage : npm run admin:local -- adresse@exemple.fr (après npm run env:local)"); process.exit(1); }
const base = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const { data, error } = await base.rpc("compte_par_adresse", { p_adresse: adresse });
if (error || !data) { console.error("Aucun compte avec cette adresse : connecte-toi une première fois dans l'application."); process.exit(1); }
const { error: e } = await base.auth.admin.updateUserById(data.user_id, { app_metadata: { role: "admin" } });
if (e) { console.error("Refus de la base."); process.exit(1); }
console.log("Ce compte est administrateur. Reconnecte-toi, puis ouvre /admin pour enregistrer la double authentification.");
