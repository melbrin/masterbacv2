"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { inscrireFacteur, verifierFacteur } from "@/lib/serveur/commandes/admin";

export default function DoubleAuthentification() {
  const router = useRouter();
  const [facteur, setFacteur] = useState<{ id: string; qr?: string; secret?: string } | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [enCours, lance] = useTransition();
  const prepare = () => lance(async () => {
    const r = await inscrireFacteur({});
    if (!r.ok) { setMessage(r.message); return; }
    setFacteur(r.valeur.dejaInscrit ? { id: r.valeur.facteur } : { id: r.valeur.facteur, qr: r.valeur.qr, secret: r.valeur.secret });
  });
  const verifie = (e: React.FormEvent) => {
    e.preventDefault();
    if (!facteur) return;
    lance(async () => {
      const r = await verifierFacteur({ facteur: facteur.id, code });
      if (r.ok) router.replace(r.valeur.suite); else setMessage(r.message);
    });
  };
  if (!facteur) {
    return <div className="actions"><button className="btn btn-cuivre" type="button" disabled={enCours} onClick={prepare}>Continuer</button><span role="alert" className="petit" style={{ color: "var(--brique)" }}>{message}</span></div>;
  }
  return (
    <form onSubmit={verifie} noValidate>
      {facteur.qr && (
        <>
          <p>Ouvre ton application d&apos;authentification et scanne ce code. Il ne s&apos;affiche qu&apos;une fois.</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- image produite par le service d'authentification, sans adresse externe */}
          <img src={facteur.qr} alt="Code à scanner avec ton application d'authentification" width={200} height={200} style={{ background: "#fff", borderRadius: 8 }} />
          <p className="petit discret">Si tu ne peux pas scanner, saisis cette clé à la main : <code>{facteur.secret}</code></p>
        </>
      )}
      <div className="champ"><label htmlFor="totp">Le code à six chiffres de ton application</label>
        <input id="totp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} style={{ letterSpacing: ".4em", fontSize: "1.3rem", maxWidth: 220 }} /></div>
      <p role="alert" className="petit" style={{ color: "var(--brique)", minHeight: "1.5em" }}>{message}</p>
      <div className="actions"><button className="btn btn-cuivre" type="submit" disabled={enCours || code.length !== 6}>Valider</button></div>
    </form>
  );
}
