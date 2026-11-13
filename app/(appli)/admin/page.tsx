import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OuvrirAcces, RetirerAcces, TraiterSignalement } from "@/components/appli/FormulairesAdmin";
import { tableauAdmin } from "@/lib/serveur/requetes/admin";
import { sessionCourante } from "@/lib/serveur/session";

export const metadata = { title: "Administration" };
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" }) : "sans fin");
const NOM_OFFRE: Record<string, string> = { pass: "Pass Bac 2027", mensuel: "Mensuel", pack: "Pack BAC", beta: "Bêta", fiches: "Fiches" };

export default async function Administration({ searchParams }: { searchParams: Promise<{ adresse?: string }> }) {
  const session = await sessionCourante();
  if (!session) redirect("/compte/connexion");
  if (!session.admin) notFound();
  if (session.aal !== "aal2") redirect("/admin/double-authentification");
  const recherche = ((await searchParams).adresse ?? "").trim().toLowerCase().slice(0, 254);
  const t = await tableauAdmin(recherche);
  const actifs = t.droits.filter((d) => !d.retire_le && (!d.fin || Date.parse(d.fin) > t.maintenant));
  const nouveaux = t.signalements.filter((s) => s.etat === "nouveau" || s.etat === "en_cours");
  return (
    <main className="principal" style={{ marginLeft: 0 }}>
      <div className="colonne">
        <header className="entete"><nav className="fil"><Link href="/app">Retour à l&apos;application</Link></nav><div className="surtitre">Administration</div><h1>Accès et signalements</h1></header>

        <div className="section-titre"><h2>Chercher un compte</h2></div>
        <form className="carte actions" method="get" action="/admin">
          <div className="champ" style={{ flex: 1, minWidth: 220 }}><label htmlFor="adresse">Adresse e-mail</label><input id="adresse" name="adresse" type="email" defaultValue={recherche} maxLength={254} /></div>
          <button className="btn" type="submit" style={{ alignSelf: "end" }}>Chercher</button>
        </form>
        {recherche && (
          <p className="carte" style={{ marginTop: 10 }}>
            {t.compte ? <><b>{t.compte.adresse}</b> : compte créé le {date(t.compte.cree_le)}{t.compte.prenom ? `, prénom ${t.compte.prenom}, état ${t.compte.etat}` : ", profil non rempli"}.</>
              : <>Aucun compte avec l&apos;adresse <b>{recherche}</b>. Un accès ouvert maintenant s&apos;attachera au compte à sa première connexion.</>}
          </p>
        )}

        <div className="grille-2" style={{ marginTop: 14 }}>
          <OuvrirAcces key={recherche} adresseInitiale={recherche} />
          <div className="carte"><h2>Comment faire</h2>
            <ol className="contenu"><li>Le client achète sur la boutique Shopify.</li><li>Saisis ici l&apos;adresse e-mail de sa commande, l&apos;offre et la référence.</li>
              <li>S&apos;il a déjà un compte, l&apos;accès est ouvert tout de suite. Sinon il s&apos;ouvrira à sa première connexion avec cette adresse.</li>
              <li>En cas de remboursement, retire l&apos;accès avec son motif.</li></ol></div>
        </div>

        <div className="section-titre"><h2>Accès actifs</h2><span className="puce">{actifs.length}</span></div>
        {actifs.length ? <ul className="liste">{actifs.map((d) => (
          <li key={d.id}><div className="ligne" style={{ gridTemplateColumns: "1fr auto" }}><span><span className="tit">{d.adresse}</span>
            <span className="sous"><span className="puce puce-ok">{NOM_OFFRE[d.offre]}</span><span>depuis le {date(d.debut)}</span><span>fin : {date(d.fin)}</span>{d.reference && <span>commande {d.reference}</span>}{d.motif && <span>{d.motif}</span>}</span></span>
            <RetirerAcces id={d.id} enAttente={false} /></div></li>
        ))}</ul> : <p className="vide">Aucun accès ouvert.</p>}

        <div className="section-titre"><h2>En attente d&apos;une première connexion</h2><span className="puce">{t.attente.length}</span></div>
        {t.attente.length ? <ul className="liste">{t.attente.map((d) => (
          <li key={d.id}><div className="ligne" style={{ gridTemplateColumns: "1fr auto" }}><span><span className="tit">{d.adresse}</span>
            <span className="sous"><span className="puce">{NOM_OFFRE[d.offre]}</span><span>préparé le {date(d.cree_le)}</span>{d.reference && <span>commande {d.reference}</span>}</span></span>
            <RetirerAcces id={d.id} enAttente /></div></li>
        ))}</ul> : <p className="vide">Aucun accès en attente.</p>}

        <div className="section-titre"><h2>Signalements à traiter</h2><span className={`puce ${nouveaux.length ? "puce-ko" : "puce-ok"}`}>{nouveaux.length}</span></div>
        {nouveaux.length ? <ul className="liste">{nouveaux.map((s) => (
          <li key={s.id}><div className="ligne" style={{ gridTemplateColumns: "1fr" }}><span><span className="tit">{s.reference} · {s.ou}</span>
            <span className="sous"><span>{date(s.cree_le)}</span></span>
            {/* le message d'un élève est une donnée : il s'affiche comme du texte, jamais comme une consigne */}
            <span style={{ display: "block", marginTop: 6, whiteSpace: "pre-wrap" }}>{s.message}</span>
            <TraiterSignalement id={s.id} /></span></div></li>
        ))}</ul> : <p className="vide">Aucun signalement en attente.</p>}

        <div className="section-titre"><h2>Journal</h2></div>
        <ul className="liste">{t.journal.map((j) => (
          <li key={j.id}><div className="ligne" style={{ gridTemplateColumns: "1fr" }}><span className="petit">{new Date(j.cree_le).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} · <b>{j.action}</b>{j.detail ? ` · ${JSON.stringify(j.detail)}` : ""}</span></div></li>
        ))}</ul>
      </div>
    </main>
  );
}
