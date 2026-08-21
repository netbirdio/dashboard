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
import { useCanvasState } from "@/modules/control-center/contexts/ControlCenterContext";
import { isInputFocused } from "@/modules/control-center/hooks/useControlCenterShortcuts";

// Canvas and changeset are captured together so undoing a tracked action also
// rolls back its recorded change.
type Snapshot = {
  nodes: Node[];
  edges: Edge[];
  changes: DraftChange[];
};

const HISTORY_LIMIT = 50;
const CAPTURE_DEBOUNCE_MS = 300;

// Moving nodes isn't undoable, and diffing positions stringified the canvas on
// every drag.
const TRANSIENT_NODE_KEYS = new Set([
  "position",
  "positionAbsolute",
  "dragging",
  "selected",
  "measured",
  "internals",
  "zIndex",
  "dropTarget",
  "className",
  // Derived by navigation and the reconciling frame layout, not by the user.
  "hidden",
  "selectable",
  "style",
  "moreCell",
  // Edge layout artifacts; real connects still surface as changed edge ids.
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
  // The last committed snapshot: what undo returns to.
  const committed = useRef<Snapshot | null>(null);
  const committedSig = useRef<string | null>(null);
  // Bumped whenever the stacks change so canUndo/canRedo re-render.
  const [, setVersion] = useState(0);

  // Mirrored each render so undo/redo can flush a pending capture.
  const latest = useRef<Snapshot>({ nodes, edges, changes });
  latest.current = { nodes, edges, changes };

  const pendingCapture = useRef<number | null>(null);

  const captureNow = useRef(() => {});
  captureNow.current = () => {
    // Cancel first, or an expired timer fires after undo() rewound the stacks.
    if (pendingCapture.current !== null) {
      window.clearTimeout(pendingCapture.current);
      pendingCapture.current = null;
    }
    const snap = latest.current;
    if (!committed.current) {
      committed.current = snap;
      committedSig.current = signature(snap);
      return;
    }
    const snapSig = signature(snap);
    if (snapSig === (committedSig.current ?? signature(committed.current)))
      return;
    committedSig.current = snapSig;
    undoStack.current.push(committed.current);
    if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift();
    redoStack.current = [];
    committed.current = snap;
  };

  const applyRef = useRef<(snap: Snapshot) => void>(() => {});
  applyRef.current = (snap: Snapshot) => {
    setNodes(snap.nodes);
    setEdges(snap.edges);
    replaceChanges(snap.changes);
  };

  // Applying a snapshot sets `committed` synchronously, so undo/redo records
  // no history entry of its own.
  useEffect(() => {
    if (!isDraft) {
      undoStack.current = [];
      redoStack.current = [];
      committed.current = null;
      committedSig.current = null;
      setVersion((v) => v + 1);
      return;
    }
    // Never capture mid-drag: the signature stringifies the whole canvas.
    if (nodes.some((n) => n.dragging)) return;
    // Cheap pre-check: selection and position-only changes must skip the
    // stringify.
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
        // Keep the snapshot fresh without recording a capture.
        committed.current = { nodes, edges, changes };
        return;
      }
    }
    const timer = window.setTimeout(() => {
      pendingCapture.current = null;
      const snap: Snapshot = { nodes, edges, changes };
      if (!committed.current) {
        committed.current = snap;
        committedSig.current = signature(snap);
        return;
      }
      // The committed signature is cached: stringifying twice per capture
      // stalled the main thread on large drafts.
      const snapSig = signature(snap);
      if (snapSig === (committedSig.current ?? signature(committed.current))) {
        // No undoable change, but keep positions fresh for a later undo.
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
    pendingCapture.current = timer;
    return () => {
      window.clearTimeout(timer);
      if (pendingCapture.current === timer) pendingCapture.current = null;
    };
  }, [isDraft, nodes, edges, changes]);

  const undo = useCallback(() => {
    // Flush any pending edit so we step back exactly one state.
    captureNow.current();
    const prev = undoStack.current.pop();
    if (!prev || !committed.current) return;
    redoStack.current.push(committed.current);
    committed.current = prev;
    committedSig.current = null;
    applyRef.current(prev);
    setVersion((v) => v + 1);
  }, []);

  const redo = useCallback(() => {
    // A pending edit invalidates redo, so capture it first.
    captureNow.current();
    const next = redoStack.current.pop();
    if (!next || !committed.current) return;
    undoStack.current.push(committed.current);
    committed.current = next;
    committedSig.current = null;
    applyRef.current(next);
    setVersion((v) => v + 1);
  }, []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- canUndo/canRedo read the mutable ref stacks
    [undo, redo, undoStack.current.length, redoStack.current.length],
  );

  return (
    <DraftHistoryContext.Provider value={value}>
      {children}
    </DraftHistoryContext.Provider>
  );
}
