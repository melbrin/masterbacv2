import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

// Les frontières d'import de docs/02-architecture.md, section 3.
const horsCode = {
  group: ["**/contenu/**", "**/reference/**", "**/docs/**", "@/contenu/**", "@/reference/**", "@/docs/**"],
  message: "Aucun fichier de code n'importe depuis contenu/, reference/ ou docs/.",
};
const serveurEtMoteur = {
  group: ["@/lib/serveur/**", "@/lib/moteur/**", "**/lib/serveur/**", "**/lib/moteur/**"],
  message: "Un composant d'interface n'importe ni lib/serveur/ ni lib/moteur/.",
};
const clientSupabase = {
  group: ["@/lib/serveur/supabase/**"],
  message: "app/ passe par lib/serveur/requetes et les actions, jamais par le client de base.",
};
const htmlBrut = {
  selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
  message: "dangerouslySetInnerHTML est réservé au composant unique qui affiche le contenu déjà nettoyé.",
};

export default defineConfig([
  ...nextVitals,
  globalIgnores([
    ".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts",
    "kit-claude-code/**", "contenu/**", "reference/**", "docs/**", "supabase/**",
  ]),
  {
    files: ["**/*.{ts,tsx,mts,mjs}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [horsCode] }],
      "no-restricted-syntax": ["error", htmlBrut],
    },
  },
  {
    files: ["components/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { patterns: [horsCode, serveurEtMoteur] }] },
  },
  {
    files: ["app/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { patterns: [horsCode, clientSupabase] }] },
  },
  {
    // le moteur est pur : ni horloge, ni hasard, ni réseau, ni base
    files: ["lib/moteur/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [horsCode, { group: ["@/lib/serveur/**", "@/components/**", "@/app/**", "next/**", "react", "@supabase/**"], message: "lib/moteur/ n'importe que lib/commun/." }] }],
      "no-restricted-properties": ["error",
        { object: "Date", property: "now", message: "Le moteur ne lit pas l'horloge." },
        { object: "Math", property: "random", message: "Le moteur ne tire pas au hasard." },
      ],
      "no-restricted-syntax": ["error", htmlBrut,
        { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: "Le moteur ne lit pas l'horloge." },
      ],
    },
  },
  {
    // les deux seuls fichiers autorisés à écrire du HTML brut : le contenu nettoyé, et le script constant du thème
    files: ["components/socle/ContenuHtml.tsx", "components/socle/ScriptTheme.tsx"],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    // Dette du test en ligne d'avant le kit (docs/audit-de-l-existant.md, F18 et F19) : ces fichiers seront
    // réécrits quand le test adoptera la charte commune (lots 1.5 et 1.7). D'ici là, ces deux règles de React
    // y restent des avertissements. Tout nouveau fichier les respecte comme des erreurs.
    files: [
      "app/quiz/page.tsx", "app/results/page.tsx", "app/elite/page.tsx", "components/ThemeToggle.tsx",
      "components/questions/Association.tsx", "components/questions/Ordonnancement.tsx", "components/questions/TexteATrou.tsx",
    ],
    rules: { "react-hooks/set-state-in-effect": "warn", "react-hooks/immutability": "warn" },
  },
]);
