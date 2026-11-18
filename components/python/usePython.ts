"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_PYODIDE, type ResultatPython, type TestPython } from "@/lib/commun/python/types";

// Le Python de la page (décision 0016) : un « worker » (public/python/atelier.mjs) qui charge Pyodide une fois et
// exécute les programmes à part de la page. Un programme qui tourne trop longtemps (une boucle sans fin) est arrêté
// net : le worker est remplacé par un neuf, qui recharge Python depuis le cache du navigateur.

export type EtatPython = "chargement" | "pret" | "occupe" | "echec";
export interface Ligne { texte: string; erreur: boolean }
export type Issue = { genre: "fini"; resultat: ResultatPython } | { genre: "trop-long" } | { genre: "indisponible" };

/** Au-delà, un programme est arrêté : au bac, aucun calcul ne demande plus de quelques secondes. */
export const DUREE_MAX = 10_000;
const MAX_LIGNES = 2000;

interface Attente { id: number; resoudre: (i: Issue) => void; minuteur: ReturnType<typeof setTimeout> }

export function usePython() {
  const worker = useRef<Worker | null>(null);
  const attente = useRef<Attente | null>(null);
  const compteur = useRef(0);
  const tampon = useRef<Ligne[]>([]);
  const vidange = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [etat, setEtatAffiche] = useState<EtatPython>("chargement");
  const etatLu = useRef<EtatPython>("chargement");
  const [lignes, setLignes] = useState<Ligne[]>([]);
  // vrai entre l'arrêt d'un programme trop long et le retour d'un Python neuf
  const [redemarrage, setRedemarrage] = useState(false);
  const setEtat = useCallback((e: EtatPython) => {
    etatLu.current = e;
    setEtatAffiche(e);
  }, []);

  // les lignes affichées arrivent par paquets : on les montre au plus toutes les 60 ms
  const vide = useCallback(() => {
    vidange.current = null;
    const paquet = tampon.current;
    tampon.current = [];
    if (paquet.length) setLignes((avant) => [...avant, ...paquet].slice(0, MAX_LIGNES + 1));
  }, []);

  const demarre = useCallback(() => {
    const w = new Worker("/python/atelier.mjs", { type: "module" });
    w.onmessage = (ev: MessageEvent) => {
      const m = ev.data as { type: string; id?: number; texte?: string; erreur?: boolean; resultat?: ResultatPython };
      if (w !== worker.current) return;
      if (m.type === "pret") {
        setEtat("pret");
        setRedemarrage(false);
      }
      else if (m.type === "echec") setEtat("echec");
      else if (m.type === "sortie" && attente.current?.id === m.id) {
        tampon.current.push({ texte: m.texte ?? "", erreur: Boolean(m.erreur) });
        vidange.current ??= setTimeout(vide, 60);
      } else if (m.type === "fin" && attente.current && attente.current.id === m.id && m.resultat) {
        const a: Attente = attente.current;
        attente.current = null;
        clearTimeout(a.minuteur);
        vide();
        setEtat("pret");
        a.resoudre({ genre: "fini", resultat: m.resultat });
      }
    };
    w.onerror = () => {
      if (w === worker.current) setEtat("echec");
    };
    worker.current = w;
    w.postMessage({ type: "init", base: BASE_PYODIDE });
  }, [setEtat, vide]);

  useEffect(() => {
    demarre();
    return () => {
      worker.current?.terminate();
      worker.current = null;
      if (vidange.current) clearTimeout(vidange.current);
    };
  }, [demarre]);

  /** Lance un programme ; « verifier » lance ensuite les vérifications de l'exercice. Python doit être prêt. */
  const executer = useCallback((code: string, tests: readonly TestPython[], mode: "lancer" | "verifier"): Promise<Issue> => {
    const w = worker.current;
    if (!w || attente.current || etatLu.current !== "pret") return Promise.resolve({ genre: "indisponible" });
    compteur.current += 1;
    const id = compteur.current;
    tampon.current = [];
    setLignes([]);
    setEtat("occupe");
    return new Promise<Issue>((resoudre) => {
      const minuteur = setTimeout(() => {
        // une boucle sans fin : on arrête tout et on repart d'un Python neuf
        if (attente.current?.id !== id) return;
        attente.current = null;
        w.terminate();
        vide();
        setEtat("chargement");
        setRedemarrage(true);
        demarre();
        resoudre({ genre: "trop-long" });
      }, DUREE_MAX);
      attente.current = { id, resoudre, minuteur };
      w.postMessage({ type: "executer", id, code, tests, mode });
    });
  }, [demarre, setEtat, vide]);

  /** Après un échec de chargement (réseau coupé, par exemple) : un Python neuf. */
  const relance = useCallback(() => {
    worker.current?.terminate();
    attente.current = null;
    setEtat("chargement");
    demarre();
  }, [demarre, setEtat]);

  const efface = useCallback(() => setLignes([]), []);

  return { etat, redemarrage, lignes, executer, efface, relance };
}
