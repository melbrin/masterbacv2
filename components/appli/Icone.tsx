// Icônes au trait, 24 × 24, reprises du prototype. Dessinées par l'application : aucune ressource tierce.
const TRACES: Record<string, string> = {
  aujourdhui: "c:12,12,4|M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  cours: "M4 19.5V5a2 2 0 0 1 2-2h14v15H6.5A2.5 2.5 0 0 0 4 20.5 2.5 2.5 0 0 0 6.5 23H20|M8 7h8M8 11h6",
  ds: "r:3,4,18,17,2|M16 2v4M8 2v4M3 10h18|m9 15 2 2 4-4",
  progres: "M3 3v18h18|m7 15 4-4 3 3 5-6",
  profil: "c:12,8,4|M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6",
  plan: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z|M9 4v14M15 6v14",
  carnet: "M5 3h11l3 3v15H5z|M9 8h6M9 12h6M9 16h4",
  offres: "M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z|c:7.5,7.5,1.5",
  chevron: "m9 6 6 6-6 6",
  retour: "m15 6-6 6 6 6",
  ok: "m5 12 5 5 9-10",
  croix: "M6 6l12 12M18 6 6 18",
  horloge: "c:12,12,9|M12 7v5l3 2",
  ampoule: "M9 18h6M10 21h4|M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z",
  drapeau: "M5 21V4M5 4h11l-2 4 2 4H5",
  cadenas: "r:5,11,14,10,2|M8 11V8a4 4 0 0 1 8 0v3",
  lecture: "M7 4v16l13-8z",
  eclair: "M13 2 4 14h7l-1 8 9-12h-7z",
  plus: "M12 5v14M5 12h14",
  oeil: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z|c:12,12,3",
  papier: "M6 2h9l5 5v15H6z|M14 2v6h6M9 13h7M9 17h5",
  medaille: "c:12,14,6|M8.5 3h7L14 9h-4z",
  cle: "c:8,15,4|M11 12l9-9M16 7l3 3",
  flamme: "M12 3c.6 3.2 4.5 5 4.5 9.5a4.5 4.5 0 0 1-9 0c0-1.7.7-2.9 1.7-3.9.3 1.2.9 1.9 1.6 2.2C10.4 8.6 11 5.6 12 3z",
  cible: "c:12,12,9|c:12,12,5|c:12,12,1",
  jeux: "r:2,7,20,11,5|M7 11v4M5 13h4|c:15.5,11.5,1|c:18,14.5,1",
  paires: "r:3,4,8,11,2|r:13,9,8,11,2",
  cartes: "r:6,3,13,16,2|M3 8v11a2 2 0 0 0 2 2h9",
  pluie: "M7 3v5M12 3v9M17 3v5|M5 14l2 2M12 16v2M17 13l2 2|M4 21h16",
  relie: "c:5,6,2|c:5,18,2|c:19,6,2|c:19,18,2|M7 6c5 0 5 12 10 12M7 18c5 0 5-12 10-12",
  indices: "c:12,12,9|M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8|M12 17h.01",
  chapitre: "M3 7h6l2 2h10v10H3z|M3 7V5h6l2 2",
  notion: "M12 3l2.6 5.6 6 .7-4.5 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6L3.4 9.3l6-.7z",
  vraifaux: "m3 12 3 3 5-6|M14 8l6 6M20 8l-6 6",
  ordre: "M4 6h10M4 12h7M4 18h4|M18 5v14M15 16l3 3 3-3",
  ballon: "c:12,12,9|M3 12h18M12 3v18|M5.6 5.6c3 3 3 9.8 0 12.8M18.4 5.6c-3 3-3 9.8 0 12.8",
};

export default function Icone({ nom, taille }: { nom: string; taille?: number }) {
  const morceaux = (TRACES[nom] ?? "").split("|").filter(Boolean);
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
      style={taille ? { width: taille, height: taille, verticalAlign: "-3px" } : undefined}>
      {morceaux.map((m, i) => {
        if (m.startsWith("c:")) { const [cx, cy, r] = m.slice(2).split(","); return <circle key={i} cx={cx} cy={cy} r={r} />; }
        if (m.startsWith("r:")) { const [x, y, w, h, rx] = m.slice(2).split(","); return <rect key={i} x={x} y={y} width={w} height={h} rx={rx} />; }
        return <path key={i} d={m} />;
      })}
    </svg>
  );
}
