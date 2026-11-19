"use client";

import { notify } from "@components/Notification";
import useFetchApi, { useApiCall } from "@utils/api";
import { wrapIPv6 } from "@utils/ip";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useSWRConfig } from "swr";
import { TerminatedProxiesProvider } from "@/cloud/reverse-proxy/TerminatedProxiesProvider";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import {
  ReverseProxy,
  ReverseProxyCluster,
  ReverseProxyClusterType,
  ReverseProxyDomain,
  ReverseProxyFlatTarget,
  ReverseProxyTarget,
  ReverseProxyTargetProtocol,
  ReverseProxyTargetType,
} from "@/interfaces/ReverseProxy";
import ReverseProxyModal from "@/modules/reverse-proxy/ReverseProxyModal";
import ReverseProxyTargetModal from "@/modules/reverse-proxy/targets/ReverseProxyTargetModal";

type ReverseProxiesContextValue = {
  reverseProxies: ReverseProxy[] | undefined;
  resources: NetworkResource[] | undefined;
  peers: Peer[] | undefined;
  isLoading: boolean;
  openModal: (options?: OpenModalOptions) => void;
  openTargetModal: (options: OpenTargetModalOptions) => void;
  handleCreateOrUpdateProxy: (options: HandleCreateOrUpdateOptions) => void;
  resolveDestination: (target: ReverseProxyTarget) => string;
  handleToggle: (proxy: ReverseProxy) => Promise<void>;
  handleDelete: (proxy: ReverseProxy) => Promise<void>;
  handleDeleteTarget: (
    proxy: ReverseProxy,
    target: ReverseProxyTarget,
  ) => Promise<void>;
  handleToggleTarget: (
    proxy: ReverseProxy,
    target: ReverseProxyTarget,
  ) => Promise<void>;
  domains: ReverseProxyDomain[] | undefined;
  isLoadingDomains: boolean;
  validateDomain: (domainId: string) => Promise<void>;
  deleteDomain: (domain: ReverseProxyDomain) => Promise<void>;
  createDomain: (
    domain: string,
    targetCluster: string,
  ) => Promise<ReverseProxyDomain>;
  clusters: ReverseProxyCluster[] | undefined;
  isClustersLoading: boolean;
  isSelfHostedCluster: (clusterAddress?: string) => boolean;
};

type OpenModalOptions = {
  proxy?: ReverseProxy;
  initialTab?: string;
  initialPeer?: Peer;
  initialNetwork?: Network;
  initialResource?: NetworkResource;
  onSuccess?: () => void;
};

type OpenTargetModalOptions = {
  proxy: ReverseProxy;
  target?: ReverseProxyTarget;
};

type HandleCreateOrUpdateOptions = {
  data: Partial<ReverseProxy>;
  proxyId?: string;
  onSuccess?: () => void;
};

type Props = {
  children: React.ReactNode;
  initialPeer?: Peer;
  initialNetwork?: Network;
};

const ReverseProxiesContext = createContext<ReverseProxiesContextValue | null>(
  null,
);

export default function ReverseProxiesProvider({
  children,
  initialPeer,
  initialNetwork,
}: Readonly<Props>) {
  const t = useTranslations();
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();
  const { permission } = usePermissions();

  // Reverse Proxies
  const { data: rawReverseProxies, isLoading } = useFetchApi<ReverseProxy[]>(
    "/reverse-proxies/services",
    false,
    true,
    permission?.services.read,
  );
  const request = useApiCall<ReverseProxy>("/reverse-proxies/services", true);

  // Peers & Resources for resolving target destinations
  const { data: peers } = useFetchApi<Peer[]>("/peers");
  const { data: resources } = useFetchApi<NetworkResource[]>(
    "/networks/resources",
    false,
    true,
    permission?.services.read,
  );

  const resolveDestination = useCallback(
    (target: ReverseProxyTarget) => {
      if (target.host === "unknown") return target.host;
      const host = resolveTargetHost(target, peers, resources);
      return formatTargetDestination(target, host);
    },
    [peers, resources],
  );

  const reverseProxies = useMemo(() => {
    return rawReverseProxies?.map((proxy) => ({
      ...proxy,
      targets: proxy.targets.map((target) => ({
        ...target,
        destination: resolveDestination(target),
      })),
    }));
  }, [rawReverseProxies, resolveDestination]);

  // Domains
  const { data: domains, isLoading: isLoadingDomains } = useFetchApi<
    ReverseProxyDomain[]
  >("/reverse-proxies/domains", false, true, permission.services?.read);
  const domainRequest = useApiCall<ReverseProxyDomain>(
    "/reverse-proxies/domains",
    true,
  );

  // Clusters
  const { data: clusters, isLoading: isClustersLoading } = useFetchApi<
    ReverseProxyCluster[]
  >("/reverse-proxies/clusters", false, true, permission.services?.read);

  const isSelfHostedCluster = useCallback(
    (clusterAddress?: string) => {
      if (!clusterAddress) return false;
      return (
        clusters?.find((c) => c.address === clusterAddress)?.type ===
        ReverseProxyClusterType.ACCOUNT
      );
    },
    [clusters],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [currentProxy, setCurrentProxy] = useState<ReverseProxy | undefined>();
  const [initialTab, setInitialTab] = useState<string | undefined>();
  const [modalInitialPeer, setModalInitialPeer] = useState<Peer | undefined>();
  const [modalInitialNetwork, setModalInitialNetwork] = useState<
    Network | undefined
  >();
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [targetModalProxy, setTargetModalProxy] = useState<
    ReverseProxy | undefined
  >();
  const [editingTarget, setEditingTarget] = useState<
    ReverseProxyTarget | undefined
  >();
  const [modalInitialResource, setModalInitialResource] = useState<
    NetworkResource | undefined
  >();
  const onSuccessRef = React.useRef<(() => void) | undefined>(undefined);
  const openModal = useCallback(
    (options?: OpenModalOptions) => {
      setCurrentProxy(options?.proxy);
      setInitialTab(options?.initialTab);
      setModalInitialPeer(options?.initialPeer ?? initialPeer);
      setModalInitialNetwork(options?.initialNetwork ?? initialNetwork);
      setModalInitialResource(options?.initialResource);
      onSuccessRef.current = options?.onSuccess;
      setModalOpen(true);
    },
    [initialPeer, initialNetwork],
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setCurrentProxy(undefined);
    setInitialTab(undefined);
    setModalInitialPeer(undefined);
    setModalInitialNetwork(undefined);
    setModalInitialResource(undefined);
    onSuccessRef.current = undefined;
  }, []);

  const openTargetModal = useCallback((options: OpenTargetModalOptions) => {
    setTargetModalProxy(options.proxy);
    setEditingTarget(options.target);
    setTargetModalOpen(true);
  }, []);

  const closeTargetModal = useCallback(() => {
    setTargetModalOpen(false);
    setTargetModalProxy(undefined);
    setEditingTarget(undefined);
  }, []);

  const handleSaveTarget = useCallback(
    async (target: ReverseProxyTarget) => {
      if (!targetModalProxy) return;

      let updatedTargets: ReverseProxyTarget[];
      const isEditing = !!editingTarget;
      const proxyId = targetModalProxy.id;

      if (isEditing) {
        // Update existing target - match by index against the original target
        const targetIndex = findTargetIndex(
          targetModalProxy.targets,
          editingTarget,
        );
        updatedTargets = targetModalProxy.targets.map((t, i) => {
          return i === targetIndex ? target : t;
        });
      } else {
        // Add new target
        updatedTargets = [...(targetModalProxy.targets || []), target];
      }

      notify({
        title: targetModalProxy.domain,
        description: isEditing
          ? t("reverseProxy.targetUpdatedSuccessfully")
          : t("reverseProxy.targetAddedSuccessfully"),
        promise: request
          .put(
            { ...targetModalProxy, targets: sanitizeTargets(updatedTargets) },
            `/${targetModalProxy.id}`,
          )
          .then(() => {
            mutate("/reverse-proxies/services");
            // After adding a new target, scroll to the row and open the accordion
            if (!isEditing) {
              setTimeout(() => {
                const row = document.querySelector<HTMLElement>(
                  `[data-row-id="${proxyId}"]`,
                );
                if (row?.getAttribute("data-accordion") === "closed") {
                  row?.click();
                }
                row?.scrollIntoView({ behavior: "smooth" });
              }, 200);
            }
          }),
        loadingMessage: isEditing
          ? t("reverseProxy.updatingTarget")
          : t("reverseProxy.addingTarget"),
      });
      closeTargetModal();
    },
    [targetModalProxy, editingTarget, request, mutate, closeTargetModal, t],
  );

  const handleCreateOrUpdateProxy = useCallback(
    ({ data, proxyId, onSuccess }: HandleCreateOrUpdateOptions) => {
      const sanitizedData = {
        ...data,
        targets: data.targets ? sanitizeTargets(data.targets) : undefined,
      };
      const isCreating = !proxyId;
      const promise = isCreating
        ? request.post(sanitizedData)
        : request.put(sanitizedData, `/${proxyId}`);

      notify({
        title: data.domain || "",
        description: isCreating
          ? t("reverseProxy.serviceWasSuccessfullyCreated")
          : t("reverseProxy.serviceWasSuccessfullyUpdated"),
        promise: promise.then((result) => {
          mutate("/reverse-proxies/services");
          onSuccess?.();
          if (isCreating && result?.id) {
            setTimeout(() => {
              const row = document.querySelector<HTMLElement>(
                `[data-row-id="${result.id}"]`,
              );
              if (row?.getAttribute("data-accordion") === "closed") {
                row?.click();
              }
              row?.scrollIntoView({ behavior: "smooth" });
            }, 200);
          }
        }),
        loadingMessage: isCreating
          ? t("reverseProxy.creatingService")
          : t("reverseProxy.updatingService"),
      });
    },
    [request, mutate, t],
  );

  const handleToggle = useCallback(
    async (proxy: ReverseProxy) => {
      const newEnabled = !proxy.enabled;
      notify({
        title: proxy.domain,
        description: newEnabled
          ? t("reverseProxy.proxyToggleEnabled")
          : t("reverseProxy.proxyToggleDisabled"),
        promise: request
          .put(
            {
              ...proxy,
              enabled: newEnabled,
              targets: sanitizeTargets(proxy.targets),
            },
            `/${proxy.id}`,
          )
          .then(() => {
            mutate("/reverse-proxies/services");
          }),
        loadingMessage: newEnabled
          ? t("reverseProxy.proxyTogglingEnabled")
          : t("reverseProxy.proxyTogglingDisabled"),
      });
    },
    [mutate, request, t],
  );

  const handleToggleTarget = useCallback(
    async (proxy: ReverseProxy, target: ReverseProxyTarget) => {
      const newEnabled = !target.enabled;
      const targetIndex = findTargetIndex(proxy.targets, target);
      if (targetIndex === -1) return;
      const updatedTargets = proxy.targets.map((t, i) => {
        return i === targetIndex ? { ...t, enabled: newEnabled } : t;
      });
      notify({
        title: proxy.domain,
        description: newEnabled
          ? t("reverseProxy.targetToggleEnabled")
          : t("reverseProxy.targetToggleDisabled"),
        promise: request
          .put(
            { ...proxy, targets: sanitizeTargets(updatedTargets) },
            `/${proxy.id}`,
          )
          .then(() => {
            mutate("/reverse-proxies/services");
          }),
        loadingMessage: newEnabled
          ? t("reverseProxy.targetTogglingEnabled")
          : t("reverseProxy.targetTogglingDisabled"),
      });
    },
    [mutate, request, t],
  );

  const handleDelete = useCallback(
    async (proxy: ReverseProxy) => {
      const choice = await confirm({
        title: t("reverseProxy.deleteNamedConfirm", { name: proxy.domain }),
        description: t(
          "reverseProxy.areYouSureYouWantToDeleteThisReverseProxyThisAction",
        ),
        confirmText: t("common.delete"),
        cancelText: t("common.cancel"),
        type: "danger",
      });
      if (!choice) return;

      notify({
        title: proxy.domain,
        description: t("reverseProxy.reverseProxyWasSuccessfullyDeleted"),
        promise: request.del({}, `/${proxy.id}`).then(() => {
          mutate("/reverse-proxies/services");
        }),
        loadingMessage: t("reverseProxy.deletingReverseProxy"),
      });
    },
    [confirm, request, mutate, t],
  );

  const handleDeleteTarget = useCallback(
    async (proxy: ReverseProxy, target: ReverseProxyTarget) => {
      const isOnlyTarget = proxy.targets.length <= 1;

      const choice = await confirm({
        title: isOnlyTarget
          ? t("reverseProxy.deleteNamedConfirm", { name: proxy.domain })
          : t("reverseProxy.deleteTarget"),
        description: isOnlyTarget
          ? t(
              "reverseProxy.thisIsTheOnlyTargetForThisServiceDeletingItWillRemove",
            )
          : t(
              "reverseProxy.areYouSureYouWantToDeleteThisTargetThisActionCannot",
            ),
        confirmText: t("common.delete"),
        cancelText: t("common.cancel"),
        type: "danger",
      });
      if (!choice) return;

      if (isOnlyTarget) {
        notify({
          title: proxy.domain,
          description: t("reverseProxy.serviceWasSuccessfullyDeleted"),
          promise: request.del({}, `/${proxy.id}`).then(() => {
            mutate("/reverse-proxies/services");
          }),
          loadingMessage: t("reverseProxy.deletingService"),
        });
      } else {
        const targetIndex = findTargetIndex(proxy.targets, target);
        if (targetIndex === -1) return;
        const updatedTargets = proxy.targets.filter(
          (_, i) => i !== targetIndex,
        );

        notify({
          title: proxy.domain,
          description: t("reverseProxy.targetWasSuccessfullyDeleted"),
          promise: request
            .put(
              { ...proxy, targets: sanitizeTargets(updatedTargets) },
              `/${proxy.id}`,
            )
            .then(() => {
              mutate("/reverse-proxies/services");
            }),
          loadingMessage: t("reverseProxy.deletingTarget"),
        });
      }
    },
    [confirm, request, mutate, t],
  );

  const createDomain = useCallback(
    async (
      domain: string,
      targetCluster: string,
    ): Promise<ReverseProxyDomain> => {
      const promise = domainRequest
        .post({
          domain,
          target_cluster: targetCluster,
        })
        .then((d) => {
          mutate("/reverse-proxies/domains");
          return d;
        });
      notify({
        title: t("reverseProxy.addCustomDomain"),
        description: t("reverseProxy.domainSuccessfullyAdded"),
        promise,
        loadingMessage: t("reverseProxy.addingDomain"),
      });
      return promise;
    },
    [domainRequest, mutate, t],
  );

  const validateDomain = useCallback(
    async (domainId: string) => {
      // Delay refetch to allow the server to propagate the validation result
      const DOMAIN_VALIDATION_REFETCH_DELAY_MS = 2000;
      notify({
        title: t("reverseProxy.domainValidation"),
        description: t("reverseProxy.domainValidationStarted"),
        promise: domainRequest.get(`/${domainId}/validate`).then(() => {
          setTimeout(() => {
            mutate("/reverse-proxies/domains");
          }, DOMAIN_VALIDATION_REFETCH_DELAY_MS);
        }),
        loadingMessage: t("reverseProxy.validatingDomain"),
      });
    },
    [domainRequest, mutate, t],
  );

  const deleteDomain = useCallback(
    async (domain: ReverseProxyDomain) => {
      const choice = await confirm({
        title: t("reverseProxy.deleteNamedConfirm", { name: domain.domain }),
        description: t(
          "reverseProxy.areYouSureYouWantToDeleteThisDomainThisActionCannot",
        ),
        confirmText: t("common.delete"),
        cancelText: t("common.cancel"),
        type: "danger",
      });
      if (!choice) return;

      notify({
        title: domain.domain,
        description: t("reverseProxy.domainWasSuccessfullyDeleted"),
        promise: domainRequest.del({}, `/${domain.id}`).then(() => {
          mutate("/reverse-proxies/domains");
        }),
        loadingMessage: t("reverseProxy.deletingDomain"),
      });
    },
    [confirm, domainRequest, mutate, t],
  );

  return (
    <ReverseProxiesContext.Provider
      value={{
        reverseProxies,
        resources,
        peers,
        isLoading,
        openModal,
        openTargetModal,
        handleCreateOrUpdateProxy,
        handleToggle,
        handleToggleTarget,
        handleDelete,
        handleDeleteTarget,
        resolveDestination,
        domains,
        isLoadingDomains,
        createDomain,
        validateDomain,
        deleteDomain,
        clusters,
        isClustersLoading,
        isSelfHostedCluster,
      }}
    >
      <TerminatedProxiesProvider />
      {children}
      {modalOpen && (
        <ReverseProxyModal
          open={modalOpen}
          onOpenChange={(open) => {
            if (!open) closeModal();
          }}
          reverseProxy={currentProxy}
          domains={domains}
          initialTab={initialTab}
          initialPeer={modalInitialPeer}
          initialNetwork={modalInitialNetwork}
          initialResource={modalInitialResource}
          initialSubdomain={modalInitialResource?.name}
          onSuccess={onSuccessRef.current}
        />
      )}
      {targetModalOpen && targetModalProxy && (
        <ReverseProxyTargetModal
          key={targetModalOpen ? 1 : 0}
          open={targetModalOpen}
          onOpenChange={(open) => {
            if (!open) closeTargetModal();
          }}
          onSave={handleSaveTarget}
          currentTarget={editingTarget}
          reverseProxy={targetModalProxy}
          initialPeer={initialPeer}
          initialNetwork={initialNetwork}
        />
      )}
    </ReverseProxiesContext.Provider>
  );
}

export const useReverseProxies = () => {
  const context = useContext(ReverseProxiesContext);
  if (!context) {
    throw new Error(
      "useReverseProxies must be used within a ReverseProxiesProvider",
    );
  }
  return context;
};

type FlattenReverseProxiesParams = {
  reverseProxies: ReverseProxy[] | undefined;
  peer?: Peer;
  network?: Network;
};

export function flattenReverseProxies({
  reverseProxies,
  peer,
  network,
}: FlattenReverseProxiesParams): ReverseProxyFlatTarget[] {
  if (!reverseProxies) return [];

  const flattened: ReverseProxyFlatTarget[] = [];

  reverseProxies.forEach((proxy) => {
    proxy.targets.forEach((target) => {
      // Filter by peer if provided
      if (peer) {
        if (
          target.target_type !== ReverseProxyTargetType.PEER ||
          target.target_id !== peer.id
        ) {
          return;
        }
      }

      // Filter by network if provided (check if target resource belongs to network)
      if (network && !peer) {
        if (isResourceTargetType(target.target_type)) {
          const isResourceInNetwork = network.resources?.includes(
            target.target_id || "",
          );
          if (!isResourceInNetwork) return;
        } else {
          // For peer targets in network context, skip them
          return;
        }
      }

      flattened.push({
        ...target,
        proxy,
      });
    });
  });

  return flattened;
}

// Targets passed in from flattened views (network and peer pages) are copies,
// so fall back to matching on the fields that identify a target.
export function findTargetIndex(
  targets: ReverseProxyTarget[],
  target: ReverseProxyTarget,
): number {
  const index = targets.indexOf(target);
  if (index !== -1) return index;
  return targets.findIndex(
    (t) =>
      t.target_id === target.target_id &&
      t.target_type === target.target_type &&
      t.path === target.path &&
      t.host === target.host &&
      t.port === target.port,
  );
}

export function sanitizeTargets(
  targets: ReverseProxyTarget[],
): ReverseProxyTarget[] {
  return targets.map((t) => {
    const { destination: _, ...target } = t;
    // Subnet targets always own their Host. Cluster targets do too,
    // and they imply direct_upstream — the proxy peer dials the
    // operator-supplied upstream via the host network stack instead of
    // through the embedded WG client. For peer/host/domain targets the
    // backend resolves Host from the peer/resource unless the operator
    // explicitly opted into direct_upstream.
    if (t.target_type === ReverseProxyTargetType.SUBNET)
      return target as ReverseProxyTarget;
    if (t.target_type === ReverseProxyTargetType.CLUSTER) {
      const opts = { ...(target.options ?? {}), direct_upstream: true };
      return { ...target, options: opts } as ReverseProxyTarget;
    }
    if (target.options?.direct_upstream && target.host?.trim())
      return target as ReverseProxyTarget;
    const { host: __, ...rest } = target;
    return rest as ReverseProxyTarget;
  });
}

export function isResourceTargetType(type: ReverseProxyTargetType): boolean {
  return (
    type === ReverseProxyTargetType.HOST ||
    type === ReverseProxyTargetType.DOMAIN ||
    type === ReverseProxyTargetType.SUBNET
  );
}

function formatTargetDestination(
  target: ReverseProxyTarget,
  resolvedHost?: string,
): string {
  const host = wrapIPv6(target.host || resolvedHost || "localhost");
  const isDefault =
    (target.protocol === "http" && target.port === 80) ||
    (target.protocol === "https" && target.port === 443) ||
    target.port === 0;
  return isDefault
    ? `${target.protocol}://${host}`
    : `${target.protocol}://${host}:${target.port}`;
}

export function defaultPortForProtocol(
  protocol: ReverseProxyTargetProtocol,
): number {
  return protocol === ReverseProxyTargetProtocol.HTTPS ? 443 : 80;
}

function resolveTargetHost(
  target: ReverseProxyTarget,
  peers?: Peer[],
  resources?: NetworkResource[],
): string {
  if (target.host) return "";
  if (target.target_type === ReverseProxyTargetType.PEER) {
    return peers?.find((p) => p.id === target.target_id)?.ip ?? "";
  }
  if (isResourceTargetType(target.target_type)) {
    const address = resources?.find((r) => r.id === target.target_id)?.address;
    if (!address) return "";
    return address.includes("/") ? address.split("/")[0] : address;
  }
  return "";
}
