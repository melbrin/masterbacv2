"use client";

// Le cadre commun des défis du labo (décision 0011) : la scène, la mission, la saisie de la valeur, le lancement, le verdict.
// L'élève calcule, entre sa valeur, puis lance la simulation : le défi n'est réussi que si la simulation réussit.
// Le navigateur anime la scène avec les règles de lib/commun/simulations ; le serveur juge l'essai avec les mêmes règles,
// compte les essais et donne les étoiles.

import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import Confettis from "@/components/appli/Confettis";
import Icone from "@/components/appli/Icone";
import ContenuHtml from "@/components/socle/ContenuHtml";
import { nombre, points } from "@/lib/commun/format";
import { grandeurs, regles, type Champ, type Issue, type Mesure, type Valeurs } from "@/lib/commun/simulations";
import { validerDefi } from "@/lib/serveur/commandes/defis";
import Etoiles from "./Etoiles";
import { useHorloge } from "./horloge";
import { SCENES } from "./scenes";

/** Ce que le navigateur reçoit d'un défi : son énoncé et ses grandeurs. Le serveur l'envoie après avoir vérifié qu'il peut être montré. */
export interface DefiDuLabo {
  id: string;
  enonce: string;
  donnees: Mesure[];
  champs: Champ[];
  fixes: Valeurs;
}
/** Une ligne du tableau « À connaître par cœur » de la fiche, en HTML déjà nettoyé. */
export interface RelationDuCours {
  notion: string;
  relation: string;
  retenir: string;
}
interface Avancement {
  essais: number;
  etoiles: number | null;
}
interface Reponse extends Issue {
  etoiles: number | null;
  essais: number;
  deja: boolean;
}
/** Un essai lancé : ses grandeurs, ce que la simulation donne, et la réponse du serveur quand elle arrive. */
interface Essai {
  numero: number;
  p: Valeurs;
  issue: Issue;
  reponse: Reponse | null;
  refus: string | null;
}
interface Props {
  simulation: string;
  theme: string;
  defi: DefiDuLabo;
  relations: RelationDuCours[];
  /** l'adresse de la fiche du cours */
  cours: string;
  depart: Avancement;
  suivant: { href: string; titre: string } | null;
  /** l'adresse de la liste des défis de la simulation */
  retour: string;
}

// ---------- écriture ----------

/** Lit un nombre saisi à la française : « 7,45 », « 7.45 », « 1 000 ». Renvoie null si ce n'est pas un nombre. */
function lis(texte: string): number | null {
  const net = texte.replace(/\s/g, "").replace(",", ".");
  return /^\d+(\.\d+)?$/.test(net) ? Number(net) : null;
}

const precision = (pas: number): string => (pas >= 1 ? "à l'unité" : pas >= 0.1 ? "au dixième" : pas >= 0.01 ? "au centième" : "au millième");
const bornes = (c: Champ): string => `Entre ${points(c.min)} et ${points(c.max)} ${c.unite}. Arrondis ${precision(c.pas)}.`;
const fois = (x: number): string => nombre(x, x >= 10 || Math.abs(x - Math.round(x)) < 0.05 ? 0 : 1);
/** L'allure de l'animation : « Temps réel », « Ralenti 10 fois », « Accéléré 93 fois ». */
const allure = (cadence: number): string => (cadence > 1.05 ? `Accéléré ${fois(cadence)} fois` : cadence < 0.95 ? `Ralenti ${fois(1 / cadence)} fois` : "Temps réel");
const rangEssai = (n: number): string => (n === 1 ? "premier essai" : `${n}e essai`);

/** Écrit un texte en mettant en indice ce qui suit un tiret bas : « u_C » devient u, puis C en indice. */
function AvecIndices({ texte }: { texte: string }) {
  return <>{texte.split(/([A-Za-zθτ]_[A-Za-z0-9]+)/).map((m, i) => (i % 2 ? <span key={i}><i>{m[0]}</i><sub>{m.slice(2)}</sub></span> : m))}</>;
}

/** Le nom d'une grandeur mesurée : sa lettre en italique, son indice ou ce qui la précise ensuite. */
function NomMesure({ nom }: { nom: string }) {
  if (nom.includes("_")) return <AvecIndices texte={nom} />;
  return /^[a-zA-Zθτ]( |$)/.test(nom) ? <><i>{nom[0]}</i>{nom.slice(1)}</> : <>{nom}</>;
}

// ---------- le cadre ----------

export default function Labo({ simulation, theme, defi, relations, cours, depart, suivant, retour }: Props) {
  const [textes, setTextes] = useState<Record<string, string>>({});
  const [essai, setEssai] = useState<Essai | null>(null);
  const [avancement, setAvancement] = useState<Avancement>(depart);
  const [erreur, setErreur] = useState("");
  const [aide, setAide] = useState(false);
  /** les valeurs du dernier essai raté, pour ne pas le compter deux fois */
  const [rate, setRate] = useState<string | null>(null);
  const horloge = useHorloge();
  const ecran = useRef<HTMLDivElement>(null);
  const console_ = useRef<HTMLFormElement>(null);
  const id = useId();

  const Scene = SCENES[simulation];
  const R = regles(simulation);
  if (!Scene || !R) return null;

  // ce que l'élève a saisi : une valeur par champ, ou rien tant que le champ n'est pas un nombre dans ses bornes
  const saisies: Valeurs = Object.fromEntries(defi.champs.map((c) => [c.id, lis(textes[c.id] ?? "") ?? Number.NaN]));
  const lu = grandeurs(defi, saisies);
  const inconnues = defi.champs.filter((c) => !(saisies[c.id] >= c.min && saisies[c.id] <= c.max)).map((c) => c.id);
  // avant le lancement, la scène se règle sur les valeurs saisies ; une valeur manquante prend le milieu de ses bornes
  const apercu: Valeurs = { ...defi.fixes, ...Object.fromEntries(defi.champs.map((c) => [c.id, inconnues.includes(c.id) ? (c.min + c.max) / 2 : saisies[c.id]])) };
  const lance_ = essai !== null && horloge.phase !== "pret";
  const p = lance_ ? essai.p : apercu;
  const t = lance_ ? horloge.t : 0;
  const fini = lance_ && horloge.phase === "fini";
  const reponse = fini ? essai.reponse : null;
  const reussi = !!reponse?.reussi;
  const mesures = R.mesures(p, t);
  const reglee = lance_ || inconnues.length === 0;

  const doux = (): ScrollBehavior => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");
  const change = (champ: string, texte: string) => {
    // changer une valeur remet la scène au départ
    if (essai) { horloge.remet(); setEssai(null); }
    setErreur("");
    setTextes((avant) => ({ ...avant, [champ]: texte }));
  };
  const corrige = () => {
    const champ = console_.current?.querySelector("input");
    console_.current?.scrollIntoView({ behavior: doux(), block: "center" });
    champ?.focus({ preventScroll: true });
    champ?.select();
  };
  const rejoue = () => {
    horloge.remet();
    setEssai(null);
  };

  const lance = (e: FormEvent) => {
    e.preventDefault();
    if (horloge.phase === "marche") return;
    if (!lu.ok) {
      const c = defi.champs.find((x) => x.id === lu.champ)!;
      setErreur(Number.isNaN(saisies[c.id]) ? `${c.nom} : entre un nombre, par exemple ${points((c.min + c.max) / 2)}.` : `${c.nom} : ta valeur sort des bornes. ${bornes(c)}`);
      return;
    }
    const cle = defi.champs.map((c) => saisies[c.id]).join(";");
    if (cle === rate) {
      setErreur("Tu as déjà essayé cette valeur. Refais ton calcul, puis change-la.");
      return;
    }
    setErreur("");
    const numero = (essai?.numero ?? 0) + 1;
    const valeurs = Object.fromEntries(defi.champs.map((c) => [c.id, saisies[c.id]]));
    setEssai({ numero, p: lu.p, issue: R.issue(lu.p), reponse: null, refus: null });
    // le clavier du téléphone se ferme, et la scène revient à l'écran
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    ecran.current?.scrollIntoView({ behavior: doux(), block: "start" });
    horloge.lance(R.duree(lu.p), undefined, R.cadence(lu.p));
    const recu = (suite: Partial<Essai>) => setEssai((avant) => (avant && avant.numero === numero ? { ...avant, ...suite } : avant));
    validerDefi({ defi: defi.id, valeurs }).then((r) => {
      if (!r.ok) { recu({ refus: r.message }); return; }
      recu({ reponse: r.valeur });
      setAvancement({ essais: r.valeur.essais, etoiles: r.valeur.etoiles });
      setRate(r.valeur.reussi ? null : cle);
      // au deuxième essai raté, les relations du cours s'ouvrent
      if (!r.valeur.reussi && r.valeur.essais >= 2) setAide(true);
    }).catch(() => recu({ refus: "Ton essai n'a pas pu être enregistré. Vérifie ta connexion, puis relance." }));
  };

  return (
    <div className="labo"><div className="labo-colonnes">
      <div ref={ecran} className={`labo-ecran${fini && reponse ? (reussi ? " est-reussi" : " est-rate") : ""}`}>
        <div className="labo-barre">
          <span>{theme}</span>
          <span>{reglee ? allure(R.cadence(p)) : "À régler"}</span>
        </div>
        <div className="labo-scene">
          <Scene p={p} t={t} phase={lance_ ? horloge.phase : "pret"} issue={lance_ ? essai.issue : null} inconnues={lance_ ? [] : inconnues} />
        </div>
        <dl className="labo-mesures" style={{ gridTemplateColumns: `repeat(${mesures.length}, minmax(0, 1fr))` }}>
          {mesures.map((m) => <div key={m.nom}><dt><NomMesure nom={m.nom} /></dt><dd>{reglee ? m.valeur : "…"}</dd></div>)}
        </dl>
        <div className={`labo-verdict${fini && reponse ? (reussi ? " labo-verdict-ok" : " labo-verdict-ko") : ""}`} role="status">
          {!lance_ && <p className="labo-attente">Calcule ta valeur, entre-la, puis lance la simulation.</p>}
          {lance_ && !fini && <p className="labo-attente">Simulation en cours.</p>}
          {fini && !reponse && !essai.refus && <p className="labo-attente">Vérification de ton essai.</p>}
          {fini && essai.refus && <p>{essai.issue.message} <span className="labo-refus">{essai.refus}</span></p>}
          {fini && reponse && (
            <>
              <span className="labo-pastille" aria-hidden="true"><Icone nom={reussi ? "ok" : "croix"} /></span>
              <p><b>{reussi ? "Réussi." : "Raté."}</b> {reponse.message}</p>
              {!reussi && <button type="button" className="btn-texte" onClick={corrige}>Corriger</button>}
            </>
          )}
        </div>
      </div>

      <div className="labo-cote">
        {fini && reponse && reussi && (
          <section className="carte fete labo-reussite" aria-label="Défi réussi">
            <Confettis key={essai.numero} />
            <Etoiles gagnees={reponse.etoiles ?? 0} grandes />
            <h2>Défi réussi</h2>
            <p>{reponse.deja ? "Tu avais déjà réussi ce défi : tes étoiles ne changent pas."
              : reponse.essais === 1 ? "Du premier coup : ton calcul était juste. Trois étoiles."
              : `Réussi au ${rangEssai(reponse.essais)}. ${reponse.etoiles === 2 ? "Deux étoiles." : "Une étoile."}`}</p>
            <div className="actions">
              {suivant ? <Link className="btn btn-cuivre" href={suivant.href}>Défi suivant</Link> : <Link className="btn btn-cuivre" href={retour}>Retour aux défis</Link>}
              <button type="button" className="btn btn-ligne" onClick={rejoue}>Rejouer</button>
            </div>
          </section>
        )}

        <section className="carte labo-mission" aria-labelledby={`${id}-mission`}>
          <h2 id={`${id}-mission`}>Ta mission</h2>
          <p><AvecIndices texte={defi.enonce} /></p>
          <dl className="labo-donnees">
            {defi.donnees.map((d) => <div key={d.nom}><dt><AvecIndices texte={d.nom} /></dt><dd>{d.valeur}</dd></div>)}
          </dl>
          {relations.length > 0 && (
            <>
              <button type="button" className="btn-texte labo-aide" aria-expanded={aide} aria-controls={`${id}-relations`} onClick={() => setAide((a) => !a)}>
                <Icone nom="ampoule" /> {aide ? "Masquer les relations du cours" : "Voir les relations du cours"}
              </button>
              <ul id={`${id}-relations`} className="labo-relations" hidden={!aide}>
                {relations.map((r) => (
                  <li key={r.notion}>
                    <b><ContenuHtml html={r.notion} /></b>
                    <ContenuHtml bloc className="labo-formule" html={r.relation} />
                    <ContenuHtml bloc className="petit discret" html={r.retenir} />
                  </li>
                ))}
                <li className="labo-cours"><Link href={cours}>Revoir tout le cours</Link></li>
              </ul>
            </>
          )}
        </section>

        <form ref={console_} className="carte labo-console" onSubmit={lance} noValidate>
          {defi.champs.map((c) => (
            <div key={c.id} className="labo-champ">
              <label htmlFor={`${id}-${c.id}`}>{c.nom}</label>
              <div className="labo-saisie">
                <input id={`${id}-${c.id}`} name={c.id} type="text" inputMode="decimal" autoComplete="off" enterKeyHint="go" placeholder="Ta valeur"
                  value={textes[c.id] ?? ""} onChange={(e) => change(c.id, e.target.value)} aria-describedby={`${id}-${c.id}-aide`} aria-invalid={erreur ? true : undefined} />
                <span>{c.unite}</span>
              </div>
              <p className="aide" id={`${id}-${c.id}-aide`}>{bornes(c)}</p>
            </div>
          ))}
          {erreur && <p role="alert" className="labo-erreur">{erreur}</p>}
          <button type="submit" className="btn btn-cuivre btn-plein labo-lancer" disabled={horloge.phase === "marche"}>
            <Icone nom="lecture" /> {horloge.phase === "marche" ? "Simulation en cours" : fini && !reussi ? "Relancer la simulation" : "Lancer la simulation"}
          </button>
          <p className="petit discret labo-regle">
            {avancement.etoiles !== null ? <>Défi déjà réussi : <Etoiles gagnees={avancement.etoiles} />. Tu peux le rejouer, tes étoiles ne changent pas.</>
              : <>{avancement.essais === 0 ? "Premier essai" : `Essai n° ${avancement.essais + 1}`}. Trois étoiles au premier essai, deux jusqu&apos;au troisième, une ensuite.</>}
          </p>
        </form>
      </div>
    </div></div>
  );
}
