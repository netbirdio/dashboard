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
const signature = (s: Snapshot) =>
  JSON.stringify(s, (_key, value) =>
    value instanceof Set ? Array.from(value) : value,
  );

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
      setVersion((v) => v + 1);
      return;
    }
    const timer = setTimeout(() => {
      const snap: Snapshot = { nodes, edges, changes };
      if (!committed.current) {
        committed.current = snap;
        return;
      }
      if (signature(snap) === signature(committed.current)) return;
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
    applyRef.current(prev);
    setVersion((v) => v + 1);
  }, []);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next || !committed.current) return;
    undoStack.current.push(committed.current);
    committed.current = next;
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
