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

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // En développement, Next.js écrit dans le terminal chaque appel d'action avec ses arguments :
  // l'adresse e-mail et le code de connexion s'y retrouvaient. Les journaux ne portent ni adresse ni code (docs/03-securite.md).
  logging: { serverFunctions: false },
  async headers() {
    return [{ source: "/:path*", headers: enTetes }];
  },
};

export default nextConfig;
