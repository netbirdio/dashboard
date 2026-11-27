import { notify } from "@components/Notification";
import useFetchApi, { useApiCall } from "@utils/api";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import PoliciesProvider from "@/contexts/PoliciesProvider";
import { ExitNode, ExitNodeRequest } from "@/interfaces/ExitNode";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";
import {
  getExitNodePolicies,
  toExitNodeRequest,
} from "@/modules/exit-nodes/exitNodeHelpers";
import ExitNodeModal, {
  ExitNodeModalTab,
} from "@/modules/exit-nodes/modal/ExitNodeModal";

type OpenModalOptions = {
  tab?: ExitNodeModalTab;
  // Opens the peer selector right away, e.g. from the Add button.
  addPeer?: boolean;
  // Peers a new exit node starts with.
  peerIds?: string[];
};

/**
 * The fields to change, or a function that computes them from the exit node's
 * latest state (use it when the change depends on the current value, e.g. the
 * peers list).
 */
export type ExitNodeChanges =
  | Partial<ExitNodeRequest>
  | ((latest: ExitNode) => Partial<ExitNodeRequest>);

type ExitNodesContextValue = {
  exitNodes?: ExitNode[];
  peers?: Peer[];
  policies?: Policy[];
  isLoading: boolean;
  openExitNodeModal: (exitNode?: ExitNode, options?: OpenModalOptions) => void;
  updateExitNode: (
    exitNode: ExitNode,
    changes: ExitNodeChanges,
    message: string,
  ) => Promise<ExitNode | void>;
  deleteExitNode: (exitNode: ExitNode) => Promise<void>;
  getPolicies: (exitNode?: ExitNode) => Policy[];
};

const ExitNodesContext = React.createContext({} as ExitNodesContextValue);

export { toExitNodeRequest } from "@/modules/exit-nodes/exitNodeHelpers";

type Props = {
  children: React.ReactNode;
  // Called when the exit node modal closes, saved or not.
  onModalClose?: () => void;
};

export default function ExitNodesProvider({
  children,
  onModalClose,
}: Readonly<Props>) {
  return (
    <PoliciesProvider>
      <ExitNodesProviderContent onModalClose={onModalClose}>
        {children}
      </ExitNodesProviderContent>
    </PoliciesProvider>
  );
}

function ExitNodesProviderContent({ children, onModalClose }: Readonly<Props>) {
  const { permission } = usePermissions();
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();
  const request = useApiCall<ExitNode>("/exit-nodes");

  const { data: exitNodes, isLoading } = useFetchApi<ExitNode[]>("/exit-nodes");
  const { data: peers } = useFetchApi<Peer[]>("/peers");
  const { data: policies } = useFetchApi<Policy[]>(
    "/policies",
    false,
    true,
    !!permission?.policies?.read,
  );

  const [modal, setModal] = useState(false);
  const [current, setCurrent] = useState<ExitNode>();
  const [modalOptions, setModalOptions] = useState<OpenModalOptions>({});

  const openExitNodeModal = useCallback(
    (exitNode?: ExitNode, options: OpenModalOptions = {}) => {
      setCurrent(exitNode);
      setModalOptions(options);
      setModal(true);
    },
    [],
  );

  // A PUT replaces the whole exit node, so writes to one node run one after
  // the other, each built on the state the previous one saved. Otherwise a
  // second toggle sent before the refetch would carry the row's stale values
  // and undo the first.
  const exitNodesRef = useRef(exitNodes);
  useEffect(() => {
    exitNodesRef.current = exitNodes;
  }, [exitNodes]);
  const writes = useRef(new Map<string, Promise<unknown>>());
  const saved = useRef(new Map<string, ExitNode>());

  const updateExitNode = useCallback(
    async (exitNode: ExitNode, changes: ExitNodeChanges, message: string) => {
      const id = exitNode.id;
      const previous = writes.current.get(id) ?? Promise.resolve();
      const promise = previous
        .catch(() => undefined)
        .then(async () => {
          const latest =
            saved.current.get(id) ??
            exitNodesRef.current?.find((n) => n.id === id) ??
            exitNode;
          const delta =
            typeof changes === "function" ? changes(latest) : changes;
          const updated = await request.put(
            { ...toExitNodeRequest(latest), ...delta },
            `/${id}`,
          );
          saved.current.set(id, updated);
          return updated;
        });
      writes.current.set(id, promise);
      promise
        .catch(() => undefined)
        .finally(() => {
          if (writes.current.get(id) !== promise) return;
          writes.current.delete(id);
          saved.current.delete(id);
          mutate("/exit-nodes");
        });
      notify({
        title: exitNode.name,
        description: message,
        loadingMessage: "Updating exit node...",
        promise,
      });
      return promise;
    },
    [request, mutate],
  );

  const deleteExitNode = useCallback(
    async (exitNode: ExitNode) => {
      const choice = await confirm({
        title: `Delete '${exitNode.name}'?`,
        description:
          "Are you sure you want to delete this exit node and its access control policies? This action cannot be undone.",
        confirmText: "Delete",
        cancelText: "Cancel",
        type: "danger",
      });
      if (!choice) return;
      const promise = request.del("", `/${exitNode.id}`).then(() => {
        mutate("/exit-nodes");
        mutate("/policies");
      });
      notify({
        title: "Delete Exit Node " + exitNode.name,
        description: "The exit node was successfully removed",
        loadingMessage: "Deleting the exit node...",
        promise,
      });
      return promise;
    },
    [confirm, request, mutate],
  );

  const getPolicies = useCallback(
    (exitNode?: ExitNode) => getExitNodePolicies(exitNode?.id, policies),
    [policies],
  );

  const value = useMemo(
    () => ({
      exitNodes,
      peers,
      policies,
      isLoading,
      openExitNodeModal,
      updateExitNode,
      deleteExitNode,
      getPolicies,
    }),
    [
      exitNodes,
      peers,
      policies,
      isLoading,
      openExitNodeModal,
      updateExitNode,
      deleteExitNode,
      getPolicies,
    ],
  );

  return (
    <ExitNodesContext.Provider value={value}>
      {children}
      <ExitNodeModal
        open={modal}
        setOpen={(open) => {
          setModal(open);
          if (open) return;
          setCurrent(undefined);
          onModalClose?.();
        }}
        exitNode={current}
        initialTab={modalOptions.tab}
        openPeerSelector={modalOptions.addPeer}
        initialPeerIds={modalOptions.peerIds}
        onSaved={() => {
          setModal(false);
          setCurrent(undefined);
          onModalClose?.();
        }}
      />
    </ExitNodesContext.Provider>
  );
}

export const useExitNodes = () => useContext(ExitNodesContext);
