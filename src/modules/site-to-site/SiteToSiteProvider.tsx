import { Modal } from "@components/modal/Modal";
import { notify } from "@components/Notification";
import useFetchApi, { useApiCall } from "@utils/api";
import * as React from "react";
import { useCallback, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePolicies } from "@/contexts/PoliciesProvider";
import { Group } from "@/interfaces/Group";
import { Network, NetworkResource, NetworkRouter } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { Policy, PolicyRuleResource } from "@/interfaces/Policy";
import { SiteToSiteConnection } from "@/interfaces/SiteToSite";
import {
  AccessControlModalContent,
  SiteToSiteScope,
} from "@/modules/access-control/AccessControlModal";
import { RoutingPeerDeployModal } from "@/modules/site-to-site/routing-peer/RoutingPeerDeployModal";
import {
  connectionNetworks,
  connectionPolicies,
  defaultSiteResource,
  networkRoutingPeers,
  peerCountries,
  policySiteNetworks,
  proposedPolicyName,
  SiteLink,
  siteToSiteScope,
  toRuleResource,
} from "@/modules/site-to-site/siteToSite";
import { SiteToSiteWizard } from "@/modules/site-to-site/wizard/SiteToSiteWizard";

type PolicyModalState = {
  policy?: Policy;
  name?: string;
  sourceResource?: PolicyRuleResource;
  destinationResource?: PolicyRuleResource;
  scope?: SiteToSiteScope;
};

type ContextValue = {
  networks?: Network[];
  policies?: Policy[];
  resources?: NetworkResource[];
  isLoading: boolean;
  countriesOf: (network: Network) => string[];
  onlineRoutingPeers: (network: Network) => Peer[];
  openCreateConnection: () => void;
  openAddPolicy: (connection: SiteToSiteConnection) => void;
  openEditPolicy: (policy: Policy) => void;
  openDeployRoutingPeer: (networks: Network[]) => void;
  deleteConnection: (connection: SiteToSiteConnection) => Promise<void>;
  openAddLinkPolicy: (link: SiteLink) => void;
  setLinkEnabled: (link: SiteLink, enabled: boolean) => void;
  deleteLink: (link: SiteLink) => Promise<void>;
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
  const updatePolicyCall = useApiCall<Policy>("/policies").put;
  const { serializeRules } = usePolicies();

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

  const [wizard, setWizard] = useState(false);
  const [policyModal, setPolicyModal] = useState<PolicyModalState>();
  const [deployNetworks, setDeployNetworks] = useState<Network[]>();

  const countriesOf = useCallback(
    (network: Network) =>
      peerCountries(networkRoutingPeers(network, routers, groups, peers)),
    [routers, groups, peers],
  );
  const onlineRoutingPeers = useCallback(
    (network: Network) =>
      networkRoutingPeers(network, routers, groups, peers).filter(
        (p) => p.connected,
      ),
    [routers, groups, peers],
  );

  const refresh = useCallback(() => {
    mutate("/networks/site-to-site");
    mutate("/policies");
    mutate("/networks");
    mutate("/networks/resources");
  }, [mutate]);

  const openCreateConnection = () => setWizard(true);

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
    setPolicyModal(undefined);
    refresh();
  };

  const openAddLinkPolicy = (link: SiteLink) => {
    const source = networks?.find((n) => n.resources?.includes(link.a.id));
    const destination = networks?.find((n) => n.resources?.includes(link.b.id));
    if (!source || !destination) return;
    const [from, to] = link.reverse ? [link.b, link.a] : [link.a, link.b];
    const [fromNet, toNet] = link.reverse
      ? [destination, source]
      : [source, destination];
    setPolicyModal({
      name: `${from.name} to ${to.name}`,
      sourceResource: toRuleResource(from),
      destinationResource: toRuleResource(to),
      scope: siteToSiteScope(fromNet, toNet, resources),
    });
  };

  const setLinkEnabled = (link: SiteLink, enabled: boolean) => {
    const changed = link.policies.filter((p) => p.enabled !== enabled);
    const promise = Promise.all(
      changed.map((p) =>
        updatePolicyCall(
          {
            name: p.name ?? "",
            description: p.description ?? "",
            enabled,
            query: p.query ?? "",
            rules: serializeRules(p.rules, enabled),
            source_posture_checks: p.source_posture_checks ?? [],
          },
          `/${p.id}`,
        ),
      ),
    ).then(() => refresh());
    notify({
      title: `${link.a.name} and ${link.b.name}`,
      description: enabled
        ? "Policies enabled successfully."
        : "Policies disabled successfully.",
      loadingMessage: enabled ? "Enabling policies..." : "Disabling policies...",
      promise,
    });
  };

  const deleteLink = async (link: SiteLink) => {
    const count = link.policies.length;
    const choice = await confirm({
      title: `Delete ${count} polic${count === 1 ? "y" : "ies"}?`,
      description: `Traffic between ${link.a.name} and ${link.b.name} stops (${link.policies
        .map((p) => p.name)
        .join(", ")}). This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;
    const promise = Promise.all(
      link.policies.map((p) => deletePolicyCall({}, `/${p.id}`)),
    ).then(() => refresh());
    notify({
      title: `${link.a.name} and ${link.b.name}`,
      description: "Policies deleted successfully.",
      loadingMessage: "Deleting policies...",
      promise,
    });
    await promise;
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
      resources,
      isLoading: networksLoading || policiesLoading,
      countriesOf,
      onlineRoutingPeers,
      openCreateConnection,
      openAddPolicy,
      openEditPolicy,
      openDeployRoutingPeer: setDeployNetworks,
      deleteConnection,
      openAddLinkPolicy,
      setLinkEnabled,
      deleteLink,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      networks,
      policies,
      resources,
      networksLoading,
      policiesLoading,
      countriesOf,
      onlineRoutingPeers,
    ],
  );

  return (
    <SiteToSiteContext.Provider value={value}>
      {children}

      <SiteToSiteWizard open={wizard} onOpenChange={setWizard} />

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
