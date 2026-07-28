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
import { Edge, Node, useReactFlow } from "@xyflow/react";
import { AlertCircleIcon } from "lucide-react";
import { notify } from "@components/Notification";
import { NetCodeCommit } from "@/interfaces/NetCode";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { DEFAULT_MIN_ZOOM } from "@/modules/control-center/utils/layouts";
import { buildHistoryGraph } from "@/modules/control-center/netcode/buildHistoryGraph";
import { useNetcodeApi } from "@/modules/control-center/netcode/useNetcodeApi";

// Time travel: a third canvas owner beside the live view builders and the draft
// build. While active it holds the canvas, so the live view-init effect bails
// (see useSelectNodeHandlers) and editing is disabled at the ReactFlow level.
// Entering and leaving mirrors the draft contract: snapshot once on entry,
// restore verbatim on exit, leaving layoutInitialized untouched.

// The rightmost timeline position is the live account, not a commit.
export const LIVE_INDEX = -1;

interface NetcodeTimelineContextType {
  isOpen: boolean;
  /** True while a past commit is rendered (live position is not time travel). */
  isTimeTravel: boolean;
  commits: NetCodeCommit[];
  /** Index into `commits` (newest first), or LIVE_INDEX for the live state. */
  index: number;
  selectIndex: (index: number) => void;
  currentCommit: NetCodeCommit | null;
  open: () => void;
  close: () => void;
  isLoading: boolean;
}

const NetcodeTimelineContext =
  createContext<NetcodeTimelineContextType | null>(null);

export function useNetcodeTimeline(): NetcodeTimelineContextType {
  const ctx = useContext(NetcodeTimelineContext);
  if (!ctx) {
    throw new Error(
      "useNetcodeTimeline must be used within NetcodeTimelineProvider",
    );
  }
  return ctx;
}

export function NetcodeTimelineProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { listCommits, exportCommitSpec } = useNetcodeApi();
  const { setNodes, setEdges, nodes, edges } = useCanvasState();
  const { isDraft } = useDraftMode();
  const reactFlow = useReactFlow();

  const [isOpen, setIsOpen] = useState(false);
  const [commits, setCommits] = useState<NetCodeCommit[]>([]);
  const [index, setIndex] = useState(LIVE_INDEX);
  const [isLoading, setIsLoading] = useState(false);

  // The live canvas as it was when time travel took over.
  const liveStateRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);
  // Guards against a stale fetch landing after a newer selection.
  const requestRef = useRef(0);

  const isTimeTravel = isOpen && index !== LIVE_INDEX;
  const currentCommit = index === LIVE_INDEX ? null : commits[index] ?? null;

  const restoreLive = useCallback(() => {
    const snapshot = liveStateRef.current;
    liveStateRef.current = null;
    if (!snapshot) return;
    setNodes(snapshot.nodes);
    setEdges(snapshot.edges);
    setTimeout(() => {
      reactFlow.fitView({
        nodes: snapshot.nodes,
        padding: 0.1,
        duration: 500,
        maxZoom: 0.8,
        minZoom: DEFAULT_MIN_ZOOM,
      });
    }, 100);
  }, [setNodes, setEdges, reactFlow]);

  const close = useCallback(() => {
    setIsOpen(false);
    setIndex(LIVE_INDEX);
    restoreLive();
  }, [restoreLive]);

  const open = useCallback(async () => {
    setIsOpen(true);
    setIsLoading(true);
    try {
      const result = await listCommits(100, 0);
      setCommits(result.commits ?? []);
    } catch (error) {
      notify({
        title: "History",
        description:
          (error as { message?: string })?.message ??
          "Failed to load the configuration history.",
        icon: <AlertCircleIcon size={16} />,
        backgroundColor: "bg-red-500",
      });
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [listCommits]);

  const selectIndex = useCallback((next: number) => {
    setIndex(next);
  }, []);

  // Leaving draft mode or the page closes time travel — the two must never own
  // the canvas at the same time.
  useEffect(() => {
    if (isDraft && isOpen) close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDraft]);

  // Render the selected commit, or hand the canvas back at the live position.
  useEffect(() => {
    if (!isOpen) return;

    if (index === LIVE_INDEX) {
      restoreLive();
      return;
    }

    const commit = commits[index];
    if (!commit) return;

    const token = ++requestRef.current;
    setIsLoading(true);

    // Snapshot the live canvas once, before the first historical render.
    if (!liveStateRef.current) {
      liveStateRef.current = { nodes, edges };
    }

    exportCommitSpec(commit.id)
      .then((spec) => {
        if (token !== requestRef.current) return;
        const graph = buildHistoryGraph(spec);
        setNodes(graph.nodes);
        setEdges(graph.edges);
        setTimeout(() => {
          if (token !== requestRef.current) return;
          reactFlow.fitView({
            nodes: graph.nodes,
            padding: 0.15,
            duration: 400,
            maxZoom: 0.8,
            minZoom: DEFAULT_MIN_ZOOM,
          });
        }, 100);
      })
      .catch((error) => {
        if (token !== requestRef.current) return;
        notify({
          title: "History",
          description:
            (error as { message?: string })?.message ??
            "Failed to load this version of the configuration.",
          icon: <AlertCircleIcon size={16} />,
          backgroundColor: "bg-red-500",
        });
      })
      .finally(() => {
        if (token === requestRef.current) setIsLoading(false);
      });
    // nodes/edges are read only to snapshot them once, so they stay out of deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, index, commits]);

  const value = useMemo(
    () => ({
      isOpen,
      isTimeTravel,
      commits,
      index,
      selectIndex,
      currentCommit,
      open: () => void open(),
      close,
      isLoading,
    }),
    [
      isOpen,
      isTimeTravel,
      commits,
      index,
      selectIndex,
      currentCommit,
      open,
      close,
      isLoading,
    ],
  );

  return (
    <NetcodeTimelineContext.Provider value={value}>
      {children}
    </NetcodeTimelineContext.Provider>
  );
}
