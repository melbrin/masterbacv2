import "server-only";
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { env } from "@/lib/serveur/env";
import { sessionCourante, type Session } from "@/lib/serveur/session";
import { clientAdmin } from "@/lib/serveur/supabase/clients";

// Tout point d'entrée du serveur se déclare ici, avec son accès (docs/02-architecture.md, section 5).
export type Acces = "public" | "compte" | "eleve" | "admin";

export type Resultat<T> = { ok: true; valeur: T } | { ok: false; code: CodeErreur; message: string; suivi: string };
export type CodeErreur = "non_connecte" | "interdit" | "invalide" | "trop_de_demandes" | "reserve" | "introuvable" | "erreur";

const MESSAGES: Record<CodeErreur, string> = {
  non_connecte: "Ta session a expiré. Reconnecte-toi pour continuer.",
  interdit: "Cette action ne t'est pas ouverte.",
  invalide: "Ce que tu as saisi n'est pas valide. Vérifie et recommence.",
  trop_de_demandes: "Trop de demandes en peu de temps. Attends un instant avant de recommencer.",
  reserve: "Ce contenu fait partie du Pass.",
  introuvable: "Cet élément n'existe pas ou n'existe plus.",
  erreur: "Quelque chose s'est mal passé de notre côté. Réessaie dans un instant.",
};

/** Une erreur prévue : son code part vers le navigateur, avec un message en français et rien de technique. */
export class Refus extends Error {
  constructor(public code: CodeErreur, public texte?: string) {
    super(code);
  }
}

export interface Limite {
  /** nombre d'appels permis par fenêtre */
  max: number;
  /** durée de la fenêtre, en secondes */
  secondes: number;
}

interface Declaration<S extends z.ZodType, R> {
  nom: string;
  acces: Acces;
  entree: S;
  limite?: Limite;
  executer: (entree: z.infer<S>, session: Session | null) => Promise<R>;
}

/** Le registre des points d'entrée : les tests de sécurité le parcourent. */
export const REGISTRE = new Map<string, { nom: string; acces: Acces; genre: "action" | "requete" }>();

async function origineValide(): Promise<boolean> {
  const h = await headers();
  const origine = h.get("origin");
  if (!origine) return false;
  const hote = h.get("x-forwarded-host") ?? h.get("host");
  try {
    const o = new URL(origine);
    return o.host === hote || origine === new URL(env().APP_URL).origin;
  } catch {
    return false;
  }
}

export async function verifieAcces(acces: Acces): Promise<Session | null> {
  const session = await sessionCourante();
  if (acces === "public") return session;
  if (!session) throw new Refus("non_connecte");
  if (acces === "admin" && !(session.admin && session.aal === "aal2")) throw new Refus("interdit");
  return session;
}

async function sousLaLimite(nom: string, limite: Limite, session: Session | null): Promise<boolean> {
  const h = await headers();
  const qui = session?.userId ?? `ip:${(h.get("x-forwarded-for") ?? "locale").split(",")[0].trim()}`;
  const { data, error } = await clientAdmin().rpc("limite_consomme", { p_cle: `${nom}:${qui}`, p_max: limite.max, p_secondes: limite.secondes });
  return !error && data === true;
}

/**
 * Fabrique une action serveur. Elle impose, dans l'ordre : l'origine de la requête, la session et le rôle,
 * la forme de l'entrée, la limite de débit. Les erreurs sortent sans détail technique.
 */
export function action<S extends z.ZodType, R>(d: Declaration<S, R>): (donnees: z.input<S>) => Promise<Resultat<R>> {
  REGISTRE.set(d.nom, { nom: d.nom, acces: d.acces, genre: "action" });
  return async (donnees) => {
    const suivi = randomUUID().slice(0, 8);
    const refus = (code: CodeErreur, texte?: string): Resultat<R> => ({ ok: false, code, message: texte ?? MESSAGES[code], suivi });
    try {
      if (!(await origineValide())) return refus("interdit");
      const session = await verifieAcces(d.acces);
      const lu = d.entree.safeParse(donnees);
      if (!lu.success) return refus("invalide");
      if (d.limite && !(await sousLaLimite(d.nom, d.limite, session))) return refus("trop_de_demandes");
      return { ok: true, valeur: await d.executer(lu.data, session) };
    } catch (e) {
      if (e instanceof Refus) return refus(e.code, e.texte);
      // les redirections de Next.js passent par une exception : on les laisse filer
      if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) throw e;
      console.error(JSON.stringify({ niveau: "erreur", action: d.nom, suivi, nature: e instanceof Error ? e.name : "inconnue", message: e instanceof Error ? e.message.slice(0, 300) : "" }));
      return refus("erreur");
    }
  };
}

/** Fabrique une lecture appelée par une page : la session se vérifie ici, jamais dans une mise en page. */
export function requete<A extends unknown[], R>(d: { nom: string; acces: Exclude<Acces, "public"> }, lire: (session: Session, ...args: A) => Promise<R>): (...args: A) => Promise<R> {
  REGISTRE.set(d.nom, { nom: d.nom, acces: d.acces, genre: "requete" });
  return async (...args) => {
    const session = await verifieAcces(d.acces);
    return lire(session as Session, ...args);
  };
}
