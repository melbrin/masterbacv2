// Un paragraphe d'énoncé du hub Python : ce qui est écrit entre accents graves s'affiche comme du code.
export default function TexteAvecCode({ texte }: { texte: string }) {
  const morceaux = texte.split("`");
  return <>{morceaux.map((m, i) => (i % 2 === 1 ? <code key={i} translate="no">{m}</code> : m))}</>;
}
