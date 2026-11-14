"use client";

// Les étapes d'un TP virtuel, hors manipulation : lire la situation, choisir le matériel, ordonner le protocole,
// répondre à une question, calculer une valeur. Et la correction que le serveur renvoie après chaque étape.

import { useId, useState } from "react";
import Icone from "@/components/appli/Icone";
import { lisNombre } from "@/lib/commun/format";
import type { DocumentTp, EtapePublique, ReponseEtape, RetourEtape } from "@/lib/commun/tp/types";

type Valide = (reponse: ReponseEtape) => void;
type De<G extends EtapePublique["genre"]> = Extract<EtapePublique, { genre: G }>;

/** Écrit un texte en mettant en indice ce qui suit un tiret bas : « V_E » devient V, puis E en indice. */
export function AvecIndices({ texte }: { texte: string }) {
  return <>{texte.split(/([A-Za-zτ]_[A-Za-z0-9]+)/).map((m, i) => (i % 2 ? <span key={i}><i>{m[0]}</i><sub>{m.slice(2)}</sub></span> : m))}</>;
}

/** Les documents du sujet : toujours à portée de main, comme sur la paillasse. */
export function Documents({ documents }: { documents: DocumentTp[] }) {
  return (
    <div className="tp-documents">
      {documents.map((d, i) => (
        <section key={d.titre} className="tp-document">
          <p className="tp-document-rang">Document {i + 1}</p>
          <h3>{d.titre}</h3>
          <ul>{d.lignes.map((l) => <li key={l}><AvecIndices texte={l} /></li>)}</ul>
        </section>
      ))}
    </div>
  );
}

export function Lecture({ etape, valide, attente }: { etape: De<"lecture">; valide: Valide; attente: boolean }) {
  return (
    <div className="tp-etape">
      <h2>{etape.titre}</h2>
      {etape.paragraphes.map((p) => <p key={p}>{p}</p>)}
      <Documents documents={etape.documents} />
      <div className="actions"><button type="button" className="btn btn-cuivre" disabled={attente} onClick={() => valide({ g: "lecture" })}>J&apos;ai lu, je commence</button></div>
    </div>
  );
}

export function Materiel({ etape, valide, attente }: { etape: De<"materiel">; valide: Valide; attente: boolean }) {
  const [choisis, setChoisis] = useState<string[]>([]);
  const bascule = (id: string) => setChoisis((avant) => (avant.includes(id) ? avant.filter((x) => x !== id) : [...avant, id]));
  return (
    <div className="tp-etape">
      <h2>{etape.consigne}</h2>
      <p className="petit discret">Touche chaque objet dont tu as besoin. Certains ne servent à rien ici.</p>
      <ul className="tp-tiroir">
        {etape.objets.map((o) => (
          <li key={o.id}><button type="button" aria-pressed={choisis.includes(o.id)} onClick={() => bascule(o.id)}><span className="tp-coche" aria-hidden="true">{choisis.includes(o.id) && <Icone nom="ok" />}</span>{o.nom}</button></li>
        ))}
      </ul>
      <div className="actions"><button type="button" className="btn btn-cuivre" disabled={attente || choisis.length === 0} onClick={() => valide({ g: "materiel", choisis })}>Appeler le professeur</button></div>
    </div>
  );
}

export function Ordre({ etape, valide, attente }: { etape: De<"ordre">; valide: Valide; attente: boolean }) {
  // la place de chaque étape dans la liste reçue ; l'élève les déplace
  const [ordre, setOrdre] = useState<number[]>(() => etape.etapes.map((_, i) => i));
  const echange = (i: number, j: number) => setOrdre((avant) => { const suite = [...avant]; [suite[i], suite[j]] = [suite[j], suite[i]]; return suite; });
  return (
    <div className="tp-etape">
      <h2>{etape.consigne}</h2>
      <p className="petit discret">Déplace chaque étape avec les flèches.</p>
      <ol className="ordre-jeu">
        {ordre.map((place, i) => (
          <li key={place}>
            <div className="ordre-etape tp-ordre"><span className="num">{i + 1}</span><span>{etape.etapes[place]}</span></div>
            <div className="fl">
              <button type="button" aria-label={`Monter l'étape ${i + 1}`} disabled={i === 0} onClick={() => echange(i, i - 1)}>▲</button>
              <button type="button" aria-label={`Descendre l'étape ${i + 1}`} disabled={i === ordre.length - 1} onClick={() => echange(i, i + 1)}>▼</button>
            </div>
          </li>
        ))}
      </ol>
      <div className="actions"><button type="button" className="btn btn-cuivre" disabled={attente} onClick={() => valide({ g: "ordre", ordre })}>Appeler le professeur</button></div>
    </div>
  );
}

export function Choix({ etape, valide, attente }: { etape: De<"choix">; valide: Valide; attente: boolean }) {
  const [choix, setChoix] = useState<number | null>(null);
  return (
    <div className="tp-etape">
      <h2>{etape.question}</h2>
      <ul className="tp-options">
        {etape.options.map((o, i) => <li key={o}><button type="button" aria-pressed={choix === i} onClick={() => setChoix(i)}>{o}</button></li>)}
      </ul>
      <div className="actions"><button type="button" className="btn btn-cuivre" disabled={attente || choix === null} onClick={() => choix !== null && valide({ g: "choix", choix })}>Valider</button></div>
    </div>
  );
}

export function Valeur({ etape, valide, attente }: { etape: De<"valeur">; valide: Valide; attente: boolean }) {
  const [texte, setTexte] = useState("");
  const [aide, setAide] = useState(false);
  const [erreur, setErreur] = useState("");
  const id = useId();
  const envoie = (e: React.FormEvent) => {
    e.preventDefault();
    const valeur = lisNombre(texte);
    if (valeur === null) { setErreur("Entre un nombre, par exemple 0,098."); return; }
    valide({ g: "valeur", valeur });
  };
  return (
    <form className="tp-etape" onSubmit={envoie} noValidate>
      <h2><label htmlFor={id}>{etape.question}</label></h2>
      <div className="labo-saisie">
        <input id={id} type="text" inputMode="decimal" autoComplete="off" enterKeyHint="go" placeholder="Ta valeur" value={texte} onChange={(e) => { setTexte(e.target.value); setErreur(""); }} aria-invalid={erreur ? true : undefined} />
        <span>{etape.unite}</span>
      </div>
      {erreur && <p role="alert" className="labo-erreur">{erreur}</p>}
      <button type="button" className="btn-texte labo-aide" aria-expanded={aide} onClick={() => setAide((a) => !a)}><Icone nom="ampoule" /> {aide ? "Masquer l'aide" : "Voir une aide"}</button>
      {aide && <p className="tp-aide"><AvecIndices texte={etape.aide} /></p>}
      <div className="actions"><button type="submit" className="btn btn-cuivre" disabled={attente}>Valider</button></div>
    </form>
  );
}

const VERDICTS = [
  { classe: "verdict-ko", icone: "croix", titre: "À revoir" },
  { classe: "verdict-partiel", icone: "ok", titre: "Presque" },
  { classe: "verdict-ok", icone: "ok", titre: "Juste" },
];

/** Ce que le professeur répond après un appel : le verdict, puis la correction de l'étape. */
export function Correction({ etape, retour, reponse }: { etape: EtapePublique; retour: RetourEtape; reponse: ReponseEtape | null }) {
  const verdict = VERDICTS[retour.score >= 0.99 ? 2 : retour.score > 0 ? 1 : 0];
  const c = retour.correction;
  const paillasse = c.genre === "paillasse";
  return (
    <div className="tp-etape tp-correction" role="status">
      <p className={`verdict ${verdict.classe}`}>
        <span className="pastille"><Icone nom={verdict.icone} /></span>
        <span><b>{paillasse ? (retour.score >= 0.99 ? "Manipulation soignée" : retour.score > 0 ? "Manipulation à améliorer" : "Manipulation à refaire") : verdict.titre}</b>
          <span className="petit discret">{etape.genre === "materiel" || etape.genre === "ordre" ? "Le professeur te donne le bon protocole pour la suite." : paillasse ? "Le professeur a regardé tes gestes." : "Voici la correction."}</span></span>
      </p>
      {c.genre === "materiel" && etape.genre === "materiel" && (
        <ul className="tp-liste-corrigee">
          {etape.objets.map((o) => {
            const utile = c.utiles.includes(o.id);
            const choisi = reponse?.g === "materiel" && reponse.choisis.includes(o.id);
            return (
              <li key={o.id} className={utile === choisi ? "" : "est-faux"}>
                <b>{o.nom} : {utile ? "utile" : "inutile"}{utile === choisi ? "" : choisi ? ", tu l'avais pris" : ", tu l'avais oublié"}.</b> {c.pourquoi[o.id]}
              </li>
            );
          })}
        </ul>
      )}
      {c.genre === "ordre" && <ol className="tp-liste-corrigee">{c.etapes.map((e) => <li key={e}>{e}</li>)}</ol>}
      {c.genre === "choix" && etape.genre === "choix" && <p><b>Bonne réponse : {etape.options[c.bonne]}.</b> {c.explication}</p>}
      {c.genre === "valeur" && <p><b>Valeur attendue : {c.attendu}.</b> <AvecIndices texte={c.detail} /></p>}
      {c.genre === "paillasse" && (
        <>
          {c.fautes.length === 0 ? <p>Aucune faute de manipulation.</p> : (
            <ul className="tp-liste-corrigee">{c.fautes.map((f) => <li key={f.code + f.texte} className={f.grave ? "est-faux" : ""}><b>{f.grave ? "Faute importante" : "Faute légère"}.</b> {f.texte}</li>)}</ul>
          )}
          <ul className="tp-mesures">{c.mesures.map((m) => <li key={m}><AvecIndices texte={m} /></li>)}</ul>
        </>
      )}
    </div>
  );
}
