import type { NextConfig } from "next";

// En-têtes de sécurité posés sur toutes les réponses (docs/03-securite.md, section 4.7).
// La politique de sécurité du contenu avec jeton par requête s'ajoute dans proxy.ts à la mise en ligne.
const enTetes = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-Frame-Options", value: "DENY" },
];

const CSP_ATELIER = "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // En développement, Next.js écrit dans le terminal chaque appel d'action avec ses arguments :
  // l'adresse e-mail et le code de connexion s'y retrouvaient. Les journaux ne portent ni adresse ni code (docs/03-securite.md).
  logging: { serverFunctions: false },
  async headers() {
    return [
      { source: "/:path*", headers: enTetes },
      // Python pour le hub (décision 0016) : une douzaine de Mo, rangés par version, qui ne changent donc jamais à
      // une même adresse ; le navigateur les garde un an et ne les retélécharge pas d'une page à l'autre
      { source: "/pyodide/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      // Le worker du hub Python suit la politique de sécurité de son propre fichier, pas celle de la page : il ne
      // charge que des scripts de l'application, sans eval, ne contacte que l'application et ne crée aucun worker.
      // Avec la cage de public/python/atelier.mjs, un programme d'élève n'atteint ni la session ni un autre site.
      { source: "/python/:path*", headers: [{ key: "Content-Security-Policy", value: CSP_ATELIER }] },
    ];
  },
};

export default nextConfig;
