"use client";

import { numeroDeSuivi } from "@/lib/commun/pannes";

// Le dernier filet : une panne dans la mise en page elle-même. Cette page remplace tout le document et ne reçoit ni
// les feuilles de style ni les polices de l'application : elle porte donc ses propres styles, et suit le thème du
// téléphone par les couleurs du système.
export default function PanneGenerale({ error, retry }: { error: unknown; retry: () => void }) {
  const numero = numeroDeSuivi(error);
  return (
    <html lang="fr">
      <body style={{ margin: 0, colorScheme: "light dark", background: "Canvas", color: "CanvasText", fontFamily: "system-ui, -apple-system, sans-serif", lineHeight: 1.5 }}>
        <title>Une panne · MasterBac</title>
        <main style={{ maxWidth: 480, margin: "0 auto", padding: "56px 20px" }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" }}>MasterBac</p>
          <h1 style={{ margin: "10px 0 12px", fontSize: 26, lineHeight: 1.15 }}>Cette page n&apos;a pas pu s&apos;afficher</h1>
          <p style={{ margin: "0 0 20px" }}>Le serveur n&apos;a pas répondu comme il faut. Ce n&apos;est pas de ta faute, et ce que tu avais déjà validé reste enregistré.</p>
          <button type="button" onClick={() => retry()}
            style={{ minHeight: 48, padding: "0 22px", border: 0, borderRadius: 12, background: "#8F5F3F", color: "#FFFFFF", font: "inherit", fontWeight: 700, cursor: "pointer" }}>
            Réessayer
          </button>
          {numero && <p style={{ margin: "20px 0 0", fontSize: 14, opacity: 0.75 }}>Numéro de suivi : {numero}. Si la panne continue, garde-le : il sert à la retrouver.</p>}
        </main>
      </body>
    </html>
  );
}
