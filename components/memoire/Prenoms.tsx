"use client";

// Les prénoms : des personnages dessinés simplement, chacun avec son prénom, à regarder quelques secondes.
// Ensuite, pour chaque personnage, l'élève retrouve le prénom parmi quatre.

import type { ReactNode } from "react";
import { prendFocus } from "@/components/jeux/CadreJeu";
import { pluriel } from "@/lib/commun/format";
import type { PropsMemoire } from "@/lib/commun/memoire";
import { TEINTES } from "@/lib/commun/memoire/formes";
import { ditPersonnage, NIVEAUX_PRENOMS, personnagesPrenoms, type Personnage } from "@/lib/commun/memoire/mots";
import { bilanNiveaux } from "@/lib/commun/memoire/regles";
import { BandeauManches, CadreMemoire, Choix, Points, Sablier, useExposition, useManches, useQuestions, Verdict, type Manches } from "./Commun";

/** Le temps pour regarder, en millisecondes : deux secondes, et un peu plus d'une seconde et demie par personnage. */
const regard = (nombre: number) => 2000 + 1600 * nombre;

// Les dessins : chaque coiffure a une partie derrière la tête et une partie devant, dans l'ordre de COIFFURES
// (lib/commun/memoire/mots.ts) ; chaque accessoire suit l'ordre de ACCESSOIRES. Grille de 48 sur 56.
// Les trois morceaux d'un personnage se dessinent côte à côte : leurs clés ne se répètent pas d'une liste à l'autre.
const CALOTTE = <path className="mem-cheveux" d="M11.6 22.5C11 14.5 16.5 9.5 24 9.5s13 5 12.4 13c-1.6-3.2-4.2-5.2-7.6-5.8-3.2 2.4-7.6 3.2-12 2.4-2 .6-3.8 1.8-5.2 3.4z" />;
const RAIE = <path className="mem-cheveux" d="M11.6 21C12 13.5 17 9.5 24 9.5S36 13.5 36.4 21c-3.5-.5-7.5-2.5-12.4-7-4.9 4.5-8.9 6.5-12.4 7z" />;
const BOUCLES = [[14, 17, 4.6], [18.5, 12.5, 4.6], [24, 10.8, 4.6], [29.5, 12.5, 4.6], [34, 17, 4.6], [12.4, 22.5, 3.6], [35.6, 22.5, 3.6]];
const DERRIERE: ReactNode[] = [
  null,
  <path key="derriere-longs" className="mem-cheveux" d="M9.5 44V23C9.5 14 16 8.5 24 8.5S38.5 14 38.5 23v21h-6V24h-17v20z" />,
  null, null, null,
  <g key="derriere-couettes"><circle className="mem-cheveux" cx="8.6" cy="27" r="4.8" /><circle className="mem-cheveux" cx="39.4" cy="27" r="4.8" /></g>,
  null, null,
];
const DEVANT: ReactNode[] = [
  CALOTTE,
  RAIE,
  <g key="devant-boucles">{BOUCLES.map(([cx, cy, r], i) => <circle key={i} className="mem-cheveux" cx={cx} cy={cy} r={r} />)}</g>,
  <g key="devant-chignon"><circle className="mem-cheveux" cx="24" cy="6.8" r="4.4" />{CALOTTE}</g>,
  <path key="devant-frange" className="mem-cheveux" d="M11.5 24v-2.5C11.5 14 17 9.5 24 9.5S36.5 14 36.5 21.5V24H34v-4.5H14V24z" />,
  RAIE,
  <path key="devant-crete" className="mem-cheveux" d="M19 13.5l1.2-7.5 2 5.2L24 4l1.8 7.2 2-5.2 1.2 7.5c-1.8-.9-3.4-1.3-5-1.3s-3.2.4-5 1.3z" />,
  <g key="devant-bonnet">
    <path className="mem-bijou" d="M10.8 18.2C10.8 11.2 16.5 6.4 24 6.4s13.2 4.8 13.2 11.8z" />
    <rect className="mem-bijou" x="9.6" y="15.4" width="28.8" height="5.2" rx="2.6" />
    <circle className="mem-bijou" cx="24" cy="4.4" r="3" />
  </g>,
];
const ACCESSOIRES_DESSIN: ReactNode[] = [
  null,
  <g key="avec-lunettes"><circle cx="19.5" cy="24.5" r="3.8" /><circle cx="28.5" cy="24.5" r="3.8" /><path d="M23.3 24.5h1.4M15.7 24l-3.6-1.2M32.3 24l3.6-1.2" /></g>,
  <g key="avec-noeud"><path className="mem-bijou" d="M24 43.5l-5.5-3.2v6.4zM24 43.5l5.5-3.2v6.4z" /><circle className="mem-bijou" cx="24" cy="43.5" r="1.3" /></g>,
  <g key="avec-echarpe"><path className="mem-bijou" d="M14.5 39.5c3.2 2.6 15.8 2.6 19 0v4.6c-3.2 2.6-15.8 2.6-19 0z" /><path className="mem-bijou" d="M28.5 45v7H33v-6.2" /></g>,
  <g key="avec-boucles"><circle className="mem-bijou" cx="11.6" cy="29.5" r="1.9" /><circle className="mem-bijou" cx="36.4" cy="29.5" r="1.9" /></g>,
  <path key="avec-moustache" className="mem-cheveux" d="M18.5 30.2c1.6-1.9 3.9-1.9 5.5-.2 1.6-1.7 3.9-1.7 5.5.2-1.8 1.3-3.9 1.1-5.5-.2-1.6 1.3-3.7 1.5-5.5.2z" />,
];
/** Le rang de la moustache : elle prend la place du sourire. */
const MOUSTACHE = 5;

// Un personnage : sa coiffure et son accessoire le distinguent ; la teinte de son habit n'est qu'un plus.
function Visage({ coiffure, accessoire, teinte }: Pick<Personnage, "coiffure" | "accessoire" | "teinte">) {
  return (
    <svg className={`mem-visage mem-teinte-${TEINTES[teinte].id}`} viewBox="0 0 48 56" aria-hidden="true" focusable="false">
      <path className="mem-habit" d="M7 56c0-9 7.5-13.5 17-13.5S41 47 41 56z" />
      <rect className="mem-peau" x="20.5" y="35" width="7" height="9" rx="2" />
      {DERRIERE[coiffure]}
      <circle className="mem-peau" cx="24" cy="24" r="12.5" />
      {DEVANT[coiffure]}
      <circle className="mem-oeil" cx="19.5" cy="24.5" r="1.2" />
      <circle className="mem-oeil" cx="28.5" cy="24.5" r="1.2" />
      {accessoire !== MOUSTACHE && <path d="M20 30c1.2 1.4 2.6 2 4 2s2.8-.6 4-2" />}
      {ACCESSOIRES_DESSIN[accessoire]}
    </svg>
  );
}

function Manche({ m, nombre }: { m: Manches; nombre: number }) {
  const { personnages, questions } = personnagesPrenoms(m.graine, nombre);
  const etape = useExposition(m.phase === "memorise", regard(nombre), m.rappelle);
  const { rang, choisie, repond } = useQuestions(m, nombre);
  const question = questions[rang];
  const demande = personnages[question.personnage];
  return (
    <>
      <div className="carte mem-scene mem-scene-planche" data-phase={m.phase} tabIndex={-1} ref={m.rang > 0 ? prendFocus : undefined}>
        {etape === "montre" && m.phase === "memorise" && <Sablier ms={regard(nombre)} />}
        {m.phase === "memorise" ? (
          <>
            <p className="jeu-etiquette">Retiens le prénom de chacun</p>
            <ul className={`mem-personnages${etape === "montre" ? "" : " mem-cachee"}`} aria-label="Personnages à retenir" aria-hidden={etape !== "montre" || undefined}>
              {personnages.map((p) => (
                <li key={p.prenom} data-repere={etape === "montre" ? `${ditPersonnage(p)}|${p.prenom}` : undefined}>
                  <Visage {...p} /><span className="jeu-sr">{ditPersonnage(p)}&nbsp;: </span><b>{p.prenom}</b>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className="jeu-etiquette">Quel est son prénom&nbsp;?</p>
            <div className="mem-portrait" aria-live="polite">
              <Visage key={rang} {...demande} /><span className="jeu-sr">{ditPersonnage(demande)}</span>
            </div>
            <Points total={nombre} rang={rang} />
          </>
        )}
      </div>
      <Verdict m={m}>{!m.juste && <span>Son prénom&nbsp;: <b>{demande.prenom}</b>.</span>}</Verdict>
      {m.phase !== "memorise" && (
        <Choix nom="Prénoms proposés" options={question.choix.map((prenom) => ({ cle: prenom, contenu: prenom }))} bonne={demande.prenom} choisie={choisie}
          repond={(prenom) => repond(prenom, demande.prenom)} />
      )}
    </>
  );
}

function Plateau() {
  const m = useManches(NIVEAUX_PRENOMS.length, (reussis) => bilanNiveaux(NIVEAUX_PRENOMS, reussis,
    (n) => `Tu as retenu les prénoms de ${n} personnages.`, "Aucune série de prénoms retenue cette fois."));
  const nombre = NIVEAUX_PRENOMS[m.niveau];
  return (
    <>
      <BandeauManches m={m} enjeu={pluriel(nombre, "prénom", "prénoms")} />
      <Manche key={m.rang} m={m} nombre={nombre} />
    </>
  );
}

/**
 * Les prénoms. De 3 à 8 personnages, chacun avec son prénom, montrés quelques secondes ; puis une question par
 * personnage, avec quatre prénoms. La première mauvaise réponse perd la manche ; la partie s'arrête à la deuxième
 * erreur. Score : la part des six nombres de personnages réussis, sur 100.
 */
export default function Prenoms(props: PropsMemoire) {
  return (
    <CadreMemoire {...props} jeu="prenoms" niveaux="De 3 à 8 prénoms"
      consigne={["Des personnages s'affichent, chacun avec son prénom.", "Ensuite, retrouve le prénom de chaque personnage."]}>
      <Plateau />
    </CadreMemoire>
  );
}
