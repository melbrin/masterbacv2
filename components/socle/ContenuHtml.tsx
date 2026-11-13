// Le seul composant qui affiche du HTML. Il ne reçoit que du HTML produit par
// l'application elle-même : contenu des fiches nettoyé à l'import, ou formule rendue par KaTeX.
// Jamais un texte saisi par un utilisateur.
type Props = { html: string; bloc?: boolean; className?: string };

export default function ContenuHtml({ html, bloc = false, className }: Props) {
  const Balise = bloc ? "div" : "span";
  return <Balise className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
