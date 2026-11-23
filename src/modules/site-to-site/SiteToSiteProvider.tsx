import { Modal } from "@components/modal/Modal";
import { notify } from "@components/Notification";
import useFetchApi, { useApiCall } from "@utils/api";
import * as React from "react";
import { useCallback, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { Group } from "@/interfaces/Group";
import { Network, NetworkResource, NetworkRouter } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { Policy, PolicyRuleResource } from "@/interfaces/Policy";
import { SiteToSiteConnection } from "@/interfaces/SiteToSite";
import {
  AccessControlModalContent,
  SiteToSiteScope,
} from "@/modules/access-control/AccessControlModal";
import { RoutingPeerDeployModal } from "@/modules/site-to-site/RoutingPeerDeployModal";
import {
  connectionNetworks,
  connectionPolicies,
  defaultSiteResource,
  networkRoutingPeers,
  peerCountries,
  policySiteNetworks,
  proposedPolicyName,
  siteToSiteScope,
  toRuleResource,
} from "@/modules/site-to-site/siteToSite";
import {
  SiteToSiteNetworksModal,
  SiteToSiteSelection,
} from "@/modules/site-to-site/SiteToSiteNetworksModal";

type PolicyModalState = {
  policy?: Policy;
  name?: string;
  sourceResource?: PolicyRuleResource;
  destinationResource?: PolicyRuleResource;
  scope?: SiteToSiteScope;
  // Networks to offer a routing peer for once a new connection's policy saves.
  networksToRoute?: Network[];
};

type ContextValue = {
  networks?: Network[];
  policies?: Policy[];
  isLoading: boolean;
  countriesOf: (network: Network) => string[];
  openCreateConnection: () => void;
  openAddPolicy: (connection: SiteToSiteConnection) => void;
  openEditPolicy: (policy: Policy) => void;
  openDeployRoutingPeer: (networks: Network[]) => void;
  deleteConnection: (connection: SiteToSiteConnection) => Promise<void>;
};

const SiteToSiteContext = React.createContext({} as ContextValue);

export const SiteToSiteProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();
  const deletePolicyCall = useApiCall("/policies").del;

  const { data: networks, isLoading: networksLoading } =
    useFetchApi<Network[]>("/networks");
  const { data: resources } = useFetchApi<NetworkResource[]>(
    "/networks/resources",
  );
  const { data: policies, isLoading: policiesLoading } =
    useFetchApi<Policy[]>("/policies");
  const { data: routers } = useFetchApi<NetworkRouter[]>("/networks/routers");
  const { data: groups } = useFetchApi<Group[]>("/groups");
  const { data: peers } = useFetchApi<Peer[]>("/peers");

  const [networksModal, setNetworksModal] = useState(false);
  const [policyModal, setPolicyModal] = useState<PolicyModalState>();
  const [deployNetworks, setDeployNetworks] = useState<Network[]>();

  const countriesOf = useCallback(
    (network: Network) =>
      peerCountries(networkRoutingPeers(network, routers, groups, peers)),
    [routers, groups, peers],
  );

  const refresh = useCallback(() => {
    mutate("/networks/site-to-site");
    mutate("/policies");
    mutate("/networks");
    mutate("/networks/resources");
  }, [mutate]);

  const openCreateConnection = () => setNetworksModal(true);

  // Resources made in the first step are not in the cached lists yet, so the
  // lists are refreshed before the policy modal limits each side to them.
  const onNetworksChosen = async (selection: SiteToSiteSelection) => {
    setNetworksModal(false);
    const [freshNetworks, freshResources] = (await Promise.all([
      mutate("/networks"),
      mutate("/networks/resources"),
    ])) as [Network[] | undefined, NetworkResource[] | undefined];
    const source =
      freshNetworks?.find((n) => n.id === selection.source.id) ??
      selection.source;
    const destination =
      freshNetworks?.find((n) => n.id === selection.destination.id) ??
      selection.destination;

    setPolicyModal({
      name: proposedPolicyName(source, destination),
      sourceResource: toRuleResource(selection.sourceResource),
      destinationResource: toRuleResource(selection.destinationResource),
      scope: siteToSiteScope(source, destination, freshResources ?? resources),
      networksToRoute: [source, destination],
    });
  };

  const openAddPolicy = (connection: SiteToSiteConnection) => {
    const [source, destination] = connectionNetworks(connection, networks);
    if (!source || !destination) return;
    const sourceResource = defaultSiteResource(source, resources, "source");
    const destinationResource = defaultSiteResource(
      destination,
      resources,
      "destination",
    );
    setPolicyModal({
      name: proposedPolicyName(source, destination),
      sourceResource: sourceResource && toRuleResource(sourceResource),
      destinationResource:
        destinationResource && toRuleResource(destinationResource),
      scope: siteToSiteScope(source, destination, resources),
    });
  };

  const openEditPolicy = (policy: Policy) => {
    const { source, destination } = policySiteNetworks(policy, networks);
    setPolicyModal({
      policy,
      scope:
        source && destination
          ? siteToSiteScope(source, destination, resources)
          : undefined,
    });
  };

  const onPolicySaved = () => {
    const toRoute = policyModal?.networksToRoute ?? [];
    setPolicyModal(undefined);
    refresh();
    const unrouted = toRoute.filter((n) => {
      const current = networks?.find((c) => c.id === n.id) ?? n;
      return !current.routing_peers_count;
    });
    if (unrouted.length > 0) setDeployNetworks(unrouted);
  };

  const deleteConnection = async (connection: SiteToSiteConnection) => {
    const names = connectionNetworks(connection, networks).map((n) => n.name);
    const connectionPolicyList = connectionPolicies(connection, policies);
    const choice = await confirm({
      title: `Delete the connection between ${names.join(" and ")}?`,
      description: `This deletes the ${connectionPolicyList.length} polic${
        connectionPolicyList.length === 1 ? "y" : "ies"
      } between these networks. The networks, their resources and routing peers stay. This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;

    const promise = Promise.all(
      connectionPolicyList.map((p) => deletePolicyCall({}, `/${p.id}`)),
    ).then(() => refresh());

    notify({
      title: "Site-to-Site Connection",
      description: "Connection deleted successfully.",
      loadingMessage: "Deleting policies...",
      promise,
    });
    await promise;
  };

  const value = useMemo<ContextValue>(
    () => ({
      networks,
      policies,
      isLoading: networksLoading || policiesLoading,
      countriesOf,
      openCreateConnection,
      openAddPolicy,
      openEditPolicy,
      openDeployRoutingPeer: setDeployNetworks,
      deleteConnection,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [networks, policies, resources, networksLoading, policiesLoading, countriesOf],
  );

  return (
    <SiteToSiteContext.Provider value={value}>
      {children}

      <SiteToSiteNetworksModal
        open={networksModal}
        onOpenChange={setNetworksModal}
        networks={networks}
        resources={resources}
        countriesOf={countriesOf}
        onContinue={(selection) => void onNetworksChosen(selection)}
      />

      <Modal
        open={!!policyModal}
        onOpenChange={(open) => !open && setPolicyModal(undefined)}
      >
        {policyModal && (
          <AccessControlModalContent
            policy={policyModal.policy}
            initialName={policyModal.name}
            initialSourceResource={policyModal.sourceResource}
            initialDestinationResource={policyModal.destinationResource}
            siteToSiteScope={policyModal.scope}
            onSuccess={onPolicySaved}
          />
        )}
      </Modal>

      {deployNetworks && deployNetworks.length > 0 && (
        <RoutingPeerDeployModal
          key={deployNetworks.map((n) => n.id).join(":")}
          open={true}
          onOpenChange={(open) => !open && setDeployNetworks(undefined)}
          networks={deployNetworks}
        />
      )}
    </SiteToSiteContext.Provider>
  );
};

export const useSiteToSite = () => React.useContext(SiteToSiteContext);
