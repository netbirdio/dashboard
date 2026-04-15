import { Modal } from "@components/modal/Modal";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import * as React from "react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { useNetworkAccessControl } from "@/modules/networks/NetworkAccessControlProvider";
import { Group } from "@/interfaces/Group";
import { Network, NetworkResource, NetworkRouter } from "@/interfaces/Network";
import { AccessControlModalContent } from "@/modules/access-control/AccessControlModal";
import NetworkModal from "@/modules/networks/NetworkModal";
import NetworkResourceModal from "@/modules/networks/resources/NetworkResourceModal";
import { ResourceGroupModal } from "@/modules/networks/resources/ResourceGroupModal";
import NetworkRoutingPeerModal from "@/modules/networks/routing-peers/NetworkRoutingPeerModal";
import { Policy, PolicyRuleResource } from "@/interfaces/Policy";
import PoliciesProvider from "@/contexts/PoliciesProvider";
import { ResourceIcon } from "@/assets/icons/ResourceIcon";
import CopyToClipboardText from "@components/CopyToClipboardText";
import { cn } from "@utils/helpers";
import { useI18n } from "@/i18n/I18nProvider";

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
    openResourceModal: (
      network: Network,
      resource?: NetworkResource,
      initialTab?: string,
    ) => void;
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
    assignedPolicies: (
      resource?: NetworkResource,
      groups?: Group[],
    ) => {
      policies: Policy[];
      enabledPolicies: Policy[];
      isLoading: boolean;
      policyCount: number;
    };
    resourceExists: (name: string, excludeId?: string) => boolean;
    resources?: NetworkResource[];
    getPolicyDestinationResources: (policy: Policy) => NetworkResource[];
    confirmMultiResourceAction: (
      policy: Policy,
      action: "edit" | "delete",
      additionalResource?: NetworkResource,
    ) => Promise<boolean>;
    policies?: Policy[];
  },
);

export const NetworkProvider = ({
  children,
  network,
  onResourceDelete,
  onResourceUpdate,
}: Props) => {
  const { t } = useI18n();
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();
  const deleteCall = useApiCall("/networks").del;
  const {
    policies,
    resources,
    assignedPolicies,
    resourceExists,
    getPolicyDestinationResources,
  } = useNetworkAccessControl();

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

  const [resourceModalInitialTab, setResourceModalInitialTab] = useState<
    string | undefined
  >();

  const openResourceModal = (
    network: Network,
    resource?: NetworkResource,
    initialTab?: string,
  ) => {
    setCurrentNetwork(network);
    resource && setCurrentResource(resource);
    setResourceModalInitialTab(initialTab);
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
        : resource
        ? ({
            id: resource.id,
            type: resource.type,
          } as PolicyRuleResource)
        : undefined,
      name:
        network && !resource
          ? t("networks.defaultPolicyName", { name: network?.name || "" })
          : resource
          ? t("networks.defaultPolicyName", { name: resource?.name || "" })
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

  const confirmMultiResourceAction = async (
    policy: Policy,
    action: "edit" | "delete",
    additionalResource?: NetworkResource,
  ) => {
    const fetchedResources = getPolicyDestinationResources(policy);
    const affectedResources =
      additionalResource &&
      !fetchedResources.some((r) => r.id === additionalResource.id)
        ? [...fetchedResources, additionalResource]
        : fetchedResources;
    const isMulti = affectedResources.length > 1;
    if (!isMulti && action === "edit") return true;
    return confirm({
      title: isMulti ? (
        <>{t("networks.multiPolicyTitle")}</>
      ) : (
        <>
          {action === "edit"
            ? t("actions.edit")
            : t("actions.delete")}{" "}
          {t("networks.policyLabel")} &apos;{policy.name}&apos;?
        </>
      ),
      description: isMulti
        ? t("networks.multiPolicyDescription", {
            action:
              action === "edit"
                ? t("networks.updating")
                : t("networks.deleting"),
          })
        : action === "delete"
        ? t("policies.deleteDescription")
        : undefined,
      children: isMulti ? (
        <AffectedResourceList resources={affectedResources} />
      ) : undefined,
      confirmText:
        action === "edit"
          ? t("networks.editPolicy")
          : t("networks.deletePolicy"),
      cancelText: t("common.cancel"),
      hideIcon: isMulti,
      type: action === "edit" ? "warning" : "danger",
      maxWidthClass: isMulti ? "max-w-lg" : undefined,
    });
  };

  const deleteNetwork = async (network: Network) => {
    const choice = await confirm({
      title: t("networks.deleteTitle", { name: network.name }),
      description: t("networks.deleteDescription"),
      confirmText: t("actions.delete"),
      cancelText: t("common.cancel"),
      type: "danger",
    });

    if (!choice) return;

    const promise = deleteCall({}, `/${network.id}`).then(() => {
      mutate("/networks");
      mutate("/groups");
    });

    notify({
      title: network.name,
      description: t("networks.deleted"),
      loadingMessage: t("networks.deleting"),
      promise,
    });

    return promise;
  };

  const deleteResource = async (
    network: Network,
    resource: NetworkResource,
  ) => {
    const choice = await confirm({
      title: t("networks.deleteResourceTitle", { name: resource.name }),
      description: t("networks.deleteResourceDescription"),
      confirmText: t("actions.delete"),
      cancelText: t("common.cancel"),
      type: "danger",
    });

    if (!choice) return;

    notify({
      title: resource.name,
      description: t("networks.resourceDeleted"),
      loadingMessage: t("networks.deletingResource"),
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
      title: t("networks.removeRouterTitle"),
      description: t("networks.removeRouterDescription"),
      confirmText: t("actions.remove"),
      cancelText: t("common.cancel"),
      type: "danger",
    });

    if (!choice) return;

    notify({
      title: t("networks.routerOf", { name: network.name }),
      description: t("networks.routerDeleted"),
      loadingMessage: t("networks.deletingRouter"),
      promise: deleteCall({}, `/${network.id}/routers/${router.id}`).then(
        () => {
          mutate(`/networks/${network.id}/routers`);
        },
      ),
    });
  };

  const askForRoutingPeer = async (network: Network) => {
    const choice = await confirm({
      title: t("networks.askRoutingPeerTitle", { name: network.name }),
      description: t("networks.askRoutingPeerDescription"),
      confirmText: t("networkRouting.add"),
      cancelText: t("common.later"),
      type: "default",
    });
    if (!choice) return;
    openAddRoutingPeerModal(network);
  };

  const askForResource = async (network: Network) => {
    const choice = await confirm({
      title: t("networks.askResourceTitle", { name: network.name }),
      description: t("networks.askResourceDescription"),
      confirmText: t("networks.addResource"),
      cancelText: t("common.later"),
      type: "default",
    });
    if (!choice) return;
    openResourceModal(network);
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
        assignedPolicies,
        resourceExists,
        resources,
        getPolicyDestinationResources,
        confirmMultiResourceAction,
        policies,
      }}
    >
      <PoliciesProvider>
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
                mutate("/networks/resources");
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
              initialTab={resourceModalInitialTab}
              onCreated={async (r) => {
                setResourceModal(false);
                setCurrentResource(undefined);
                mutate("/networks");
                mutate("/groups");
                mutate("/networks/resources");
                if (network) {
                  mutate(`/networks/${network.id}/resources`);
                  mutate(`/networks/${network.id}`);
                } else {
                  currentNetwork?.routing_peers_count === 0 &&
                    (await askForRoutingPeer(currentNetwork));
                }
              }}
              onUpdated={() => {
                setResourceModal(false);
                setCurrentResource(undefined);
                mutate("/networks");
                mutate("/groups");
                mutate("/networks/resources");
                if (network) {
                  onResourceUpdate?.();
                  mutate(`/networks/${network.id}/resources`);
                  mutate(`/networks/${network.id}`);
                }
              }}
              open={resourceModal}
              setOpen={(state) => {
                setCurrentResource(undefined);
                setResourceModalInitialTab(undefined);
                setResourceModal(state);
              }}
            />
          </>
        )}
      </PoliciesProvider>
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

function AffectedResourceList({ resources }: { resources: NetworkResource[] }) {
  const { t } = useI18n();
  const maxVisible = 6;
  const visible = resources.slice(0, maxVisible);
  const remaining = resources.length - maxVisible;
  return (
    <div
      className={cn(
        "rounded-md bg-nb-gray-930 border border-nb-gray-900 text-xs mt-4",
      )}
    >
      {visible.map((r, i) => (
        <div
          key={r.id}
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5",
            i > 0 && "border-t border-nb-gray-900",
          )}
        >
          <ResourceIcon type={r.type || "host"} size={12} />
          <span className="font-medium text-nb-gray-200">{r.name}</span>
          <CopyToClipboardText className={"text-nb-gray-300"}>
            {r.address}
          </CopyToClipboardText>
        </div>
      ))}
      {remaining > 0 && (
        <div className="border-t border-nb-gray-900 px-3 py-2 text-nb-gray-200">
          {t("common.moreCount", { count: remaining })}
        </div>
      )}
    </div>
  );
}
