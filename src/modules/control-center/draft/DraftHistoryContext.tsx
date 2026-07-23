"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Edge, Node } from "@xyflow/react";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import {
  DraftChange,
  useDraftChangeset,
} from "@/modules/control-center/draft/DraftChangesetContext";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { isInputFocused } from "@/modules/control-center/hooks/useControlCenterShortcuts";

// Snapshot-based undo/redo for draft mode. Canvas (nodes/edges) and the
// changeset are captured together so undoing a tracked action also rolls back
// its recorded change. Snapshots are taken debounced, which collapses the
// intermediate states of a node drag into a single entry.
type Snapshot = {
  nodes: Node[];
  edges: Edge[];
  changes: DraftChange[];
};

const HISTORY_LIMIT = 50;
const CAPTURE_DEBOUNCE_MS = 300;

// addedMembers Sets aren't JSON-serializable — compare them as arrays.
// Node positions and transient interaction state are EXCLUDED: moving nodes
// around is not an undoable action (only real changes are — connections,
// deletions, adds, data edits), and comparing positions made every drag
// create history entries and stringify the canvas repeatedly.
const TRANSIENT_NODE_KEYS = new Set([
  "position",
  "positionAbsolute",
  "dragging",
  "selected",
  "measured",
  "internals",
  // Drag-stop brings the moved node to the front — cosmetic, not undoable.
  "zIndex",
  // Drop-target highlight flag flipped during drags.
  "dropTarget",
  // Focus-mode dimming (useGroupFocusDim) — visual only.
  "className",
  // Drill-down navigation hides/reveals nodes; frame overflow rows are
  // hidden by the reconciling layout — derived state, not user changes.
  "hidden",
  // Stamped by the frame layout (rubber-band selection guard).
  "selectable",
  // Frame/child sizes are reconciled from the grid; the "+N more" cell rect
  // is computed. Real causes (adding/removing resources) are captured via
  // parentId/data/ids anyway.
  "style",
  "moreCell",
  // Edge layout artifacts and frame-attachment rewiring: edges re-target
  // the frame while its children are framed (and back when drilled) — pure
  // navigation. Real connects/removals create/delete edges, which the edge
  // IDS capture.
  "points",
  "resourceTarget",
  "target",
]);
const signature = (s: Snapshot) =>
  JSON.stringify(s, (key, value) => {
    if (TRANSIENT_NODE_KEYS.has(key)) return undefined;
    return value instanceof Set ? Array.from(value) : value;
  });

interface DraftHistoryContextType {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const DraftHistoryContext = createContext<DraftHistoryContextType>({
  undo: () => {},
  redo: () => {},
  canUndo: false,
  canRedo: false,
});

export const useDraftHistory = () => useContext(DraftHistoryContext);

export function DraftHistoryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isDraft } = useDraftMode();
  const { nodes, edges, setNodes, setEdges } = useCanvasState();
  const { changes, replaceChanges } = useDraftChangeset();

  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);
  // The last committed snapshot — what undo returns to.
  const committed = useRef<Snapshot | null>(null);
  // Cached signature of `committed` (see the capture effect).
  const committedSig = useRef<string | null>(null);
  // Bumped whenever the stacks change so canUndo/canRedo re-render.
  const [, setVersion] = useState(0);

  const applyRef = useRef((snap: Snapshot) => {
    setNodes(snap.nodes);
    setEdges(snap.edges);
    replaceChanges(snap.changes);
  });
  applyRef.current = (snap: Snapshot) => {
    setNodes(snap.nodes);
    setEdges(snap.edges);
    replaceChanges(snap.changes);
  };

  // Capture (debounced): push the previously committed snapshot when the
  // draft state actually changed. Applying a snapshot sets `committed`
  // synchronously, so undo/redo itself never records a history entry.
  useEffect(() => {
    if (!isDraft) {
      undoStack.current = [];
      redoStack.current = [];
      committed.current = null;
      committedSig.current = null;
      setVersion((v) => v + 1);
      return;
    }
    // Never capture mid-drag — the signature stringifies the whole canvas,
    // which froze the drag whenever the debounce elapsed while moving. The
    // drag-stop commit (dragging flags clear) re-arms the capture.
    if (nodes.some((n) => n.dragging)) return;
    // Cheap structural pre-check (reference compares) — selection clicks
    // and position-only changes must not run the expensive stringify.
    const committedSnap = committed.current;
    if (committedSnap) {
      const structurallyEqual =
        committedSnap.edges === edges &&
        committedSnap.changes === changes &&
        committedSnap.nodes.length === nodes.length &&
        committedSnap.nodes.every((p, i) => {
          const n = nodes[i];
          return (
            p.id === n.id && p.data === n.data && p.parentId === n.parentId
          );
        });
      if (structurallyEqual) {
        // Keep the committed snapshot fresh (positions) without a capture.
        committed.current = { nodes, edges, changes };
        return;
      }
    }
    const timer = setTimeout(() => {
      const snap: Snapshot = { nodes, edges, changes };
      if (!committed.current) {
        committed.current = snap;
        committedSig.current = signature(snap);
        return;
      }
      // The committed signature is cached — stringifying the whole canvas
      // TWICE per capture stalled the main thread on large drafts.
      const snapSig = signature(snap);
      if (snapSig === (committedSig.current ?? signature(committed.current))) {
        // No undoable change — but keep the committed snapshot fresh so a
        // later undo doesn't restore stale node positions.
        committed.current = snap;
        committedSig.current = snapSig;
        return;
      }
      committedSig.current = snapSig;
      undoStack.current.push(committed.current);
      if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift();
      redoStack.current = [];
      committed.current = snap;
      setVersion((v) => v + 1);
    }, CAPTURE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [isDraft, nodes, edges, changes]);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev || !committed.current) return;
    redoStack.current.push(committed.current);
    committed.current = prev;
    committedSig.current = null;
    applyRef.current(prev);
    setVersion((v) => v + 1);
  }, []);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next || !committed.current) return;
    undoStack.current.push(committed.current);
    committed.current = next;
    committedSig.current = null;
    applyRef.current(next);
    setVersion((v) => v + 1);
  }, []);

  // ⌘/Ctrl+Z undo, ⇧⌘/Ctrl+Z or Ctrl+Y redo (draft-only, input-aware).
  useEffect(() => {
    if (!isDraft) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || isInputFocused()) return;
      const key = e.key.toLowerCase();
      if (key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDraft, undo, redo]);

  const value = useMemo(
    () => ({
      undo,
      redo,
      canUndo: undoStack.current.length > 0,
      canRedo: redoStack.current.length > 0,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [undo, redo, undoStack.current.length, redoStack.current.length],
  );

  return (
    <DraftHistoryContext.Provider value={value}>
      {children}
    </DraftHistoryContext.Provider>
  );
}
