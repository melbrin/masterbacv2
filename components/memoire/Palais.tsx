"use client";

// Le palais de mémoire : un objet rangé dans chaque pièce d'une maison dessinée. La maison se vide ; pour chaque
// pièce demandée, l'élève dit quel objet s'y trouvait. La méthode : placer en pensée chaque chose dans un lieu.

import { prendFocus } from "@/components/jeux/CadreJeu";
import { pluriel } from "@/lib/commun/format";
import type { PropsMemoire } from "@/lib/commun/memoire";
import { NIVEAUX_PALAIS, palais, pieceDuPalais, PIECES } from "@/lib/commun/memoire/methodes";
import { nomPicto, picto } from "@/lib/commun/memoire/pictos";
import { bilanNiveaux } from "@/lib/commun/memoire/regles";
import { BandeauManches, CadreMemoire, Choix, Picto, PictoNomme, Sablier, useExposition, useManches, useQuestions, Verdict, type Manches } from "./Commun";

/** Le temps pour regarder, en millisecondes : deux secondes, et une seconde et demie par objet. */
const regard = (nombre: number) => 2000 + 1500 * nombre;

function Manche({ m, nombre }: { m: Manches; nombre: number }) {
  const { rangement, questions } = palais(m.graine, nombre);
  const etape = useExposition(m.phase === "memorise", regard(nombre), m.rappelle);
  const { rang, choisie, repond } = useQuestions(m, nombre);
  const question = questions[rang];
  const demandee = pieceDuPalais(question.piece);
  /** les pièces dont l'objet a déjà été retrouvé */
  const retrouvees = questions.slice(0, m.phase === "verdict" && m.juste ? nombre : rang).map((q) => q.piece);
  return (
    <>
      <div className="carte mem-scene mem-scene-planche" data-phase={m.phase} tabIndex={-1} ref={m.rang > 0 ? prendFocus : undefined}>
        {etape === "montre" && m.phase === "memorise" && <Sablier ms={regard(nombre)} />}
        <p className={m.phase === "memorise" ? "jeu-etiquette mem-tete" : "mem-question mem-tete"} aria-live="polite">
          {m.phase === "memorise" ? "Imagine chaque objet dans sa pièce" : `Qu'y avait-il ${demandee.dans}\u00a0?`}
        </p>
        <div className="mem-maison" role="group" aria-label="La maison">
          <svg className="mem-toit" viewBox="0 0 100 16" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path d="M72 11V2h6.5v10.8z" /><path d="M1 15.5 50 1.5l49 14z" />
          </svg>
          <ul className="mem-pieces">
            {PIECES.map((piece) => {
              const objet = rangement.find((r) => r.piece === piece.id)?.picto;
              const ici = m.phase !== "memorise" && piece.id === question.piece;
              const montre = objet !== undefined && (m.phase === "memorise" ? etape === "montre" : retrouvees.includes(piece.id) || (m.phase === "verdict" && ici));
              return (
                <li key={piece.id} className={`mem-piece${ici ? " mem-piece-ici" : ""}`} data-repere={`${piece.titre}|${montre && objet ? picto(objet).mot : ""}`}>
                  <span className="mem-piece-nom">{piece.titre}</span>
                  {montre && objet ? <><Picto id={objet} /><span className="jeu-sr">{picto(objet).mot}</span></> : ici ? <span className="mem-piece-point" aria-hidden="true">?</span> : null}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <Verdict m={m}>{!m.juste && <span>{demandee.dans.charAt(0).toLocaleUpperCase("fr-FR") + demandee.dans.slice(1)}&nbsp;: {nomPicto(question.bonne)}.</span>}</Verdict>
      {m.phase !== "memorise" && (
        <Choix nom="Objets proposés" options={question.choix.map((id) => ({ cle: id, contenu: <PictoNomme id={id} /> }))} bonne={question.bonne} choisie={choisie}
          repond={(id) => repond(id, question.bonne)} />
      )}
    </>
  );
}

function Plateau() {
  const m = useManches(NIVEAUX_PALAIS.length, (reussis) => bilanNiveaux(NIVEAUX_PALAIS, reussis,
    (n) => `Tu as retrouvé ${n} objets, pièce par pièce.`, "Aucune maison retrouvée en entier cette fois."));
  const nombre = NIVEAUX_PALAIS[m.niveau];
  return (
    <>
      <BandeauManches m={m} enjeu={pluriel(nombre, "objet", "objets")} />
      <Manche key={m.rang} m={m} nombre={nombre} />
    </>
  );
}

/**
 * Le palais de mémoire. De 3 à 8 objets, un par pièce d'une maison de huit pièces, montrés quelques secondes ;
 * puis une question par pièce occupée, avec quatre objets. La première mauvaise réponse perd la manche ; la partie
 * s'arrête à la deuxième erreur. Score : la part des six nombres d'objets réussis, sur 100.
 */
export default function Palais(props: PropsMemoire) {
  return (
    <CadreMemoire {...props} jeu="palais" niveaux="De 3 à 8 objets"
      consigne={["La méthode\u00a0: imaginer chaque objet dans une pièce d'une maison aide à le retrouver.", "Regarde où chaque objet est rangé, puis dis ce qu'il y avait dans la pièce demandée."]}>
      <Plateau />
    </CadreMemoire>
  );
}
