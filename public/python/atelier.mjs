// L'atelier Python du hub (décision 0016) : un « worker » qui charge Python (Pyodide, servi par l'application) une fois,
// puis exécute les programmes des élèves à part de la page. La page peut l'arrêter net si un programme tourne sans fin.
//
// Messages reçus : { type: "init", base } puis { type: "executer", id, code, tests, mode }.
// Messages envoyés : { type: "pret" }, { type: "echec", message }, { type: "sortie", id, texte, erreur },
// { type: "fin", id, resultat }.
//
// La cage. Avec le module « js » de Pyodide, un programme d'élève atteint tout ce que le worker atteint. Un programme
// copié chez un autre ne doit rien pouvoir faire avec la session de celui qui le lance : avant de charger Python, le
// worker perd tout ce qui sort sur le réseau, et fetch ne lit plus que les fichiers de Python, sans cookies.
// La politique de sécurité de ce fichier (next.config.ts) ferme en plus eval, les autres sites et les workers.

const fetchReel = self.fetch.bind(self);
let prefixe = null;

function refuse() {
  return Promise.reject(new TypeError("Le hub Python n'a pas accès au réseau."));
}

/** fetch, réduit aux fichiers de Python de cette version : lecture seule, même origine, sans cookies. */
function fetchDePython(entree, options = {}) {
  let url;
  try {
    url = new URL(entree instanceof Request ? entree.url : String(entree), self.location.href);
  } catch {
    return refuse();
  }
  const methode = String(options.method ?? (entree instanceof Request ? entree.method : "GET")).toUpperCase();
  if (!prefixe || url.origin !== self.location.origin || !url.pathname.startsWith(prefixe) || methode !== "GET") return refuse();
  return fetchReel(url.href, {
    method: "GET", credentials: "omit", redirect: "error", referrerPolicy: "no-referrer",
    ...(typeof options.integrity === "string" ? { integrity: options.integrity } : {}),
  });
}

/** Retire une fonction du worker, où qu'elle soit rangée : sur le worker lui-même ou sur un de ses prototypes. */
function retire(objet, nom) {
  for (let o = objet; o; o = Object.getPrototypeOf(o)) {
    if (!Object.prototype.hasOwnProperty.call(o, nom)) continue;
    try { delete o[nom]; } catch { /* une propriété figée : elle est masquée juste après */ }
  }
  if (nom in objet) {
    try { Object.defineProperty(objet, nom, { value: undefined, writable: false, configurable: false }); } catch { /* rien de plus à faire */ }
  }
}

function enferme() {
  for (const nom of ["XMLHttpRequest", "WebSocket", "WebSocketStream", "EventSource", "WebTransport", "Worker", "SharedWorker",
    "BroadcastChannel", "caches", "indexedDB", "importScripts"]) retire(self, nom);
  if (self.navigator) for (const nom of ["serviceWorker", "sendBeacon"]) retire(self.navigator, nom);
  Object.defineProperty(self, "fetch", { value: fetchDePython, writable: false, configurable: false });
}

let pyodide = null;
let pret = null;
let enCours = null;
const MAX_LIGNES = 2000;
const MAX_CARACTERES = 5000;
let lignes = 0;

function charge(base) {
  pret ??= (async () => {
    // seul le dossier de cette version de Pyodide, servi par l'application, peut être lu
    if (typeof base !== "string" || !/^\/pyodide\/[0-9.]+\/$/.test(base)) throw new Error("Adresse de Python invalide.");
    prefixe = base;
    enferme();
    const { executer, prepare } = await import("./banc.mjs");
    const { loadPyodide } = await import(`${base}pyodide.mjs`);
    pyodide = await loadPyodide({ indexURL: base });
    const sortie = (erreur) => (texte) => {
      lignes += 1;
      if (lignes === MAX_LIGNES + 1) self.postMessage({ type: "sortie", id: enCours, texte: "… la suite de l'affichage est coupée (plus de 2 000 lignes) : affiche moins de valeurs.", erreur: true });
      if (lignes > MAX_LIGNES) return;
      self.postMessage({ type: "sortie", id: enCours, texte: texte.length > MAX_CARACTERES ? `${texte.slice(0, MAX_CARACTERES)} …` : texte, erreur });
    };
    pyodide.setStdout({ batched: sortie(false) });
    pyodide.setStderr({ batched: sortie(true) });
    // input() : pas de clavier pendant l'exécution, Python lève alors une erreur expliquée en français
    pyodide.setStdin({ stdin: () => null });
    await prepare(pyodide);
    return executer;
  })();
  return pret;
}

self.addEventListener("message", async (evenement) => {
  const m = evenement.data;
  if (m.type === "init") {
    try {
      await charge(m.base);
      self.postMessage({ type: "pret" });
    } catch (e) {
      self.postMessage({ type: "echec", message: e instanceof Error ? e.message : String(e) });
    }
    return;
  }
  if (m.type === "executer") {
    try {
      const executer = await pret;
      enCours = m.id;
      lignes = 0;
      const resultat = await executer(pyodide, { code: m.code, tests: m.tests ?? [], mode: m.mode });
      self.postMessage({ type: "fin", id: m.id, resultat });
    } catch (e) {
      self.postMessage({ type: "fin", id: m.id, resultat: { ok: false, erreur: { type: "Erreur", message: e instanceof Error ? e.message : String(e), ligne: null, texte: null, explication: "Le hub n'a pas pu lancer ton programme. Recharge la page, puis relance-le." }, figures: [], tests: [] } });
    } finally {
      enCours = null;
    }
  }
});
