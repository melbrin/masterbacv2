"use client";

// Formes et couleurs : des formes, chacune d'une couleur, à regarder quelques secondes. Ensuite, pour trois formes,
// l'élève retrouve la couleur. Chaque couleur a son remplissage et son nom : elle ne se lit pas par la teinte seule.

import { prendFocus } from "@/components/jeux/CadreJeu";
import { pluriel } from "@/lib/commun/format";
import type { PropsMemoire } from "@/lib/commun/memoire";
import { ditFormeColoree, forme, nomForme, teinte, TEINTES } from "@/lib/commun/memoire/formes";
import { formesDuos, NIVEAUX_DUOS, QUESTIONS_DUOS } from "@/lib/commun/memoire/images";
import { bilanNiveaux } from "@/lib/commun/memoire/regles";
import { BandeauManches, CadreMemoire, Choix, FormeDessin, FormeTrait, Motifs, Points, Sablier, useExposition, useManches, useQuestions, Verdict, type Manches } from "./Commun";

/** Le temps pour regarder, en millisecondes : une seconde et demie, et un peu moins d'une seconde par forme. */
const regard = (nombre: number) => 1500 + 850 * nombre;

const majuscule = (mot: string) => mot.charAt(0).toLocaleUpperCase("fr-FR") + mot.slice(1);
/** Les quatre couleurs à choisir : le remplissage de la teinte et son nom. */
const COULEURS = TEINTES.map((t) => ({
  cle: t.id,
  contenu: <span className="mem-couleur-nommee"><FormeDessin forme="carre" teinte={t.id} /><span>{majuscule(t.nom)}<small>{t.motif}</small></span></span>,
}));

function Manche({ m, nombre }: { m: Manches; nombre: number }) {
  const { formes, demandes } = formesDuos(m.graine, nombre);
  const etape = useExposition(m.phase === "memorise", regard(nombre), m.rappelle);
  const { rang, choisie, repond } = useQuestions(m, QUESTIONS_DUOS);
  const demandee = formes[demandes[rang]];
  return (
    <>
      <div className="carte mem-scene mem-scene-planche" data-phase={m.phase} tabIndex={-1} ref={m.rang > 0 ? prendFocus : undefined}>
        {etape === "montre" && m.phase === "memorise" && <Sablier ms={regard(nombre)} />}
        {m.phase === "memorise" ? (
          <>
            <p className="jeu-etiquette mem-tete">Retiens la couleur de chaque forme</p>
            <ul className={`mem-planche${etape === "montre" ? "" : " mem-cachee"}`} aria-label="Formes à retenir" aria-hidden={etape !== "montre" || undefined}>
              {formes.map((f) => <li key={f.forme} className="mem-tuile mem-tuile-forme" data-repere={etape === "montre" ? `${forme(f.forme).mot}:${f.teinte}` : undefined}><FormeDessin {...f} /><span className="jeu-sr">{ditFormeColoree(f)}</span></li>)}
            </ul>
          </>
        ) : (
          <>
            <p className="mem-question mem-tete" aria-live="polite">
              De quelle couleur était <span className="mem-question-fin"><span className="mem-question-objet"><FormeTrait forme={demandee.forme} />{nomForme(demandee.forme)}</span>?</span>
            </p>
            <Points total={QUESTIONS_DUOS} rang={rang} />
          </>
        )}
      </div>
      <Verdict m={m}>{!m.juste && <span>La bonne couleur&nbsp;: <b>{teinte(demandee.teinte).nom}</b>.</span>}</Verdict>
      {m.phase !== "memorise" && (
        <Choix nom="Couleurs proposées" options={COULEURS} bonne={demandee.teinte} choisie={choisie} repond={(cle) => repond(cle, demandee.teinte)} />
      )}
    </>
  );
}

function Plateau() {
  const m = useManches(NIVEAUX_DUOS.length, (reussis) => bilanNiveaux(NIVEAUX_DUOS, reussis,
    (n) => `Tu as retenu les couleurs de ${n} formes.`, "Aucune série de formes retenue cette fois."));
  const nombre = NIVEAUX_DUOS[m.niveau];
  return (
    <>
      <Motifs />
      <BandeauManches m={m} enjeu={pluriel(nombre, "forme", "formes")} />
      <Manche key={m.rang} m={m} nombre={nombre} />
    </>
  );
}

/**
 * Formes et couleurs. De 3 à 8 formes, chacune d'une couleur, montrées quelques secondes ; puis trois questions
 * « De quelle couleur était le triangle ? ». La première mauvaise réponse perd la manche ; la partie s'arrête à la
 * deuxième erreur. Score : la part des six nombres de formes réussis, sur 100.
 */
export default function Duos(props: PropsMemoire) {
  return (
    <CadreMemoire {...props} jeu="duos" niveaux="De 3 à 8 formes"
      consigne={["Des formes s'affichent, chacune d'une couleur.", "Ensuite, retrouve la couleur de trois d'entre elles."]}>
      <Plateau />
    </CadreMemoire>
  );
}
