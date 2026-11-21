import { notify } from "@components/Notification";
import useFetchApi, { useApiCall } from "@utils/api";
import React, { useCallback, useContext, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import PoliciesProvider from "@/contexts/PoliciesProvider";
import { ExitNode, ExitNodeRequest } from "@/interfaces/ExitNode";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";
import { getExitNodePolicies } from "@/modules/exit-nodes/exitNodeHelpers";
import ExitNodeModal, {
  ExitNodeModalTab,
} from "@/modules/exit-nodes/modal/ExitNodeModal";

type OpenModalOptions = {
  tab?: ExitNodeModalTab;
  // Opens the peer selector right away, e.g. from the Add button.
  addPeer?: boolean;
};

type ExitNodesContextValue = {
  exitNodes?: ExitNode[];
  peers?: Peer[];
  policies?: Policy[];
  isLoading: boolean;
  openExitNodeModal: (exitNode?: ExitNode, options?: OpenModalOptions) => void;
  updateExitNode: (
    exitNode: ExitNode,
    changes: Partial<ExitNodeRequest>,
    message: string,
  ) => Promise<ExitNode | void>;
  deleteExitNode: (exitNode: ExitNode) => Promise<void>;
  getPolicies: (exitNode?: ExitNode) => Policy[];
};

const ExitNodesContext = React.createContext({} as ExitNodesContextValue);

export const toExitNodeRequest = (exitNode: ExitNode): ExitNodeRequest => ({
  name: exitNode.name,
  description: exitNode.description,
  enabled: exitNode.enabled,
  auto_apply: exitNode.auto_apply,
  peers: exitNode.peers.map(({ peer_id, metric, enabled }) => ({
    peer_id,
    metric,
    enabled,
  })),
});

type Props = {
  children: React.ReactNode;
};

export default function ExitNodesProvider({ children }: Readonly<Props>) {
  return (
    <PoliciesProvider>
      <ExitNodesProviderContent>{children}</ExitNodesProviderContent>
    </PoliciesProvider>
  );
}

function ExitNodesProviderContent({ children }: Readonly<Props>) {
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

  const updateExitNode = useCallback(
    async (
      exitNode: ExitNode,
      changes: Partial<ExitNodeRequest>,
      message: string,
    ) => {
      const promise = request
        .put({ ...toExitNodeRequest(exitNode), ...changes }, `/${exitNode.id}`)
        .then((updated) => {
          mutate("/exit-nodes");
          return updated;
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
          if (!open) setCurrent(undefined);
        }}
        exitNode={current}
        initialTab={modalOptions.tab}
        openPeerSelector={modalOptions.addPeer}
        onSaved={() => {
          setModal(false);
          setCurrent(undefined);
        }}
      />
    </ExitNodesContext.Provider>
  );
}

export const useExitNodes = () => useContext(ExitNodesContext);
