"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import ContenuHtml from "@/components/socle/ContenuHtml";
import { nombre, points as formatPoints } from "@/lib/commun/format";
import { ouvrirCorrige, ouvrirIndice, seCorriger, signaler } from "@/lib/serveur/commandes/cours";
import Icone from "./Icone";

type Jugement = 1 | 0.5 | 0;
type Resultat = "ok" | "partiel" | "ko";
interface Corrige { genre: string; corrige: string; intro: string; etapes: { titre: string; html: string }[]; points: number | null }
interface Props {
  cle: string;
  reference: string;
  exercice: boolean;
  nbIndices: number;
  contexte?: "libre" | "seance" | "ds" | "carnet";
  /** où aller une fois corrigé : la question suivante de la séance, l'étape suivante du plan, le retour au carnet */
  suite?: { href: string; libelle: string };
  /** la question a déjà été faite dans cette séance : on peut passer à la suite sans la refaire */
  dejaFait?: boolean;
}

function Seg({ valeur, choisir, libelle, fige }: { valeur: Jugement | null; choisir: (v: Jugement) => void; libelle: string; fige: boolean }) {
  return (
    <span className="seg" role="group" aria-label={libelle}>
      {([[1, "Trouvé"], [0.5, "En partie"], [0, "Pas trouvé"]] as const).map(([v, t]) => (
        <button key={v} type="button" aria-pressed={valeur === v} disabled={fige} onClick={() => choisir(v)}>{t}</button>
      ))}
    </span>
  );
}

// Ce que l'élève voit après s'être corrigé : une pastille animée et une phrase.
function Verdict({ resultat, exercice }: { resultat: Resultat; exercice: boolean }) {
  const quoi = exercice ? "cet exercice" : "cette question";
  return (
    <div className={`verdict verdict-${resultat}`} role="status">
      <span className="pastille"><Icone nom={resultat === "ok" ? "ok" : "carnet"} /></span>
      <span>
        <b>{resultat === "ok" ? (exercice ? "Exercice réussi, bravo !" : "Réussi, bravo !") : resultat === "partiel" ? "Réussi en partie. C'est noté." : "Raté pour cette fois. C'est noté."}</b>
        <span className="petit discret">{resultat === "ok" ? "Ton résultat est enregistré." : `Tu reverras ${quoi} dans 2 jours, dans ton carnet d'erreurs.`}</span>
      </span>
    </div>
  );
}

// La zone de travail : indices, corrigé, autocorrection. L'élève rédige sur papier ;
// le corrigé n'arrive du serveur qu'au moment où il le demande, et seulement s'il y a droit.
export default function ItemTravail({ cle, reference, exercice, nbIndices, contexte = "libre", suite, dejaFait = false }: Props) {
  const [indices, setIndices] = useState<{ libelle: string; html: string }[]>([]);
  const [corrige, setCorrige] = useState<Corrige | null>(null);
  const [reserve, setReserve] = useState(false);
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState<(Jugement | null)[]>([]);
  const [redaction, setRedaction] = useState<Jugement | null>(null);
  const [choisi, setChoisi] = useState<Resultat | null>(null);
  const [valide, setValide] = useState<Resultat | null>(null);
  const [seanceFinie, setSeanceFinie] = useState(false);
  const [signale, setSignale] = useState<"ferme" | "ouvert" | "envoye">("ferme");
  const [enCours, lance] = useTransition();

  const demandeIndice = () => lance(async () => {
    const r = await ouvrirIndice({ cle, rang: (indices.length + 1) as 1 | 2 });
    if (r.ok) setIndices((x) => [...x, r.valeur]);
    else setMessage(r.message);
  });
  const demandeCorrige = () => lance(async () => {
    const r = await ouvrirCorrige({ cle });
    if (r.ok) { setCorrige(r.valeur); setNotes(new Array(r.valeur.etapes.length).fill(null)); }
    else if (r.code === "reserve") setReserve(true);
    else setMessage(r.message);
  });
  const juge = (resultat: Resultat) => {
    setChoisi(resultat);
    lance(async () => {
      const r = await seCorriger({ cle, resultat, contexte });
      if (!r.ok) { setChoisi(null); setMessage(r.message); return; }
      setValide(resultat);
      setSeanceFinie(r.valeur.seanceFinie);
    });
  };
  const valideBareme = () => lance(async () => {
    if (notes.some((n) => n === null) || redaction === null) return;
    const r = await seCorriger({ cle, etapes: notes as Jugement[], redaction, contexte });
    if (!r.ok) { setMessage(r.message); return; }
    setValide(r.valeur.resultat);
    setSeanceFinie(r.valeur.seanceFinie);
  });

  const avecBareme = exercice && corrige !== null && corrige.etapes.length > 0;
  const pts = corrige?.points || corrige?.etapes.length || 0;
  const lignes = corrige ? corrige.etapes.length + 1 : 1;
  const parLigne = pts / lignes;
  const toutNote = notes.every((n) => n !== null) && redaction !== null;
  const total = toutNote ? ((notes as number[]).reduce((a, b) => a + b, 0) + (redaction ?? 0)) * parLigne : 0;
  // se corriger sur l'exercice du jour termine la séance : le bouton mène alors au bilan
  const apres = seanceFinie ? { href: "/app/seance?bravo=1", libelle: "Terminer ma séance" } : suite;
  return (
    <div className="travail" id="travail">
      <div className="actions">
        {Array.from({ length: nbIndices }, (_, i) => (
          <button key={i} className="btn btn-ligne" type="button" disabled={enCours || indices.length !== i} onClick={demandeIndice}><Icone nom="ampoule" />Indice {i + 1}</button>
        ))}
        <button className="btn btn-cuivre" type="button" disabled={enCours || corrige !== null} onClick={demandeCorrige}><Icone nom="oeil" />{exercice ? "Me corriger au barème" : "Voir le corrigé"}</button>
      </div>
      {indices.map((ind, i) => (
        <div className="indice" key={i}><span className="lib">Indice {i + 1} · {ind.libelle}</span><ContenuHtml bloc className="contenu" html={ind.html} /></div>
      ))}
      <p role="alert" className="petit" style={{ color: "var(--brique)", margin: 0 }}>{message}</p>

      {reserve && (
        <div className="carte" style={{ borderColor: "var(--cuivre)" }}>
          <h2><Icone nom="cadenas" taille={20} /> Ce corrigé fait partie du Pass</h2>
          <p>Avec l&apos;offre gratuite, tu as le corrigé de la question 1 de chaque fiche, celui de l&apos;exercice du jour et ceux de ta préparation de DS offerte. Le Pass Bac 2027 ouvre tous les corrigés.</p>
          <div className="actions"><Link className="btn btn-cuivre" href="/app/offres">Voir les offres</Link></div>
        </div>
      )}

      {corrige && !avecBareme && (
        <>
          <section className="corrige" aria-label="Corrigé"><div className="tete-c"><Icone nom="ok" />Corrigé</div><ContenuHtml bloc className="corps contenu" html={corrige.corrige} /></section>
          <div className="auto-eval">
            <b>Compare avec ce que tu as écrit sur ta feuille.</b>
            <div className="choix" role="group" aria-label="Ton résultat">
              {([["ok", "Réussi", "tout est juste"], ["partiel", "En partie", "une erreur, un oubli"], ["ko", "Raté", "à reprendre"]] as const).map(([r, nom, detail]) => (
                <button key={r} type="button" data-r={r} aria-pressed={(valide ?? choisi) === r} disabled={enCours || valide !== null} onClick={() => juge(r)}>{nom}<small>{detail}</small></button>
              ))}
            </div>
            {valide ? <Verdict resultat={valide} exercice={false} />
              : <p className="petit discret" style={{ margin: 0 }}>Si tu rates une question, tu la reverras 2 jours plus tard, puis une semaine après, puis trois semaines après.</p>}
          </div>
        </>
      )}

      {corrige && avecBareme && (
        <section className="corrige" aria-label="Corrigé au barème">
          <div className="tete-c"><Icone nom="ok" />Corrigé pas à pas, au barème</div>
          <div className="corps">
            {corrige.intro && <ContenuHtml bloc className="contenu" html={corrige.intro} />}
            <p className="petit discret">Compare chaque réponse avec ta copie, puis choisis : trouvé, en partie ou pas trouvé. Barème provisoire : {formatPoints(pts)} points, chaque question et la rédaction comptent autant.</p>
            <div className="etape-bareme">
              {corrige.etapes.map((e, i) => (i === 0 || notes[i - 1] !== null) && (
                <div className="etape" key={i}>
                  <div className="contenu"><ContenuHtml bloc className="cs-qrappel" html={e.titre} /><ContenuHtml bloc html={e.html} /></div>
                  <div className="ligne-b"><span className="petit discret">{nombre(parLigne, 2)} pt</span>
                    <Seg fige={valide !== null} valeur={notes[i]} libelle={`Résultat à la question ${i + 1}`} choisir={(v) => setNotes((n) => n.map((x, j) => (j === i ? v : x)))} /></div>
                </div>
              ))}
              {notes.every((n) => n !== null) && (
                <div className="etape">
                  <div className="contenu"><div className="cs-qrappel"><strong>Rédaction</strong></div><p>Une phrase de conclusion à chaque question, les unités partout, le vocabulaire exact.</p></div>
                  <div className="ligne-b"><span className="petit discret">{nombre(parLigne, 2)} pt</span><Seg fige={valide !== null} valeur={redaction} libelle="Résultat pour la rédaction" choisir={setRedaction} /></div>
                </div>
              )}
            </div>
            {toutNote && (
              <div className="auto-eval"><div className="score-final"><b className="chiffres">{nombre(total, 1)}</b><span>sur {formatPoints(pts)} points</span></div>
                {valide ? <Verdict resultat={valide} exercice />
                  : <p style={{ margin: 0 }}>Tu peux encore changer une réponse. Ensuite, valide ta note.</p>}
                {!valide && <div className="actions"><button className="btn btn-cuivre" type="button" disabled={enCours} onClick={valideBareme}>Valider ma note</button></div>}</div>
            )}
          </div>
        </section>
      )}

      {valide && apres && <div className="actions suite-travail"><Link className="btn btn-cuivre" href={apres.href}>{apres.libelle}<Icone nom="chevron" /></Link></div>}
      {!valide && dejaFait && suite && <div className="actions suite-travail"><span className="puce puce-ok"><Icone nom="ok" />Déjà fait</span><Link className="btn btn-ligne" href={suite.href}>{suite.libelle}<Icone nom="chevron" /></Link></div>}

      {signale === "ferme" && <p className="petit discret" style={{ margin: "4px 0 0" }}><button className="btn-texte" type="button" onClick={() => setSignale("ouvert")}><Icone nom="drapeau" taille={16} /> Signaler une erreur</button></p>}
      {signale === "ouvert" && (
        <form className="carte formulaire" onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          lance(async () => {
            const r = await signaler({ reference, ou: d.get("ou") as "enonce", message: String(d.get("message") ?? "") });
            if (r.ok) setSignale("envoye"); else setMessage(r.message);
          });
        }}>
          <h2>Signaler une erreur</h2>
          <div className="champ"><label htmlFor="sig-ou">Où est l&apos;erreur ?</label>
            <select id="sig-ou" name="ou"><option value="enonce">Dans l&apos;énoncé</option><option value="corrige">Dans le corrigé</option><option value="figure">Dans une figure</option><option value="autre">Autre</option></select></div>
          <div className="champ"><label htmlFor="sig-txt">Ce qui ne va pas</label><textarea id="sig-txt" name="message" rows={4} maxLength={1000} required placeholder="Par exemple : le résultat de la ligne 3 devrait être 0,382 mol" /></div>
          <div className="actions"><button className="btn btn-cuivre" type="submit" disabled={enCours}>Envoyer le signalement</button><button className="btn btn-ligne" type="button" onClick={() => setSignale("ferme")}>Annuler</button></div>
        </form>
      )}
      {signale === "envoye" && <p className="petit" role="status">Merci, ton signalement est bien envoyé.</p>}
    </div>
  );
}
