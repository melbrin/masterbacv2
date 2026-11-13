"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ouvrirAcces, repondreSignalement, retirerAcces } from "@/lib/serveur/commandes/admin";

const OFFRES = [["pass", "Pass Bac 2027"], ["mensuel", "Mensuel"], ["pack", "Pack BAC"], ["fiches", "Fiches (corrigés seulement)"], ["beta", "Bêta"]] as const;

export function OuvrirAcces({ adresseInitiale }: { adresseInitiale: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [enCours, lance] = useTransition();
  return (
    <form className="carte" noValidate onSubmit={(e) => {
      e.preventDefault();
      const formulaire = e.currentTarget;
      const d = new FormData(formulaire);
      lance(async () => {
        const r = await ouvrirAcces({
          adresse: String(d.get("adresse") ?? ""), offre: d.get("offre") as "pass", fin: String(d.get("fin") ?? "") || null,
          reference: String(d.get("reference") ?? ""), motif: String(d.get("motif") ?? ""),
        });
        if (!r.ok) { setMessage(r.message); return; }
        setMessage(r.valeur.etat === "ouvert" ? "Accès ouvert sur le compte." : "Aucun compte avec cette adresse : l'accès s'ouvrira à sa première connexion.");
        formulaire.reset();
        router.refresh();
      });
    }}>
      <h2>Ouvrir un accès</h2>
      <div className="champ"><label htmlFor="a-adresse">Adresse e-mail de la commande</label><input id="a-adresse" name="adresse" type="email" required maxLength={254} defaultValue={adresseInitiale} /></div>
      <div className="champ"><label htmlFor="a-offre">Offre</label><select id="a-offre" name="offre">{OFFRES.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></div>
      <div className="champ"><label htmlFor="a-fin">Fin de l&apos;accès (vide : sans fin)</label><input id="a-fin" name="fin" type="date" /></div>
      <div className="champ"><label htmlFor="a-ref">Référence de la commande Shopify</label><input id="a-ref" name="reference" maxLength={80} placeholder="#1234" /></div>
      <div className="champ"><label htmlFor="a-motif">Note</label><input id="a-motif" name="motif" maxLength={300} /></div>
      <p role="status" className="petit" style={{ minHeight: "1.5em" }}>{message}</p>
      <div className="actions"><button className="btn btn-cuivre" type="submit" disabled={enCours}>Ouvrir l&apos;accès</button></div>
    </form>
  );
}

export function RetirerAcces({ id, enAttente }: { id: string; enAttente: boolean }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState("");
  const [message, setMessage] = useState("");
  const [enCours, lance] = useTransition();
  if (!ouvert) return <button className="btn-texte" type="button" onClick={() => setOuvert(true)}>{enAttente ? "Annuler" : "Retirer"}</button>;
  return (
    <span style={{ display: "grid", gap: 6 }}>
      <input aria-label="Motif" placeholder="Motif (remboursement, erreur…)" maxLength={300} value={motif} onChange={(e) => setMotif(e.target.value)} />
      <span className="actions">
        <button className="btn" type="button" disabled={enCours || motif.trim().length < 3} onClick={() => lance(async () => {
          const r = await retirerAcces({ id, enAttente, motif });
          if (r.ok) router.refresh(); else setMessage(r.message);
        })}>Confirmer</button>
        <button className="btn-texte" type="button" onClick={() => setOuvert(false)}>Garder</button>
      </span>
      {message && <span role="alert" className="petit">{message}</span>}
    </span>
  );
}

export function TraiterSignalement({ id }: { id: string }) {
  const router = useRouter();
  const [reponse, setReponse] = useState("");
  const [enCours, lance] = useTransition();
  const envoie = (etat: "traite" | "refuse") => lance(async () => { const r = await repondreSignalement({ id, etat, reponse }); if (r.ok) router.refresh(); });
  return (
    <span style={{ display: "grid", gap: 6, marginTop: 6 }}>
      <input aria-label="Réponse à l'élève" placeholder="Réponse à l'élève (facultative)" maxLength={1000} value={reponse} onChange={(e) => setReponse(e.target.value)} />
      <span className="actions"><button className="btn" type="button" disabled={enCours} onClick={() => envoie("traite")}>Corrigé</button><button className="btn-texte" type="button" disabled={enCours} onClick={() => envoie("refuse")}>Pas une erreur</button></span>
    </span>
  );
}
