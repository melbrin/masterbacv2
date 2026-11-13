// Applique le thème choisi avant le premier affichage, pour éviter un éclair de thème clair.
// Le script est une constante : il ne contient aucune donnée d'utilisateur.
const SCRIPT =
  '(function(){try{var t=localStorage.getItem("theme");var c=document.documentElement.classList;if(t==="dark"){c.add("dark-mode");c.remove("light")}else{c.add("light")}}catch(e){document.documentElement.classList.add("light")}})();';

export default function ScriptTheme() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
