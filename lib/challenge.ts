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
    const c = JSON.parse(json);
    return {
      seed: c.s,
      name: c.n,
      score: c.p,
      grade: c.g,
      mode: c.m,
      subject: c.j,
      chapter: c.c,
    };
  } catch {
    return null;
  }
}

export function generateSeed(): number {
  return Math.floor(Math.random() * 2147483647) + 1;
}
