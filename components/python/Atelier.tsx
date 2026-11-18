"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { SOLUTION_APRES, reussi, type ErreurPython, type FigurePython, type ResultatTest, type TestPython } from "@/lib/commun/python/types";
import { essaiPython, solutionPython } from "@/lib/serveur/commandes/python";
import Editeur, { type PoigneeEditeur } from "./Editeur";
import Graphe from "./Graphe";
import { DUREE_MAX, usePython, type Issue } from "./usePython";

// L'atelier du hub Python (décision 0016) : l'éditeur, les boutons, puis ce que le programme a produit (ce qu'il
// affiche, ses tracés, son erreur expliquée en français) et, pour un exercice, ses vérifications. Le programme de
// l'élève est gardé sur l'appareil, rangé sous son compte, à mesure qu'il l'écrit : il le retrouve en revenant.

export interface ExerciceAtelier {
  id: string;
  tests: TestPython[];
  indices: string[];
  dejaReussi: boolean;
  /** les vérifications déjà lancées, enregistrées par le serveur */
  essais: number;
  /** le programme de la première réussite, retrouvé sur le serveur : il sert quand l'appareil n'a rien gardé */
  codeReussi: string | null;
  suivant: { href: string; titre: string } | null;
}

interface Rendu {
  mode: "lancer" | "verifier";
  erreur: ErreurPython | null;
  figures: FigurePython[];
  tests: ResultatTest[];
  tropLong: boolean;
}

const lisBrouillon = (cle: string): string | null => {
  try { return window.localStorage.getItem(cle); } catch { return null; }
};
const ecrisBrouillon = (cle: string, code: string | null) => {
  try {
    if (code === null) window.localStorage.removeItem(cle);
    else window.localStorage.setItem(cle, code);
  } catch { /* le programme ne sera pas gardé sur l'appareil : sans gravité */ }
};

const Coche = ({ ok }: { ok: boolean }) => (
  <svg className={`py-coche ${ok ? "ok" : "ko"}`} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
    {ok ? <path d="M4.5 10.5l3.6 3.6 7.4-8.2" /> : <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />}
  </svg>
);

/** Donne le focus à un élément qui vient d'apparaître, après son affichage. */
const focusApres = (cible: React.RefObject<HTMLElement | null>) => requestAnimationFrame(() => cible.current?.focus());

export default function Atelier({ exercice, depart, cle }: { exercice?: ExerciceAtelier; depart: string; cle: string }) {
  const { etat, redemarrage, lignes, executer, efface, relance } = usePython();
  const editeur = useRef<PoigneeEditeur>(null);
  const sauvegarde = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boutonRemise = useRef<HTMLButtonElement>(null);
  const boutonConfirme = useRef<HTMLButtonElement>(null);
  const dernierIndice = useRef<HTMLParagraphElement>(null);
  const resume = useRef<HTMLElement>(null);
  const [rendu, setRendu] = useState<Rendu | null>(null);
  const [annonce, setAnnonce] = useState("");
  const [essais, setEssais] = useState(exercice?.essais ?? 0);
  const [reussiIci, setReussiIci] = useState(false);
  // réussi avant d'ouvrir la page : une nouvelle réussite est « toujours juste ». Lu une fois, car la page se recharge
  // après la première réussite et reçoit alors « déjà réussi »
  const [dejaAuDepart] = useState(exercice?.dejaReussi ?? false);
  const [nonEnregistre, setNonEnregistre] = useState(false);
  const [indices, setIndices] = useState(0);
  const [solution, setSolution] = useState<{ solution: string; explication: string[] } | null>(null);
  const [refus, setRefus] = useState("");
  const [confirmeRemise, setConfirmeRemise] = useState(false);
  const occupe = etat !== "pret";

  const garde = (code: string) => {
    if (sauvegarde.current) clearTimeout(sauvegarde.current);
    sauvegarde.current = setTimeout(() => ecrisBrouillon(cle, code === depart ? null : code), 400);
  };

  const traite = (issue: Issue, mode: Rendu["mode"]) => {
    if (issue.genre === "indisponible") return null;
    if (issue.genre === "trop-long") {
      setRendu({ mode, erreur: null, figures: [], tests: [], tropLong: true });
      setAnnonce("Ton programme a été arrêté : il tournait depuis trop longtemps.");
      editeur.current?.marque(null);
      return null;
    }
    const r = issue.resultat;
    setRendu({ mode, erreur: r.erreur, figures: r.figures, tests: r.tests, tropLong: false });
    editeur.current?.marque(r.erreur?.ligne ?? null);
    return r;
  };

  const lancer = async () => {
    const code = editeur.current?.contenu() ?? depart;
    const r = traite(await executer(code, [], "lancer"), "lancer");
    if (r) setAnnonce(r.erreur ? `Ton programme s'est arrêté sur une erreur${r.erreur.ligne ? ` à la ligne ${r.erreur.ligne}` : ""}.` : "Ton programme est terminé.");
  };

  const demandeSolution = async (montrer: boolean) => {
    if (!exercice) return;
    setRefus("");
    try {
      const r = await solutionPython({ exercice: exercice.id });
      if (!r.ok) {
        setRefus(r.code === "interdit" ? r.message : "La solution n'a pas pu être chargée. Vérifie ta connexion, puis réessaie.");
        return;
      }
      setSolution(r.valeur);
      if (montrer) focusApres(resume);
    } catch {
      setRefus("La solution n'a pas pu être chargée. Vérifie ta connexion, puis réessaie.");
    }
  };

  const verifier = async () => {
    if (!exercice) return;
    const code = editeur.current?.contenu() ?? depart;
    const r = traite(await executer(code, exercice.tests, "verifier"), "verifier");
    if (!r) return;
    const juste = reussi(r);
    const passees = r.tests.filter((x) => x.ok).length;
    setAnnonce(juste ? "Toutes les vérifications passent : exercice réussi." : `${passees} vérification${passees > 1 ? "s" : ""} sur ${r.tests.length} passe${passees > 1 ? "nt" : ""}.`);
    if (juste) setReussiIci(true);
    try {
      const enregistre = await essaiPython({ exercice: exercice.id, reussi: juste, code });
      if (enregistre.ok) setEssais((n) => n + 1);
      setNonEnregistre(!enregistre.ok && juste);
    } catch {
      setNonEnregistre(juste);
    }
    // après une réussite, ce qu'il faut retenir s'affiche : il vient avec la solution
    if (juste && !solution) await demandeSolution(false);
  };

  const remet = () => {
    editeur.current?.remplace(depart);
    ecrisBrouillon(cle, null);
    setRendu(null);
    efface();
    setConfirmeRemise(false);
    setAnnonce("Le programme de départ est revenu.");
    focusApres(boutonRemise);
  };

  const indiceSuivant = () => {
    setIndices((n) => n + 1);
    focusApres(dernierIndice);
  };

  const reussite = exercice && (reussiIci || exercice.dejaReussi);
  const testsPasses = rendu?.tests.filter((t) => t.ok).length ?? 0;
  const etatTexte = etat === "chargement" ? (redemarrage ? "Python redémarre…" : "Python se prépare. La première fois, compte quelques secondes.")
    : etat === "occupe" ? "Ton programme tourne…"
    : etat === "echec" ? "" : annonce || "Python est prêt.";

  return (
    <div className="py-atelier">
      <Editeur ref={editeur} initial={depart} lisInitial={() => lisBrouillon(cle) ?? exercice?.codeReussi ?? depart} onChange={garde}
        etiquette={exercice ? "Ton programme" : "Ton programme, dans l'atelier libre"} onLancer={() => void lancer()} />

      <div className="py-boutons">
        {exercice && <button type="button" className="btn btn-cuivre" onClick={() => void verifier()} disabled={occupe}>Vérifier</button>}
        <button type="button" className={exercice ? "btn btn-ligne" : "btn btn-cuivre"} onClick={() => void lancer()} disabled={occupe}>Lancer</button>
        <span className="espace" />
        {confirmeRemise ? (
          <span className="py-remise">
            <span>Effacer ton programme ?</span>
            <button ref={boutonConfirme} type="button" className="btn-texte" onClick={remet}>Oui, recommencer</button>
            <button type="button" className="btn-texte" onClick={() => { setConfirmeRemise(false); focusApres(boutonRemise); }}>Garder mon programme</button>
          </span>
        ) : <button ref={boutonRemise} type="button" className="btn-texte" onClick={() => { setConfirmeRemise(true); focusApres(boutonConfirme); }}>Recommencer</button>}
      </div>

      <p className="py-etat" aria-live="polite">{etatTexte}</p>
      {etat === "echec" && (
        <div className="py-panne" role="alert">
          <p>Python n&apos;a pas pu se charger sur cet appareil. Vérifie ta connexion, puis réessaie.</p>
          <button type="button" className="btn" onClick={relance}>Réessayer</button>
        </div>
      )}

      {(lignes.length > 0 || rendu) && (
        <section className="py-sortie" aria-label="Ce que ton programme a produit">
          {lignes.length > 0 && (
            <pre className="py-console">{lignes.map((l, i) => <span key={i} className={l.erreur ? "py-console-erreur" : undefined}>{l.texte}{"\n"}</span>)}</pre>
          )}
          {rendu && !rendu.erreur && !rendu.tropLong && lignes.length === 0 && rendu.figures.length === 0 && (
            <p className="py-vide">Ton programme n&apos;a rien affiché. Pour voir une valeur, utilise print(...).</p>
          )}
          {rendu?.tropLong && (
            <div className="py-erreur" role="alert">
              <p className="py-erreur-titre">Programme arrêté au bout de {DUREE_MAX / 1000} secondes</p>
              <p>Une boucle while dont la condition reste toujours vraie tourne sans fin. Vérifie que ce qui doit changer à chaque tour change bien.</p>
            </div>
          )}
          {rendu?.erreur && (
            <div className="py-erreur" role="alert">
              <p className="py-erreur-titre">{rendu.erreur.ligne ? `Ligne ${rendu.erreur.ligne} · ` : ""}{rendu.erreur.type}</p>
              {rendu.erreur.texte && <p><code>{rendu.erreur.texte}</code></p>}
              <p className="py-erreur-message" lang="en">{rendu.erreur.message}</p>
              <p>{rendu.erreur.explication}</p>
            </div>
          )}
          {rendu && rendu.figures.length > 0 && <Graphe figures={rendu.figures} />}
        </section>
      )}

      {exercice && rendu?.mode === "verifier" && rendu.tests.length > 0 && (
        <section className="py-verifications" aria-label="Les vérifications">
          <h2>Vérifications <span>{testsPasses} sur {rendu.tests.length}</span></h2>
          <ul>
            {rendu.tests.map((t) => (
              <li key={t.nom} className={t.ok ? "ok" : "ko"}>
                <Coche ok={t.ok} />
                <div><b>{t.nom}</b>{!t.ok && t.message && <p>{t.message}</p>}</div>
                <span className="sr">{t.ok ? "passe" : "ne passe pas"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {exercice && reussite && (
        <section className="py-reussite" aria-label="Exercice réussi">
          <h2>{reussiIci ? (dejaAuDepart ? "Toujours juste" : "Exercice réussi") : "Tu as déjà réussi cet exercice"}</h2>
          {nonEnregistre && <p className="py-note">Ta réussite n&apos;a pas pu être enregistrée. Vérifie ta connexion, puis relance la vérification.</p>}
          {solution && <ul className="py-retenir">{solution.explication.map((e) => <li key={e}>{e}</li>)}</ul>}
          {exercice.suivant && <p><Link className="btn btn-cuivre" href={exercice.suivant.href}>Exercice suivant : {exercice.suivant.titre}</Link></p>}
        </section>
      )}

      {exercice && (
        <section className="py-aide" aria-label="De l'aide">
          {exercice.indices.length > 0 && (
            <div className="py-indices" aria-live="polite">
              {exercice.indices.slice(0, indices).map((t, i) => (
                <p key={i} ref={i === indices - 1 ? dernierIndice : undefined} tabIndex={-1}><b>Indice {i + 1}.</b> {t}</p>
              ))}
              {indices < exercice.indices.length && (
                <button type="button" className="btn-texte" onClick={indiceSuivant}>
                  {indices === 0 ? "Un indice" : "Un autre indice"} ({indices + 1} sur {exercice.indices.length})
                </button>
              )}
            </div>
          )}
          {!solution && (reussite || essais >= SOLUTION_APRES) && (
            <button type="button" className="btn-texte" onClick={() => void demandeSolution(true)}>Voir une solution</button>
          )}
          {!solution && !reussite && essais < SOLUTION_APRES && <p className="py-note">Une solution se montre après deux vérifications.</p>}
          {refus && <p className="py-note" role="alert">{refus}</p>}
          {solution && (
            <details className="py-solution" open={!reussite}>
              <summary ref={resume}>Une solution</summary>
              <pre>{solution.solution}</pre>
              {!reussite && <ul className="py-retenir">{solution.explication.map((e) => <li key={e}>{e}</li>)}</ul>}
            </details>
          )}
        </section>
      )}
    </div>
  );
}
