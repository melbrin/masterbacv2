"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import ContenuHtml from "@/components/socle/ContenuHtml";
import { nombre, points as formatPoints } from "@/lib/commun/format";
import { ouvrirCorrige, ouvrirIndice, seCorriger, signaler } from "@/lib/serveur/commandes/cours";
import Icone from "./Icone";

type Jugement = 1 | 0.5 | 0;
interface Corrige { genre: string; corrige: string; intro: string; etapes: { titre: string; html: string }[]; points: number | null }
interface Props { cle: string; reference: string; exercice: boolean; nbIndices: number; contexte?: "libre" | "seance" | "ds" | "carnet"; apresResultat?: string }

function Seg({ valeur, choisir, libelle, fige }: { valeur: Jugement | null; choisir: (v: Jugement) => void; libelle: string; fige: boolean }) {
  return (
    <span className="seg" role="group" aria-label={libelle}>
      {([[1, "Trouvé"], [0.5, "En partie"], [0, "Pas trouvé"]] as const).map(([v, t]) => (
        <button key={v} type="button" aria-pressed={valeur === v} disabled={fige} onClick={() => choisir(v)}>{t}</button>
      ))}
    </span>
  );
}

// La zone de travail : indices, corrigé, autocorrection. L'élève rédige sur papier ;
// le corrigé n'arrive du serveur qu'au moment où il le demande, et seulement s'il y a droit.
export default function ItemTravail({ cle, reference, exercice, nbIndices, contexte = "libre", apresResultat }: Props) {
  const router = useRouter();
  const [indices, setIndices] = useState<{ libelle: string; html: string }[]>([]);
  const [corrige, setCorrige] = useState<Corrige | null>(null);
  const [reserve, setReserve] = useState(false);
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState<(Jugement | null)[]>([]);
  const [redaction, setRedaction] = useState<Jugement | null>(null);
  const [valide, setValide] = useState<string | null>(null);
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
  const juge = (resultat: "ok" | "partiel" | "ko") => lance(async () => {
    const r = await seCorriger({ cle, resultat, contexte });
    if (!r.ok) { setMessage(r.message); return; }
    setValide(resultat === "ok" ? "Réussi : la notion avance." : "Noté : cette question revient dans ton carnet dans 2 jours.");
    router.refresh();
  });
  const valideBareme = () => lance(async () => {
    if (notes.some((n) => n === null) || redaction === null) return;
    const r = await seCorriger({ cle, etapes: notes as Jugement[], redaction, contexte });
    if (!r.ok) { setMessage(r.message); return; }
    setValide(r.valeur.resultat === "ok" ? "Note enregistrée : exercice réussi." : "Note enregistrée : l'exercice revient dans ton carnet dans 2 jours.");
    router.refresh();
  });

  const avecBareme = exercice && corrige !== null && corrige.etapes.length > 0;
  const pts = corrige?.points || corrige?.etapes.length || 0;
  const lignes = corrige ? corrige.etapes.length + 1 : 1;
  const parLigne = pts / lignes;
  const toutNote = notes.every((n) => n !== null) && redaction !== null;
  const total = toutNote ? ((notes as number[]).reduce((a, b) => a + b, 0) + (redaction ?? 0)) * parLigne : 0;
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
          <p>Avec l&apos;offre gratuite, tu as le corrigé de la question 1 de chaque fiche, l&apos;exercice du jour et les corrigés de ta préparation de DS offerte. Le Pass Bac 2027 ouvre tous les corrigés.</p>
          <div className="actions"><Link className="btn btn-cuivre" href="/app/offres">Voir les offres</Link></div>
        </div>
      )}

      {corrige && !avecBareme && (
        <>
          <section className="corrige" aria-label="Corrigé"><div className="tete-c"><Icone nom="ok" />Corrigé</div><ContenuHtml bloc className="corps contenu" html={corrige.corrige} /></section>
          <div className="auto-eval">
            <b>Compare avec ce que tu as écrit sur ta feuille.</b>
            <div className="choix" role="group" aria-label="Ton résultat">
              <button type="button" disabled={enCours || !!valide} onClick={() => juge("ok")}>Réussi<small>tout est juste</small></button>
              <button type="button" disabled={enCours || !!valide} onClick={() => juge("partiel")}>En partie<small>une erreur, un oubli</small></button>
              <button type="button" disabled={enCours || !!valide} onClick={() => juge("ko")}>Raté<small>à reprendre</small></button>
            </div>
            <p className="petit discret" role="status" style={{ margin: 0 }}>{valide ?? "Une question ratée ou réussie en partie revient dans ton carnet d'erreurs dans 2 jours, puis dans une semaine, puis dans trois semaines."}</p>
          </div>
        </>
      )}

      {corrige && avecBareme && (
        <section className="corrige" aria-label="Corrigé au barème">
          <div className="tete-c"><Icone nom="ok" />Corrigé pas à pas, au barème</div>
          <div className="corps">
            {corrige.intro && <ContenuHtml bloc className="contenu" html={corrige.intro} />}
            <p className="petit discret">Pour chaque question, compare avec ta copie et coche ce que tu as obtenu. Barème provisoire : {formatPoints(pts)} points répartis à parts égales entre les questions et la rédaction.</p>
            <div className="etape-bareme">
              {corrige.etapes.map((e, i) => (i === 0 || notes[i - 1] !== null) && (
                <div className="etape" key={i}>
                  <div className="contenu"><ContenuHtml bloc className="cs-qrappel" html={e.titre} /><ContenuHtml bloc html={e.html} /></div>
                  <div className="ligne-b"><span className="petit discret">{nombre(parLigne, 2)} pt</span>
                    <Seg fige={!!valide} valeur={notes[i]} libelle={`Résultat à la question ${i + 1}`} choisir={(v) => setNotes((n) => n.map((x, j) => (j === i ? v : x)))} /></div>
                </div>
              ))}
              {notes.every((n) => n !== null) && (
                <div className="etape">
                  <div className="contenu"><div className="cs-qrappel"><strong>Rédaction</strong></div><p>Une phrase de conclusion à chaque question, les unités partout, le vocabulaire exact.</p></div>
                  <div className="ligne-b"><span className="petit discret">{nombre(parLigne, 2)} pt</span><Seg fige={!!valide} valeur={redaction} libelle="Résultat pour la rédaction" choisir={setRedaction} /></div>
                </div>
              )}
            </div>
            {toutNote && (
              <div className="auto-eval"><div className="score-final"><b className="chiffres">{nombre(total, 1)}</b><span>sur {formatPoints(pts)} points</span></div>
                <p style={{ margin: 0 }} role="status">{valide ?? "Tu peux changer une réponse avant de valider."}</p>
                <div className="actions"><button className="btn btn-cuivre" type="button" disabled={enCours || !!valide} onClick={valideBareme}>{valide ? "Note enregistrée" : "Valider ma note"}</button></div></div>
            )}
          </div>
        </section>
      )}

      {valide && apresResultat && <div className="actions"><Link className="btn btn-cuivre" href={apresResultat}>Continuer</Link></div>}

      {signale === "ferme" && <p className="petit discret" style={{ margin: "4px 0 0" }}><button className="btn-texte" type="button" onClick={() => setSignale("ouvert")}><Icone nom="drapeau" taille={16} /> Signaler une erreur</button></p>}
      {signale === "ouvert" && (
        <form className="carte" onSubmit={(e) => {
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
      {signale === "envoye" && <p className="petit" role="status">Merci. Ton signalement est noté : la fiche sera vérifiée.</p>}
    </div>
  );
}
