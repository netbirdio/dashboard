"use client";

import { notify } from "@components/Notification";
import useFetchApi, { useApiCall } from "@utils/api";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import {
  ReverseProxy,
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
  ) => Promise<ReverseProxyDomain | undefined>;
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
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();

  // Reverse Proxies
  const { data: rawReverseProxies, isLoading } =
    useFetchApi<ReverseProxy[]>("/reverse-proxies/services");
  const request = useApiCall<ReverseProxy>("/reverse-proxies/services");

  // Peers & Resources for resolving target destinations
  const { data: peers } = useFetchApi<Peer[]>("/peers");
  const { data: resources } = useFetchApi<NetworkResource[]>(
    "/networks/resources",
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
  >("/reverse-proxies/domains");
  const domainRequest = useApiCall<ReverseProxyDomain>(
    "/reverse-proxies/domains",
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
        // Update existing target - match against the original target before editing
        updatedTargets = targetModalProxy.targets.map((t) => {
          return isSameTarget(t, editingTarget) ? target : t;
        });
      } else {
        // Add new target
        updatedTargets = [...(targetModalProxy.targets || []), target];
      }

      notify({
        title: targetModalProxy.domain,
        description: isEditing
          ? "Target updated successfully"
          : "Target added successfully",
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
        loadingMessage: isEditing ? "Updating target..." : "Adding target...",
      });
      closeTargetModal();
    },
    [targetModalProxy, editingTarget, request, mutate, closeTargetModal],
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
          ? "Service was successfully created"
          : "Service was successfully updated",
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
          ? "Creating service..."
          : "Updating service...",
      });
    },
    [request, mutate],
  );

  const handleToggle = useCallback(
    async (proxy: ReverseProxy) => {
      const newEnabled = !proxy.enabled;
      notify({
        title: proxy.domain,
        description: `Reverse proxy ${newEnabled ? "enabled" : "disabled"}`,
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
        loadingMessage: `${
          newEnabled ? "Enabling" : "Disabling"
        } reverse proxy...`,
      });
    },
    [mutate, request],
  );

  const handleToggleTarget = useCallback(
    async (proxy: ReverseProxy, target: ReverseProxyTarget) => {
      const newEnabled = !target.enabled;
      const updatedTargets = proxy.targets.map((t) => {
        return isSameTarget(t, target) ? { ...t, enabled: newEnabled } : t;
      });

      notify({
        title: proxy.domain,
        description: `Target ${newEnabled ? "enabled" : "disabled"}`,
        promise: request
          .put(
            { ...proxy, targets: sanitizeTargets(updatedTargets) },
            `/${proxy.id}`,
          )
          .then(() => {
            mutate("/reverse-proxies/services");
          }),
        loadingMessage: `${newEnabled ? "Enabling" : "Disabling"} target...`,
      });
    },
    [mutate, request],
  );

  const handleDelete = useCallback(
    async (proxy: ReverseProxy) => {
      const choice = await confirm({
        title: `Delete '${proxy.domain}'?`,
        description:
          "Are you sure you want to delete this reverse proxy? This action cannot be undone.",
        confirmText: "Delete",
        cancelText: "Cancel",
        type: "danger",
      });
      if (!choice) return;

      notify({
        title: proxy.domain,
        description: "Reverse proxy was successfully deleted",
        promise: request.del({}, `/${proxy.id}`).then(() => {
          mutate("/reverse-proxies/services");
        }),
        loadingMessage: "Deleting reverse proxy...",
      });
    },
    [confirm, request, mutate],
  );

  const handleDeleteTarget = useCallback(
    async (proxy: ReverseProxy, target: ReverseProxyTarget) => {
      const isOnlyTarget = proxy.targets.length <= 1;

      const choice = await confirm({
        title: isOnlyTarget ? `Delete '${proxy.domain}'?` : `Delete target?`,
        description: isOnlyTarget
          ? "This is the only target for this service. Deleting it will remove the entire service. This action cannot be undone."
          : "Are you sure you want to delete this target? This action cannot be undone.",
        confirmText: "Delete",
        cancelText: "Cancel",
        type: "danger",
      });
      if (!choice) return;

      if (isOnlyTarget) {
        notify({
          title: proxy.domain,
          description: "Service was successfully deleted",
          promise: request.del({}, `/${proxy.id}`).then(() => {
            mutate("/reverse-proxies/services");
          }),
          loadingMessage: "Deleting service...",
        });
      } else {
        const updatedTargets = proxy.targets.filter((t) => {
          return !isSameTarget(t, target);
        });

        notify({
          title: proxy.domain,
          description: "Target was successfully deleted",
          promise: request
            .put(
              { ...proxy, targets: sanitizeTargets(updatedTargets) },
              `/${proxy.id}`,
            )
            .then(() => {
              mutate("/reverse-proxies/services");
            }),
          loadingMessage: "Deleting target...",
        });
      }
    },
    [confirm, request, mutate],
  );

  const createDomain = useCallback(
    async (
      domain: string,
      targetCluster: string,
    ): Promise<ReverseProxyDomain | undefined> => {
      try {
        const result = await domainRequest.post({
          domain,
          target_cluster: targetCluster,
        });
        mutate("/reverse-proxies/domains");
        return result;
      } catch {
        return undefined;
      }
    },
    [domainRequest, mutate],
  );

  const validateDomain = useCallback(
    async (domainId: string) => {
      // Delay refetch to allow the server to propagate the validation result
      const DOMAIN_VALIDATION_REFETCH_DELAY_MS = 2000;
      notify({
        title: "Domain Validation",
        description: "Domain validation started",
        promise: domainRequest.get(`/${domainId}/validate`).then(() => {
          setTimeout(() => {
            mutate("/reverse-proxies/domains");
          }, DOMAIN_VALIDATION_REFETCH_DELAY_MS);
        }),
        loadingMessage: "Validating domain...",
      });
    },
    [domainRequest, mutate],
  );

  const deleteDomain = useCallback(
    async (domain: ReverseProxyDomain) => {
      const choice = await confirm({
        title: `Delete '${domain.domain}'?`,
        description:
          "Are you sure you want to delete this domain? This action cannot be undone.",
        confirmText: "Delete",
        cancelText: "Cancel",
        type: "danger",
      });
      if (!choice) return;

      notify({
        title: domain.domain,
        description: "Domain was successfully deleted",
        promise: domainRequest.del({}, `/${domain.id}`).then(() => {
          mutate("/reverse-proxies/domains");
        }),
        loadingMessage: "Deleting domain...",
      });
    },
    [confirm, domainRequest, mutate],
  );

  return (
    <ReverseProxiesContext.Provider
      value={{
        reverseProxies,
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
      }}
    >
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

function isSameTarget(a: ReverseProxyTarget, b: ReverseProxyTarget): boolean {
  return (
    a.path === b.path &&
    a.host === b.host &&
    a.port === b.port &&
    a.protocol === b.protocol
  );
}

export function sanitizeTargets(
  targets: ReverseProxyTarget[],
): ReverseProxyTarget[] {
  return targets.map((t) => {
    const { destination: _, ...target } = t;
    if (t.target_type === ReverseProxyTargetType.SUBNET) return target as ReverseProxyTarget;
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
  const host = target.host || resolvedHost || "localhost";
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
