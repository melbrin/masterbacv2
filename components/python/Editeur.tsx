"use client";

import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentMore, indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { HighlightStyle, bracketMatching, indentOnInput, indentUnit, syntaxHighlighting } from "@codemirror/language";
import { EditorState, RangeSet, StateEffect, StateField } from "@codemirror/state";
import { Decoration, EditorView, GutterMarker, drawSelection, gutterLineClass, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { useEffect, useId, useImperativeHandle, useRef } from "react";

// L'éditeur du hub Python (décision 0016) : CodeMirror, réglé pour le Python du bac. Quatre espaces par niveau,
// les parenthèses qui se ferment seules, les numéros de ligne que les messages d'erreur citent. Sous l'éditeur, une
// rangée de touches pour les symboles que le clavier d'un téléphone cache derrière deux ou trois pages.

export interface PoigneeEditeur {
  contenu: () => string;
  remplace: (code: string) => void;
  /** marque la ligne d'une erreur ; elle s'efface dès que l'élève modifie son programme */
  marque: (ligne: number | null) => void;
}

// la ligne d'une erreur : surlignée dans le texte, et son numéro mis en évidence dans la marge
const marquer = StateEffect.define<number | null>();
const marqueDeMarge = new (class extends GutterMarker { elementClass = "py-marge-erreur"; })();
const ligneErreur = StateField.define<number | null>({
  create: () => null,
  update(ligne, tr) {
    let suite = tr.docChanged ? null : ligne;
    for (const e of tr.effects) if (e.is(marquer)) suite = e.value;
    return suite !== null && suite >= 1 && suite <= tr.state.doc.lines ? suite : null;
  },
  provide: (f) => [
    EditorView.decorations.compute([f], (s) => {
      const n = s.field(f);
      return n === null ? Decoration.none : Decoration.set([Decoration.line({ class: "py-ligne-erreur" }).range(s.doc.line(n).from)]);
    }),
    gutterLineClass.compute([f], (s) => {
      const n = s.field(f);
      return n === null ? RangeSet.empty : RangeSet.of([marqueDeMarge.range(s.doc.line(n).from)]);
    }),
  ],
});

const couleurs = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.definitionKeyword, t.moduleKeyword, t.operatorKeyword], color: "var(--py-mot)", fontWeight: "600" },
  { tag: [t.string, t.special(t.string)], color: "var(--py-chaine)" },
  { tag: [t.number, t.bool, t.null], color: "var(--py-nombre)" },
  { tag: t.comment, color: "var(--discret)", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "var(--py-fonction)" },
  { tag: t.definition(t.function(t.variableName)), color: "var(--py-fonction)", fontWeight: "600" },
]);

const apparence = EditorView.theme({
  "&": { color: "var(--texte)", backgroundColor: "var(--py-fond)" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "var(--mono)", lineHeight: "1.55" },
  ".cm-content": { caretColor: "var(--cuivre)", padding: "10px 0" },
  ".cm-gutters": { backgroundColor: "var(--py-marge)", color: "var(--discret)", border: "none" },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 8px 0 10px", minWidth: "30px" },
  ".cm-activeLine": { backgroundColor: "var(--py-active)" },
  ".cm-activeLineGutter": { backgroundColor: "var(--py-active)", color: "var(--encre)" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--cuivre)", borderLeftWidth: "2px" },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground": { backgroundColor: "var(--py-selection)" },
  ".cm-matchingBracket": { backgroundColor: "var(--py-paire)", outline: "none" },
});

// les touches de la rangée : ce qu'elles écrivent, et ce qu'elles disent à un lecteur d'écran
const TOUCHES: { texte: string; ecrit: string; nom: string; recul?: number }[] = [
  { texte: "⇥", ecrit: "\t", nom: "Décaler la ligne" },
  { texte: ":", ecrit: ":", nom: "deux-points" },
  { texte: "( )", ecrit: "()", nom: "parenthèses", recul: 1 },
  { texte: "[ ]", ecrit: "[]", nom: "crochets", recul: 1 },
  { texte: "=", ecrit: "=", nom: "égal" },
  { texte: "+", ecrit: "+", nom: "plus" },
  { texte: "-", ecrit: "-", nom: "moins" },
  { texte: "*", ecrit: "*", nom: "fois" },
  { texte: "/", ecrit: "/", nom: "divisé par" },
  { texte: "**", ecrit: "**", nom: "puissance" },
  { texte: "<", ecrit: "<", nom: "inférieur" },
  { texte: ">", ecrit: ">", nom: "supérieur" },
  { texte: "\"", ecrit: "\"\"", nom: "guillemets", recul: 1 },
  { texte: ",", ecrit: ",", nom: "virgule" },
  { texte: ".", ecrit: ".", nom: "point" },
  { texte: "_", ecrit: "_", nom: "tiret bas" },
  { texte: "#", ecrit: "# ", nom: "commentaire" },
];

export default function Editeur({ initial, lisInitial, etiquette, onLancer, onChange, ref }: {
  initial: string;
  /** lu une fois, à la création de l'éditeur, dans le navigateur : le programme gardé sur l'appareil, par exemple */
  lisInitial?: () => string;
  etiquette: string;
  /** Ctrl + Entrée, ou Cmd + Entrée */
  onLancer?: () => void;
  onChange?: (code: string) => void;
  ref?: React.Ref<PoigneeEditeur>;
}) {
  const hote = useRef<HTMLDivElement>(null);
  const vue = useRef<EditorView | null>(null);
  const aide = `py-aide-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const rappels = useRef({ onLancer, onChange, lisInitial });
  useEffect(() => {
    rappels.current = { onLancer, onChange, lisInitial };
  });

  useEffect(() => {
    if (!hote.current) return;
    const v = new EditorView({
      parent: hote.current,
      state: EditorState.create({
        doc: rappels.current.lisInitial?.() ?? initial,
        extensions: [
          lineNumbers(), highlightActiveLineGutter(), highlightActiveLine(), drawSelection(), history(),
          indentUnit.of("    "), EditorState.tabSize.of(4), indentOnInput(), bracketMatching(), closeBrackets(),
          // sur un téléphone, une longue ligne revient à la ligne plutôt que de se cacher à droite
          EditorView.lineWrapping, python(), syntaxHighlighting(couleurs), apparence, ligneErreur,
          keymap.of([{ key: "Mod-Enter", run: () => { rappels.current.onLancer?.(); return true; } }, ...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
          EditorView.updateListener.of((u) => { if (u.docChanged) rappels.current.onChange?.(u.state.doc.toString()); }),
          EditorView.contentAttributes.of({ "aria-label": etiquette, "aria-describedby": aide, autocapitalize: "off", autocorrect: "off", spellcheck: "false", translate: "no" }),
        ],
      }),
    });
    vue.current = v;
    return () => {
      v.destroy();
      vue.current = null;
    };
    // l'éditeur se crée une seule fois : `initial` n'est lu qu'à ce moment, la suite passe par la poignée
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    contenu: () => vue.current?.state.doc.toString() ?? initial,
    remplace: (code: string) => {
      const v = vue.current;
      if (v) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: code }, effects: marquer.of(null) });
    },
    marque: (ligne: number | null) => {
      const v = vue.current;
      if (!v) return;
      v.dispatch({ effects: marquer.of(ligne) });
      if (ligne !== null && ligne >= 1 && ligne <= v.state.doc.lines) v.dispatch({ effects: EditorView.scrollIntoView(v.state.doc.line(ligne).from, { y: "center" }) });
    },
  }), [initial]);

  const touche = (k: (typeof TOUCHES)[number]) => {
    const v = vue.current;
    if (!v) return;
    if (k.ecrit === "\t") {
      indentMore(v);
    } else {
      const { from, to } = v.state.selection.main;
      v.dispatch({ changes: { from, to, insert: k.ecrit }, selection: { anchor: from + k.ecrit.length - (k.recul ?? 0) }, scrollIntoView: true, userEvent: "input" });
    }
    v.focus();
  };

  return (
    <div className="py-editeur">
      <p id={aide} className="sr">Dans l&apos;éditeur, la touche Tabulation décale la ligne. Pour en sortir au clavier : Échap, puis Tabulation. Ctrl et Entrée lancent le programme.</p>
      <div className="py-code" ref={hote} />
      <div className="py-touches" role="toolbar" aria-label="Symboles de Python">
        {TOUCHES.map((k) => (
          // la touche ne prend pas le focus : le clavier du téléphone reste ouvert, et la tabulation ne s'y arrête pas
          <button key={k.nom} type="button" tabIndex={-1} aria-label={k.nom} onPointerDown={(e) => e.preventDefault()} onClick={() => touche(k)}>{k.texte}</button>
        ))}
      </div>
    </div>
  );
}
