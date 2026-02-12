import { Modal } from "@components/modal/Modal";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import * as React from "react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { Group } from "@/interfaces/Group";
import { Network, NetworkResource, NetworkRouter } from "@/interfaces/Network";
import { AccessControlModalContent } from "@/modules/access-control/AccessControlModal";
import NetworkModal from "@/modules/networks/NetworkModal";
import NetworkResourceModal from "@/modules/networks/resources/NetworkResourceModal";
import { ResourceGroupModal } from "@/modules/networks/resources/ResourceGroupModal";
import NetworkRoutingPeerModal from "@/modules/networks/routing-peers/NetworkRoutingPeerModal";
import { Policy, PolicyRuleResource } from "@/interfaces/Policy";
import PoliciesProvider from "@/contexts/PoliciesProvider";

type Props = {
  children: React.ReactNode;
  network?: Network;
  onResourceUpdate?: () => void;
  onResourceDelete?: () => void;
};

const NetworksContext = React.createContext(
  {} as {
    openAddRoutingPeerModal: (network: Network, router?: NetworkRouter) => void;
    openEditNetworkModal: (network: Network) => void;
    openCreateNetworkModal: () => void;
    openResourceModal: (network: Network, resource?: NetworkResource) => void;
    openResourceGroupModal: (
      network: Network,
      resource?: NetworkResource,
    ) => void;
    openPolicyModal: (network?: Network, resource?: NetworkResource) => void;
    openEditPolicyModal: (policy: Policy) => void;
    deleteNetwork: (network: Network) => Promise<void>;
    deleteResource: (network: Network, resource: NetworkResource) => void;
    deleteRouter: (network: Network, router: NetworkRouter) => void;
    network?: Network;
  },
);

export const NetworkProvider = ({
  children,
  network,
  onResourceDelete,
  onResourceUpdate,
}: Props) => {
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();
  const deleteCall = useApiCall("/networks").del;

  const [currentNetwork, setCurrentNetwork] = useState<Network>();
  const [currentResource, setCurrentResource] = useState<NetworkResource>();
  const [currentRouter, setCurrentRouter] = useState<NetworkRouter>();

  const [policyDefaultSettings, setPolicyDefaultSettings] = useState<{
    name?: string;
    description?: string;
    destinationGroups?: Group[] | string[];
    destinationResource?: PolicyRuleResource;
  }>();
  const [currentPolicy, setCurrentPolicy] = useState<Policy>();

  const [routingPeerModal, setRoutingPeerModal] = useState(false);
  const [networkModal, setNetworkModal] = useState(false);
  const [resourceModal, setResourceModal] = useState(false);
  const [resourceGroupModal, setResourceGroupModal] = useState(false);
  const [policyModal, setPolicyModal] = useState(false);

  const openAddRoutingPeerModal = (
    network: Network,
    router?: NetworkRouter,
  ) => {
    setCurrentNetwork(network);
    router && setCurrentRouter(router);
    setRoutingPeerModal(true);
  };

  const openEditNetworkModal = (network: Network) => {
    setCurrentNetwork(network);
    setNetworkModal(true);
  };

  const openCreateNetworkModal = () => {
    setCurrentNetwork(undefined);
    setNetworkModal(true);
  };

  const openResourceModal = (network: Network, resource?: NetworkResource) => {
    setCurrentNetwork(network);
    resource && setCurrentResource(resource);
    setResourceModal(true);
  };

  const openResourceGroupModal = (
    network: Network,
    resource?: NetworkResource,
  ) => {
    setCurrentNetwork(network);
    resource && setCurrentResource(resource);
    setResourceGroupModal(true);
  };

  const openPolicyModal = (network?: Network, resource?: NetworkResource) => {
    const hasResourceGroups = (resource?.groups?.length || 0) > 0;
    setPolicyDefaultSettings({
      destinationGroups: hasResourceGroups ? resource?.groups : undefined,
      destinationResource: hasResourceGroups
        ? undefined
        : ({
            id: resource?.id,
            type: resource?.type,
          } as PolicyRuleResource),
      name:
        network && !resource
          ? `${network?.name} Policy`
          : resource
          ? `${resource?.name} Policy`
          : "",
      description:
        network && !resource
          ? network?.description
          : network
          ? `${network.name} ${
              network.description ? ", " + network.description : ""
            }`
          : undefined,
    });
    setPolicyModal(true);
  };

  const openEditPolicyModal = (policy: Policy) => {
    setCurrentPolicy(policy);
    setPolicyModal(true);
  };

  const deleteNetwork = async (network: Network) => {
    const choice = await confirm({
      title: `Delete network '${network.name}'?`,
      description:
        "Are you sure you want to delete this network? Every resource and routing peers will be removed from this network. This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });

    if (!choice) return;

    const promise = deleteCall({}, `/${network.id}`).then(() => {
      mutate("/networks");
      mutate("/groups");
    });

    notify({
      title: network.name,
      description: "Network deleted successfully.",
      loadingMessage: "Deleting network...",
      promise,
    });

    return promise;
  };

  const deleteResource = async (
    network: Network,
    resource: NetworkResource,
  ) => {
    const choice = await confirm({
      title: `Delete resource '${resource.name}'?`,
      description:
        "Are you sure you want to delete this resource? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });

    if (!choice) return;

    notify({
      title: resource.name,
      description: "Resource deleted successfully.",
      loadingMessage: "Deleting resource...",
      promise: deleteCall({}, `/${network.id}/resources/${resource.id}`).then(
        () => {
          onResourceDelete?.();
          mutate(`/networks/${network.id}/resources`);
          mutate(`/networks/${network.id}`);
          mutate("/groups");
        },
      ),
    });
  };

  const deleteRouter = async (network: Network, router: NetworkRouter) => {
    const choice = await confirm({
      title: `Remove this router?`,
      description: "Are you sure you want to remove this router?",
      confirmText: "Remove",
      cancelText: "Cancel",
      type: "danger",
    });

    if (!choice) return;

    notify({
      title: "Router of " + network.name,
      description: "Router deleted successfully.",
      loadingMessage: "Deleting router...",
      promise: deleteCall({}, `/${network.id}/routers/${router.id}`).then(
        () => {
          mutate(`/networks/${network.id}/routers`);
        },
      ),
    });
  };

  const askForRoutingPeer = async (network: Network) => {
    const choice = await confirm({
      title: `Add Routing Peer to '${network.name}'?`,
      description:
        "Without a routing peer, the resources inside this network will not be accessible by any peers.",
      confirmText: "Add Routing Peer",
      cancelText: "Later",
      type: "default",
    });
    if (!choice) return;
    openAddRoutingPeerModal(network);
  };

  const askForResource = async (network: Network) => {
    const choice = await confirm({
      title: `Add Resource to '${network.name}'?`,
      description:
        "Peers will be able to access your network resources once you add them.",
      confirmText: "Add Resource",
      cancelText: "Later",
      type: "default",
    });
    if (!choice) return;
    openResourceModal(network);
  };

  const askForAccessControlPolicy = async (res: NetworkResource) => {
    const choice = await confirm({
      title: `Add policy for '${res.name}'?`,
      description:
        "Without a policy, the resource will not be accessible by any peers. Create a policy to control access to this resource.",
      confirmText: "Create Policy",
      cancelText: "Later",
      type: "default",
    });
    if (!choice) return;
    openPolicyModal(currentNetwork, res);
  };

  return (
    <NetworksContext.Provider
      value={{
        openAddRoutingPeerModal,
        openEditNetworkModal,
        openCreateNetworkModal,
        openResourceModal,
        openResourceGroupModal,
        openPolicyModal,
        openEditPolicyModal,
        deleteNetwork,
        deleteResource,
        deleteRouter,
        network,
      }}
    >
      {children}

      <NetworkModal
        open={networkModal}
        setOpen={setNetworkModal}
        network={currentNetwork}
        onCreated={async (network) => {
          mutate("/networks");
          await askForResource(network);
        }}
        onUpdated={(n) => {
          mutate("/networks");
          mutate(`/networks/${n.id}`);
        }}
      />
      <PoliciesProvider>
        <Modal
          open={policyModal}
          onOpenChange={(state) => {
            setPolicyModal(state);
            setPolicyDefaultSettings(undefined);
            setCurrentPolicy(undefined);
          }}
        >
          <AccessControlModalContent
            key={policyModal ? "1" : "0"}
            initialDestinationGroups={policyDefaultSettings?.destinationGroups}
            initialDestinationResource={
              policyDefaultSettings?.destinationResource
            }
            initialName={policyDefaultSettings?.name}
            initialDescription={policyDefaultSettings?.description}
            policy={currentPolicy}
            onSuccess={async (p) => {
              setPolicyModal(false);
              setPolicyDefaultSettings(undefined);
              setCurrentPolicy(undefined);
              mutate("/networks");
              if (network) {
                onResourceUpdate?.();
                mutate(`/networks/${network.id}/resources`);
                mutate(`/networks/${network.id}`);
              } else {
                currentNetwork && (await askForRoutingPeer(currentNetwork));
              }
            }}
          />
        </Modal>
      </PoliciesProvider>
      {currentNetwork && (
        <>
          <NetworkRoutingPeerModal
            network={currentNetwork}
            router={currentRouter}
            open={routingPeerModal}
            onCreated={async () => {
              setRoutingPeerModal(false);
              setCurrentRouter(undefined);
              mutate(`/networks`);
              mutate("/groups");
              if (network) {
                mutate(`/networks/${currentNetwork.id}/routers`);
                mutate(`/networks/${network.id}`);
              }
            }}
            onUpdated={async () => {
              setRoutingPeerModal(false);
              setCurrentRouter(undefined);
              mutate(`/networks`);
              mutate("/groups");
              if (network) {
                mutate(`/networks/${network.id}`);
                mutate(`/networks/${currentNetwork.id}/routers`);
              }
            }}
            setOpen={(state) => {
              setCurrentRouter(undefined);
              setRoutingPeerModal(state);
            }}
          />

          <ResourceGroupModal
            network={currentNetwork}
            resource={currentResource}
            open={resourceGroupModal}
            onOpenChange={(state) => {
              setCurrentResource(undefined);
              setResourceGroupModal(state);
            }}
            onUpdated={() => {
              setResourceGroupModal(false);
              setCurrentResource(undefined);
              mutate("/groups");
              if (network) {
                onResourceUpdate?.();
                mutate(`/networks/${network.id}/resources`);
                mutate(`/networks/${network.id}`);
              }
            }}
          />

          <NetworkResourceModal
            network={currentNetwork}
            resource={currentResource}
            onCreated={async (r) => {
              setResourceModal(false);
              setCurrentResource(undefined);
              mutate("/networks");
              mutate("/groups");
              if (network) {
                mutate(`/networks/${network.id}/resources`);
                mutate(`/networks/${network.id}`);
              } else {
                await askForAccessControlPolicy(r);
              }
            }}
            onUpdated={() => {
              setResourceModal(false);
              setCurrentResource(undefined);
              mutate("/networks");
              mutate("/groups");
              if (network) {
                onResourceUpdate?.();
                mutate(`/networks/${network.id}/resources`);
                mutate(`/networks/${network.id}`);
              }
            }}
            open={resourceModal}
            setOpen={(state) => {
              setCurrentResource(undefined);
              setResourceModal(state);
            }}
          />
        </>
      )}
    </NetworksContext.Provider>
  );
};

export const useNetworksContext = () => {
  const context = React.useContext(NetworksContext);
  if (context === undefined) {
    throw new Error("useNetworksContext must be used within a NetworkProvider");
  }
  return context;
};
