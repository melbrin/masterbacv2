"use client";

// Qu'est-ce qui a changé ? : une planche de formes colorées, un écran vide, puis la même planche où une seule forme
// a changé. L'élève la touche.

import { useState } from "react";
import { prendFocus } from "@/components/jeux/CadreJeu";
import { pluriel } from "@/lib/commun/format";
import type { PropsMemoire } from "@/lib/commun/memoire";
import { ditFormeColoree } from "@/lib/commun/memoire/formes";
import { NIVEAUX_CHANGE, plancheChange, type NiveauChange } from "@/lib/commun/memoire/images";
import { bilanNiveaux } from "@/lib/commun/memoire/regles";
import { BandeauManches, CadreMemoire, FormeDessin, Grille, Motifs, Sablier, useExposition, useManches, Verdict, type CaseGrille, type Manches } from "./Commun";

/** Le temps pour regarder, en millisecondes : deux secondes et demie, et un quart de seconde par forme. */
const regard = (formes: number) => 2500 + 250 * formes;
/** L'écran vide entre les deux planches, en millisecondes. */
const BLANC = 700;

function Manche({ m, niveau }: { m: Manches; niveau: NiveauChange }) {
  const planche = plancheChange(m.graine, niveau);
  const [touchee, setTouchee] = useState<number | null>(null);
  const etape = useExposition(m.phase === "memorise", regard(niveau.formes), m.rappelle, BLANC);
  const touche = (rang: number) => {
    if (m.phase !== "rappel") return;
    setTouchee(rang);
    m.juge(rang === planche.change);
  };
  const grille = planche.avant.map((avant, rang): CaseGrille => {
    if (m.phase === "memorise") return etape === "montre" ? { contenu: <FormeDessin {...avant} />, dit: ditFormeColoree(avant) } : {};
    const apres = planche.apres[rang];
    const dessin = { contenu: <FormeDessin {...apres} />, dit: ditFormeColoree(apres) };
    if (m.phase !== "verdict") return dessin;
    if (rang === planche.change) return { ton: m.juste ? "juste" : "oubliee", ...dessin };
    return rang === touchee ? { ton: "fausse", ...dessin } : dessin;
  });
  const avant = planche.avant[planche.change];
  const apres = planche.apres[planche.change];
  return (
    <>
      <div className="carte mem-scene mem-scene-grille" data-phase={m.phase} tabIndex={-1} ref={m.rang > 0 ? prendFocus : undefined}>
        {etape === "montre" && m.phase === "memorise" && <Sablier ms={regard(niveau.formes)} />}
        <p className="jeu-etiquette" aria-live="polite">
          {m.phase === "memorise" ? "Retiens cette planche" : m.phase === "rappel" ? "Touche la forme qui a changé" : "La forme qui a changé"}
        </p>
        <Grille nom="Planche de formes" colonnes={planche.colonnes} cases={grille} actif={m.phase === "rappel"} touche={touche} />
      </div>
      <Verdict m={m}>
        {m.phase === "verdict" && (
          <span className="mem-avant-apres">
            <FormeDessin {...avant} /><span className="jeu-sr">{ditFormeColoree(avant)}</span>
            <span aria-hidden="true">devient</span><span className="jeu-sr">est devenu</span>
            <FormeDessin {...apres} /><span className="jeu-sr">{ditFormeColoree(apres)}</span>
          </span>
        )}
      </Verdict>
    </>
  );
}

function Plateau() {
  const m = useManches(NIVEAUX_CHANGE.length, (reussis) => bilanNiveaux(NIVEAUX_CHANGE.map((n) => n.formes), reussis,
    (n) => `Tu as repéré le changement sur une planche de ${n} formes.`, "Aucun changement repéré cette fois."));
  const niveau = NIVEAUX_CHANGE[m.niveau];
  return (
    <>
      <Motifs />
      <BandeauManches m={m} enjeu={pluriel(niveau.formes, "forme", "formes")} />
      <Manche key={m.rang} m={m} niveau={niveau} />
    </>
  );
}

/**
 * Qu'est-ce qui a changé ? Huit niveaux : de 4 à 16 formes, puis des changements discrets (le dessin ou la teinte,
 * pas les deux). Chaque teinte a son remplissage : un changement de couleur se voit aussi sans les couleurs.
 * La partie s'arrête à la deuxième erreur. Score : la part des huit niveaux réussis, sur 100.
 */
export default function Change(props: PropsMemoire) {
  return (
    <CadreMemoire {...props} jeu="change" niveaux="De 4 à 16 formes"
      consigne={["Une planche de formes s'affiche, puis disparaît.", "Elle revient avec une seule forme changée\u00a0: touche-la."]}>
      <Plateau />
    </CadreMemoire>
  );
}
