import { z } from "zod";

export const MODES = ["diagnostic", "chapitre", "express", "bac_blanc"] as const;
export const MATIERES = ["maths", "physique"] as const;

// Un lien de défi vient de l'extérieur : chaque champ est borné avant d'être utilisé.
const schemaDefi = z.object({
  s: z.number().int().min(1).max(2147483647),
  n: z.string().trim().min(1).max(24).regex(/^[\p{L}\p{N} '\u2019.-]+$/u),
  p: z.number().min(0).max(100),
  g: z.number().min(0).max(20),
  m: z.enum(MODES),
  j: z.enum(MATIERES),
  c: z.string().max(40).regex(/^[a-z0-9_-]+$/i).optional(),
});

export interface ChallengeData {
  seed: number;
  name: string;
  score: number;   // readiness %
  grade: number;   // grade /20
  mode: string;
  subject: string;
  chapter?: string;
}

export function encodeChallenge(data: ChallengeData): string {
  const compact = {
    s: data.seed,
    n: data.name,
    p: data.score,
    g: data.grade,
    m: data.mode,
    j: data.subject,
    ...(data.chapter ? { c: data.chapter } : {}),
  };
  const json = JSON.stringify(compact);
  // Handle UTF-8 (accented names) before base64
  const b64 = btoa(unescape(encodeURIComponent(json)));
  // Make URL-safe
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeChallenge(encoded: string): ChallengeData | null {
  try {
    let b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const json = decodeURIComponent(escape(atob(b64)));
    const lu = schemaDefi.safeParse(JSON.parse(json));
    if (!lu.success) return null;
    const c = lu.data;
    return { seed: c.s, name: c.n, score: c.p, grade: c.g, mode: c.m, subject: c.j, chapter: c.c };
  } catch {
    return null;
  }
}

export function generateSeed(): number {
  return Math.floor(Math.random() * 2147483647) + 1;
}
