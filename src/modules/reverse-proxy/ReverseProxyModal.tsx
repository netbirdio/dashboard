"use client";

import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import InlineLink, { InlineButtonLink } from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import SettingCard from "@components/SettingCard";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import Paragraph from "@components/Paragraph";
import ModalHeader from "@components/modal/ModalHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { ToggleSwitch } from "@components/ToggleSwitch";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Binary,
  Edit,
  ExternalLinkIcon,
  GlobeIcon,
  LockKeyhole,
  MinusCircleIcon,
  MoreVertical,
  Network as NetworkIcon,
  PlusCircle,
  PlusIcon,
  RectangleEllipsis,
  Server,
  Settings,
  Text,
  Timer,
  Users,
} from "lucide-react";
import { Callout } from "@components/Callout";
import useFetchApi from "@utils/api";
import cidr from "ip-cidr";
import { useRouter } from "next/navigation";
import React, { useCallback, useMemo, useState } from "react";
import ReverseProxyIcon from "@/assets/icons/ReverseProxyIcon";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import {
  REVERSE_PROXY_AUTHENTICATION_DOCS_LINK,
  REVERSE_PROXY_SERVICES_DOCS_LINK,
  REVERSE_PROXY_SETTINGS_DOCS_LINK,
  ReverseProxy,
  ReverseProxyAuth,
  ReverseProxyDomain,
  ReverseProxyDomainType,
  ReverseProxyTarget,
  ReverseProxyTargetProtocol,
  ReverseProxyTargetType,
  ServiceMode,
  isL4Mode as isL4ServiceMode,
} from "@/interfaces/ReverseProxy";
import {
  isResourceTargetType,
  useReverseProxies,
} from "@/contexts/ReverseProxiesProvider";
import { CustomDomainSelector } from "./domain/CustomDomainSelector";
import { cn } from "@utils/helpers";
import AuthPasswordModal from "@/modules/reverse-proxy/auth/AuthPasswordModal";
import AuthPinModal from "@/modules/reverse-proxy/auth/AuthPinModal";
import AuthSSOModal from "@/modules/reverse-proxy/auth/AuthSSOModal";
import ReverseProxyTargetModal from "@/modules/reverse-proxy/targets/ReverseProxyTargetModal";
import useGroupHelper from "@/modules/groups/useGroupHelper";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reverseProxy?: ReverseProxy;
  domains?: ReverseProxyDomain[];
  /** Pre-set the subdomain (e.g. from resource name) */
  initialSubdomain?: string;
  /** Pre-set a resource target - hides target selection in modal */
  initialResource?: NetworkResource;
  initialEndpointMode?: "http" | "tls" | "tcp" | "udp";
  initialPeer?: Peer;
  initialNetwork?: Network;
  initialTab?: string;
  onSuccess?: () => void;
};

// Helper to parse domain into subdomain and base domain
function parseDomain(fullDomain: string): {
  subdomain: string;
  baseDomain: string;
  isCustom: boolean;
} {
  const knownDomains = ["netbird.cloud", "netbird.io", "netbird.app"];

  for (const known of knownDomains) {
    if (fullDomain.endsWith(`.${known}`)) {
      return {
        subdomain: fullDomain.slice(0, -(known.length + 1)),
        baseDomain: known,
        isCustom: false,
      };
    }
  }

  // Custom domain - find the first dot to split
  const firstDot = fullDomain.indexOf(".");
  if (firstDot > 0) {
    return {
      subdomain: fullDomain.slice(0, firstDot),
      baseDomain: fullDomain.slice(firstDot + 1),
      isCustom: true,
    };
  }

  return {
    subdomain: fullDomain,
    baseDomain: "netbird.cloud",
    isCustom: false,
  };
}

export default function ReverseProxyModal({
  open,
  onOpenChange,
  reverseProxy,
  domains,
  initialSubdomain,
  initialResource,
  initialEndpointMode,
  initialPeer,
  initialNetwork,
  initialTab,
  onSuccess,
}: Readonly<Props>) {
  const router = useRouter();
  const { permission } = usePermissions();
  const { confirm } = useDialog();
  const { reverseProxies, handleCreateOrUpdateProxy } = useReverseProxies();

  // Check if the proxy's cluster exists in available free domains
  const isClusterConnected = useMemo(() => {
    if (!reverseProxy?.proxy_cluster) return false;
    return domains?.some(
      (d) =>
        d.type === ReverseProxyDomainType.FREE &&
        d.domain === reverseProxy.proxy_cluster,
    );
  }, [reverseProxy?.proxy_cluster, domains]);

  const [tab, setTab] = useState(() => {
    if (initialTab && initialTab !== "") return initialTab;
    return "targets";
  });

  // Parse existing domain if editing
  // TCP/UDP store bare cluster domain; HTTP/TLS store subdomain.cluster
  const isEditingPortBased = reverseProxy?.mode === ServiceMode.TCP || reverseProxy?.mode === ServiceMode.UDP;
  const parsed = reverseProxy?.domain && !isEditingPortBased ? parseDomain(reverseProxy.domain) : null;

  // Form state: for TCP/UDP, subdomain holds the service name
  const [subdomain, setSubdomain] = useState(() => {
    if (isEditingPortBased) return reverseProxy?.name || "";
    return parsed?.subdomain ||
      initialSubdomain
        ?.toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "") ||
      "";
  });

  const [baseDomain, setBaseDomain] = useState(() => {
    if (isEditingPortBased && reverseProxy?.domain) return reverseProxy.domain;
    if (parsed?.baseDomain) return parsed.baseDomain;
    const validatedDomains = domains?.filter((d) => d.validated) || [];
    const customDomain = validatedDomains.find(
      (d) => d.type === ReverseProxyDomainType.CUSTOM,
    );
    const freeDomain = validatedDomains.find(
      (d) => d.type === ReverseProxyDomainType.FREE,
    );
    return customDomain?.domain || freeDomain?.domain || "";
  });

  type EndpointMode = "http" | "tls" | "tcp" | "udp";

  // Endpoint mode derived from protocol field
  const [endpointMode, setEndpointMode_] = useState<EndpointMode>(() => {
    if (reverseProxy?.mode) {
      const p = reverseProxy.mode as string;
      if (p === "tls" || p === "tcp" || p === "udp") return p;
    }
    return (initialEndpointMode as EndpointMode) ?? "http";
  });

  // Fetch peers & resources for TLS target selector
  const { data: peers } = useFetchApi<Peer[]>("/peers");
  const { data: resources } = useFetchApi<NetworkResource[]>(
    "/networks/resources",
  );

  // L4 target selection state (TLS/TCP/UDP) - target is in targets[0]
  const existingL4Target = isL4ServiceMode(reverseProxy?.mode) ? reverseProxy?.targets?.[0] : undefined;
  const existingL4IsPeer = existingL4Target?.target_type === ReverseProxyTargetType.PEER;

  const [tlsTargetType, setTlsTargetType] = useState<ReverseProxyTargetType>(
    existingL4Target
      ? existingL4Target.target_type
      : initialResource
        ? ReverseProxyTargetType.HOST
        : ReverseProxyTargetType.PEER,
  );
  const [tlsPeerId, setTlsPeerId] = useState<string | undefined>(
    existingL4IsPeer ? existingL4Target?.target_id : initialPeer?.id,
  );
  const [tlsResourceId, setTlsResourceId] = useState<string | undefined>(
    existingL4Target
      ? existingL4IsPeer
        ? undefined
        : existingL4Target.target_id
      : initialResource?.id,
  );
  const [tlsHost, setTlsHost] = useState(() => {
    if (existingL4Target?.host) return existingL4Target.host;
    if (initialPeer) return initialPeer.ip;
    if (initialResource) {
      const addr = initialResource.address;
      return addr.includes("/") ? addr.split("/")[0] : addr;
    }
    return "";
  });
  const [tlsPort, setTlsPort] = useState<number>(existingL4Target?.port || 0);
  const [tlsListenPort, setTlsListenPort] = useState<number>(
    reverseProxy?.listen_port || 0,
  );

  const hasTlsTarget = !!tlsPeerId || !!tlsResourceId;

  // CIDR detection for TLS subnet resources
  const tlsResourceAddress = useMemo(() => {
    if (!tlsResourceId) return "";
    const resource = resources?.find((r) => r.id === tlsResourceId);
    return resource?.address || "";
  }, [tlsResourceId, resources]);

  const tlsCidrInfo = useMemo(() => {
    if (!tlsResourceAddress) return null;
    if (!cidr.isValidCIDR(tlsResourceAddress)) return null;
    try {
      return new cidr(tlsResourceAddress);
    } catch {
      return null;
    }
  }, [tlsResourceAddress]);

  const tlsIsCidrRange = useMemo(() => {
    if (!tlsCidrInfo) return false;
    const parts = tlsResourceAddress.split("/");
    const mask = parts.length === 2 ? parseInt(parts[1], 10) : 32;
    return mask < 32;
  }, [tlsCidrInfo, tlsResourceAddress]);

  const tlsIsHostEditable = tlsIsCidrRange;

  const tlsIsHostInCidrRange = useMemo(() => {
    if (!tlsCidrInfo || !tlsHost) return false;
    if (!cidr.isValidAddress(tlsHost)) return false;
    return tlsCidrInfo.contains(tlsHost);
  }, [tlsCidrInfo, tlsHost]);

  const tlsIsValidCidrHost =
    !tlsIsCidrRange || (!!tlsHost && tlsIsHostInCidrRange);

  const setEndpointMode = useCallback(
    (mode: EndpointMode) => {
      setEndpointMode_(mode);
    },
    [],
  );

  // Proxy protocol: for L4 modes maps to target proxy_protocol
  const [proxyProtocol, setProxyProtocol] = useState(
    existingL4Target?.options?.proxy_protocol ?? false,
  );

  const [requestTimeout, setRequestTimeout] = useState(
    existingL4Target?.options?.request_timeout ?? existingL4Target?.options?.session_idle_timeout ?? "",
  );

  const [targets, setTargets] = useState<ReverseProxyTarget[]>(
    reverseProxy?.targets || [],
  );

  const isL4Mode = endpointMode === "tls" || endpointMode === "tcp" || endpointMode === "udp";
  // TCP/UDP use bare cluster domain + port; TLS uses subdomain (SNI routing) like HTTP
  const isPortBased = endpointMode === "tcp" || endpointMode === "udp";

  // Check if the selected cluster supports custom listen ports
  const clusterSupportsCustomPorts = useMemo(() => {
    const selectedDomain = domains?.find(
      (d) => d.domain === baseDomain || d.target_cluster === baseDomain,
    );
    return selectedDomain?.supports_custom_ports ?? false;
  }, [domains, baseDomain]);

  const hasAnyEndpoint =
    (endpointMode === "http" && targets.length > 0) ||
    (isL4Mode &&
      hasTlsTarget &&
      tlsIsValidCidrHost &&
      tlsPort >= 1 &&
      tlsPort <= 65535 &&
      (isPortBased && !clusterSupportsCustomPorts
        ? true
        : tlsListenPort >= 1 && tlsListenPort <= 65535));

  const [passHostHeader, setPassHostHeader] = useState(
    reverseProxy?.pass_host_header ?? false,
  );
  const [rewriteRedirects, setRewriteRedirects] = useState(
    reverseProxy?.rewrite_redirects ?? false,
  );

  // Compute full domain
  const fullDomain = useMemo(() => {
    if (!baseDomain) return subdomain;
    return `${subdomain}.${baseDomain}`;
  }, [subdomain, baseDomain]);

  const domainAlreadyExists = useMemo(() => {
    if (!reverseProxies || !fullDomain) return false;
    return reverseProxies.some(
      (p) => p.domain === fullDomain && p.id !== reverseProxy?.id,
    );
  }, [reverseProxies, fullDomain, reverseProxy?.id]);

  // Authentication options - initialized from existing reverseProxy.auth
  const [passwordEnabled, setPasswordEnabled] = useState(
    reverseProxy?.auth?.password_auth?.enabled ?? false,
  );
  const [password, setPassword] = useState(
    reverseProxy?.auth?.password_auth?.password ?? "",
  );
  const [pinEnabled, setPinEnabled] = useState(
    reverseProxy?.auth?.pin_auth?.enabled ?? false,
  );
  const [pin, setPin] = useState(reverseProxy?.auth?.pin_auth?.pin ?? "");
  const [bearerEnabled, setBearerEnabled] = useState(
    reverseProxy?.auth?.bearer_auth?.enabled ?? false,
  );

  const [bearerGroups, setBearerGroups, { save: saveGroups }] = useGroupHelper({
    initial: reverseProxy?.auth?.bearer_auth?.distribution_groups ?? [],
  });

  const [linkAuthEnabled, setLinkAuthEnabled] = useState(
    reverseProxy?.auth?.link_auth?.enabled ?? false,
  );

  // Auth modal states
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [ssoModalOpen, setSsoModalOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);

  // Target being added/edited
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [editingTargetIndex, setEditingTargetIndex] = useState<number | null>(
    null,
  );

  const isSubdomainValid = useMemo(() => {
    if (isPortBased) {
      return baseDomain.length > 0;
    }
    // HTTP and TLS both use subdomain.domain, check uniqueness
    return (
      subdomain.length > 0 && baseDomain.length > 0 && !domainAlreadyExists
    );
  }, [subdomain, baseDomain, domainAlreadyExists, isPortBased]);

  const canContinueToSettings = useMemo(() => {
    if (!isSubdomainValid) return false;
    if (!hasAnyEndpoint) return false;
    return true;
  }, [isSubdomainValid, hasAnyEndpoint]);

  const submitDisabled = useMemo(() => {
    return !canContinueToSettings;
  }, [canContinueToSettings]);

  const saveTarget = (targetData: ReverseProxyTarget) => {
    if (editingTargetIndex !== null) {
      // Update existing target
      setTargets(
        targets.map((t, i) =>
          i === editingTargetIndex ? { ...t, ...targetData } : t,
        ),
      );
    } else {
      // Add new target
      setTargets([...targets, targetData]);
    }
    setTargetModalOpen(false);
    setEditingTargetIndex(null);
  };

  const editTarget = (index: number) => {
    setEditingTargetIndex(index);
    setTargetModalOpen(true);
  };

  const removeTarget = (index: number) => {
    setTargets(targets.filter((_, i) => i !== index));
  };

  const toggleTargetEnabled = (index: number) => {
    setTargets(
      targets.map((t, i) => (i === index ? { ...t, enabled: !t.enabled } : t)),
    );
  };

  const hasNoAuth =
    !passwordEnabled && !pinEnabled && !bearerEnabled && !linkAuthEnabled;

  const handleSubmit = async () => {
    // Show warning if no authentication is configured (HTTP only; TLS is pass-through)
    if (endpointMode === "http" && hasNoAuth) {
      const confirmed = await confirm({
        title: "No Authentication Configured",
        description:
          "This service will be publicly accessible to everyone on the internet without any restrictions. Are you sure you want to continue?",
        type: "warning",
        confirmText: reverseProxy ? "Save Changes" : "Add Service",
        cancelText: "Cancel",
        maxWidthClass: "max-w-lg",
      });
      if (!confirmed) return;
    }

    const savedGroups = await saveGroups();

    const auth: ReverseProxyAuth = {
      password_auth: {
        enabled: passwordEnabled,
        password: password,
      },
      pin_auth: {
        enabled: pinEnabled,
        pin: pin,
      },
      bearer_auth: {
        enabled: bearerEnabled,
        distribution_groups: savedGroups.map((g) => g.id as string),
      },
      link_auth: {
        enabled: linkAuthEnabled,
      },
    };

    const isHTTPMode = endpointMode === "http";

    const l4TargetType =
      tlsTargetType === ReverseProxyTargetType.PEER
        ? ReverseProxyTargetType.PEER
        : tlsTargetType === ReverseProxyTargetType.SUBNET
          ? ReverseProxyTargetType.SUBNET
          : ReverseProxyTargetType.HOST;

    const l4Target: ReverseProxyTarget = {
      target_id: tlsPeerId || tlsResourceId || "",
      target_type: l4TargetType,
      port: tlsPort,
      protocol: endpointMode as ReverseProxyTargetProtocol,
      host: tlsIsCidrRange ? tlsHost : undefined,
      enabled: true,
      options: (endpointMode !== "udp" && proxyProtocol) || requestTimeout ? {
        ...(endpointMode !== "udp" && proxyProtocol ? { proxy_protocol: true } : {}),
        ...(requestTimeout ? { [endpointMode === "udp" ? "session_idle_timeout" : "request_timeout"]: requestTimeout } : {}),
      } : undefined,
    };

    // TCP/UDP use bare cluster domain; HTTP and TLS use subdomain.domain
    const serviceDomain = isPortBased ? baseDomain : fullDomain;

    handleCreateOrUpdateProxy({
      data: {
        name: isPortBased ? (subdomain || reverseProxy?.name || `${endpointMode}-${tlsPort}`) : fullDomain,
        domain: serviceDomain,
        mode: isHTTPMode ? undefined : (endpointMode as ServiceMode),
        listen_port: isL4Mode && (!isPortBased || clusterSupportsCustomPorts) ? tlsListenPort : undefined,
        targets: isHTTPMode ? targets : [l4Target],
        enabled: reverseProxy?.enabled ?? true,
        pass_host_header: isHTTPMode ? passHostHeader : undefined,
        rewrite_redirects: isHTTPMode ? rewriteRedirects : undefined,
        auth: isHTTPMode ? auth : undefined,
      },
      proxyId: reverseProxy?.id,
      onSuccess: () => {
        onOpenChange(false);
        onSuccess?.();
      },
    });
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
      <ModalContent
        maxWidthClass={tab === "service" ? "max-w-xl" : "max-w-2xl"}
      >
        <ModalHeader
          icon={<ReverseProxyIcon className={"fill-netbird"} size={18} />}
          title={
            reverseProxy
              ? "Edit Service"
              : initialEndpointMode === "tls"
                ? "Add TLS Passthrough"
                : initialEndpointMode === "tcp"
                  ? "Add TCP Service"
                  : initialEndpointMode === "udp"
                    ? "Add UDP Service"
                    : initialEndpointMode === "http"
                      ? "Add HTTP Service"
                      : "Add Service"
          }
          description={
            isL4Mode
              ? "Forward traffic directly to your backend."
              : "Expose services securely through NetBird's reverse proxy."
          }
          color={"netbird"}
        />

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList justify={"start"} className={"px-8"}>
            <TabsTrigger value={"targets"}>
              <Text size={14} />
              Details
            </TabsTrigger>
            {endpointMode === "http" && (
              <TabsTrigger
                value={"auth"}
                disabled={!canContinueToSettings}
              >
                <LockKeyhole size={16} />
                Authentication
              </TabsTrigger>
            )}
            <TabsTrigger value={"settings"} disabled={!canContinueToSettings}>
              <Settings size={14} />
              Advanced Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value={"targets"} className={"pb-8"}>
            <div className={"px-8 flex-col flex gap-6"}>
              {isPortBased ? (
                <>
                  <div>
                    <Label>
                      <GlobeIcon size={14} />
                      Proxy Cluster
                    </Label>
                    <HelpText>Select the proxy cluster to handle this service.</HelpText>
                    <CustomDomainSelector
                      value={baseDomain}
                      onChange={setBaseDomain}
                      className="mt-2"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <Label>
                    <GlobeIcon size={14} />
                    Domain
                  </Label>
                  <HelpText>
                    Enter a subdomain and select a domain for your service.
                  </HelpText>
                  <div className="flex items-start mt-2">
                    <div className="flex-1 min-w-0">
                      <Input
                        autoFocus
                        value={subdomain}
                        onChange={(e) => {
                          setSubdomain(
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9-]/g, ""),
                          );
                        }}
                        error={
                          domainAlreadyExists
                            ? "This domain is already used by another service."
                            : undefined
                        }
                        placeholder={"myapp"}
                        className="!rounded-r-none !border-r-0"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CustomDomainSelector
                        value={baseDomain}
                        onChange={setBaseDomain}
                        className="!rounded-l-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {reverseProxy?.proxy_cluster && !isClusterConnected && (
                <Callout variant={"error"}>
                  Cluster {reverseProxy.proxy_cluster} is offline. Make sure the
                  proxy server is running and connected to the right management
                  address.
                </Callout>
              )}

              <div className="flex flex-col gap-4">
                {!initialEndpointMode && !reverseProxy && (
                  <>
                    <div>
                      <Label>
                        <NetworkIcon size={14} />
                        Endpoint Type
                      </Label>
                      <HelpText>
                        Choose how traffic is forwarded to your backend.
                      </HelpText>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { mode: "http" as EndpointMode, icon: <Server size={14} />, label: "HTTP", desc: "Reverse proxy with path routing, auth, and load balancing." },
                        { mode: "tls" as EndpointMode, icon: <LockKeyhole size={14} />, label: "TLS Passthrough", desc: "Direct TCP relay via SNI routing." },
                        { mode: "tcp" as EndpointMode, icon: <ArrowRight size={14} />, label: "TCP", desc: "TCP relay to a backend on a dedicated port." },
                        { mode: "udp" as EndpointMode, icon: <ArrowRight size={14} />, label: "UDP", desc: "UDP relay to a backend on a dedicated port." },
                      ]).map(({ mode, icon, label, desc }) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setEndpointMode(mode)}
                          className={cn(
                            "rounded-md border px-4 py-3 text-left transition-all",
                            endpointMode === mode
                              ? "border-green-500/30 bg-green-500/5"
                              : "border-nb-gray-800 bg-nb-gray-920/30 hover:border-nb-gray-700",
                          )}
                        >
                          <div className="flex items-center gap-2 text-sm font-medium">
                            {icon}
                            {label}
                          </div>
                          <div className="text-xs text-nb-gray-400 mt-1">
                            {desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {isL4Mode && (
                  <>
                    <div>
                      <Label>Target Device</Label>
                      <HelpText>
                        Select the peer or resource running your backend.
                      </HelpText>
                      <PeerGroupSelector
                        values={[]}
                        onChange={() => {}}
                        placeholder="Select a peer or resource..."
                        showPeers={true}
                        showResources={true}
                        showRoutes={false}
                        hideAllGroup={true}
                        hideGroupsTab={true}
                        tabOrder={["peers", "resources"]}
                        closeOnSelect={true}
                        max={1}
                        resource={
                          isResourceTargetType(tlsTargetType) && tlsResourceId
                            ? { id: tlsResourceId, type: "host" }
                            : tlsTargetType === ReverseProxyTargetType.PEER && tlsPeerId
                            ? { id: tlsPeerId, type: "peer" }
                            : undefined
                        }
                        onResourceChange={(res) => {
                          if (res) {
                            if (res.type === "peer") {
                              setTlsTargetType(ReverseProxyTargetType.PEER);
                              setTlsPeerId(res.id);
                              setTlsResourceId(undefined);
                              const peer = peers?.find((p) => p.id === res.id);
                              setTlsHost(peer?.ip || "");
                            } else {
                              const selectedResource = resources?.find(
                                (r) => r.id === res.id,
                              );
                              setTlsTargetType(
                                (selectedResource?.type as ReverseProxyTargetType) ??
                                  ReverseProxyTargetType.HOST,
                              );
                              setTlsResourceId(res.id);
                              setTlsPeerId(undefined);
                              const address = selectedResource?.address || "";
                              setTlsHost(
                                address.includes("/")
                                  ? address.split("/")[0]
                                  : address,
                              );
                            }
                          } else {
                            setTlsPeerId(undefined);
                            setTlsResourceId(undefined);
                            setTlsHost("");
                          }
                        }}
                      />
                    </div>
                    <div>
                      <Label>Ports</Label>
                      <HelpText>
                        {!isPortBased || clusterSupportsCustomPorts
                          ? "The public listen port and the destination port on the target device."
                          : "The destination port on the target device. The public listen port will be auto-assigned."}
                      </HelpText>
                      {tlsCidrInfo && (
                        <HelpText className="!mt-1">
                          Enter an IP address within {tlsResourceAddress}
                        </HelpText>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1">
                          <Input
                            type="number"
                            min={1}
                            max={65535}
                            placeholder={isPortBased && !clusterSupportsCustomPorts ? "Auto" : "443"}
                            value={isPortBased && !clusterSupportsCustomPorts ? "" : (tlsListenPort || "")}
                            onChange={(e) =>
                              setTlsListenPort(parseInt(e.target.value) || 0)
                            }
                            disabled={isPortBased && !clusterSupportsCustomPorts}
                          />
                        </div>
                        <ArrowRight
                          size={16}
                          className="text-nb-gray-400 shrink-0"
                        />
                        <div className="flex-1">
                          <Input
                            value={tlsHost || (tlsIsHostEditable ? "" : "—")}
                            onChange={(e) => {
                              if (tlsIsHostEditable) {
                                setTlsHost(
                                  e.target.value.replace(/[^0-9.]/g, ""),
                                );
                              }
                            }}
                            placeholder={tlsIsHostEditable ? "e.g., 10.0.0.5" : ""}
                            disabled={!hasTlsTarget}
                            readOnly={hasTlsTarget && !tlsIsHostEditable}
                            className={
                              !tlsIsHostEditable
                                ? "!text-nb-gray-400 font-mono !text-xs"
                                : "font-mono !text-xs"
                            }
                          />
                        </div>
                        <span className="text-nb-gray-500 shrink-0 font-mono">
                          :
                        </span>
                        <div className="w-[120px] shrink-0">
                          <Input
                            type="number"
                            min={1}
                            max={65535}
                            placeholder="443"
                            value={tlsPort || ""}
                            onChange={(e) =>
                              setTlsPort(parseInt(e.target.value) || 0)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {endpointMode === "http" && (
              <div>
                <Label>
                  <Server size={14} />
                  HTTP Targets
                </Label>
                <HelpText>
                  Add one or more devices running your service or resources to
                  make it publicly accessible.
                </HelpText>

                {targets.length > 0 && (
                  <div
                    className={
                      "mt-3 mb-3 overflow-hidden border border-nb-gray-900 bg-nb-gray-920/30 py-1 px-1 rounded-md "
                    }
                  >
                    <table className="w-full">
                      <tbody>
                        {targets.map((target, index) => (
                          <tr
                            key={index}
                            onClick={() => editTarget(index)}
                            className="rounded-md hover:bg-nb-gray-900/30 cursor-pointer transition-all"
                          >
                            <td className="py-2.5 pl-5 pr-2 align-middle">
                              <span className="text-[11px] leading-none font-mono px-2.5 py-2 rounded bg-nb-gray-900 text-nb-gray-300 inline-flex items-center">
                                {target.path
                                  ? target.path.startsWith("/")
                                    ? target.path
                                    : `/${target.path}`
                                  : "/"}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 align-middle">
                              <ArrowRight
                                size={12}
                                className="text-nb-gray-400"
                              />
                            </td>
                            <td className="py-2.5 pr-2 align-middle">
                              <TargetDestination target={target} />
                            </td>
                            <td className="py-2.5 pl-2 pr-4">
                              <div
                                className="flex items-center gap-2 justify-end"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ToggleSwitch
                                  size="small"
                                  checked={target.enabled !== false}
                                  onCheckedChange={() =>
                                    toggleTargetEnabled(index)
                                  }
                                />
                                <DropdownMenu modal={false}>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="default-outline"
                                      className="!px-3"
                                    >
                                      <MoreVertical
                                        size={16}
                                        className="shrink-0"
                                      />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    className="w-auto min-w-[200px]"
                                    align="end"
                                  >
                                    <DropdownMenuItem
                                      onClick={() => editTarget(index)}
                                    >
                                      <div className="flex gap-3 items-center">
                                        <Edit size={14} className="shrink-0" />
                                        Edit Target
                                      </div>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      variant={"danger"}
                                      onClick={() => removeTarget(index)}
                                    >
                                      <div className="flex gap-3 items-center">
                                        <MinusCircleIcon
                                          size={14}
                                          className="shrink-0"
                                        />
                                        Remove Target
                                      </div>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <Button
                  variant="dotted"
                  className={cn("w-full mt-1", targets?.length > 0 && "mt-1")}
                  size="sm"
                  onClick={() => setTargetModalOpen(true)}
                  disabled={
                    !!(initialNetwork && !initialNetwork.resources?.length)
                  }
                >
                  <PlusIcon size={14} />
                  Add Target
                </Button>

                {initialNetwork && !initialNetwork.resources?.length && (
                  <Callout
                    variant="warning"
                    className="mt-3"
                    icon={
                      <AlertTriangle
                        size={14}
                        className="shrink-0 relative top-[3px]"
                      />
                    }
                  >
                    There are currently no resources in your network{" "}
                    <span className={"text-netbird-100 font-medium"}>
                      {initialNetwork?.name}
                    </span>
                    . Add resources to your network before exposing it as a
                    service.{" "}
                    <InlineButtonLink
                      variant={"default"}
                      onClick={() => {
                        onOpenChange(false);
                        router.push(
                          `/network?id=${initialNetwork.id}&tab=resources`,
                        );
                      }}
                    >
                      Go to Resources
                      <ArrowUpRight size={14} />
                    </InlineButtonLink>
                  </Callout>
                )}
              </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value={"auth"} className={"pb-8"}>
            <div className={"px-8 flex-col flex gap-4"}>
              <SettingCard>
                <SettingCard.Item
                  label={
                    <>
                      <Users size={15} />
                      SSO (Single Sign-On)
                    </>
                  }
                  description="Require users to authenticate via SSO to access this service."
                  enabled={bearerEnabled}
                  onClick={() => setSsoModalOpen(true)}
                />
                <SettingCard.Item
                  label={
                    <>
                      <RectangleEllipsis size={15} />
                      Password
                    </>
                  }
                  description="Require a password to access this service."
                  enabled={passwordEnabled}
                  onClick={() => setPasswordModalOpen(true)}
                />
                <SettingCard.Item
                  label={
                    <>
                      <Binary size={15} />
                      PIN Code
                    </>
                  }
                  description="Require a numeric PIN code to access this service."
                  enabled={pinEnabled}
                  onClick={() => setPinModalOpen(true)}
                />
              </SettingCard>
            </div>
          </TabsContent>

          <TabsContent value={"settings"} className={"pb-8"}>
            <div className={"px-8 flex-col flex gap-4"}>
              {(endpointMode === "tcp" || endpointMode === "tls") && (
                <FancyToggleSwitch
                  value={proxyProtocol}
                  onChange={setProxyProtocol}
                  label={
                    <>
                      <NetworkIcon size={15} />
                      PROXY Protocol v2
                    </>
                  }
                  helpText="Send a PROXY protocol v2 header to the backend with the real client IP."
                />
              )}
              {isL4Mode && (
                <div className={"px-6 py-4 border rounded-md border-nb-gray-910 bg-nb-gray-900/30"}>
                  <div className={"flex justify-between gap-10"}>
                    <div className={"max-w-sm"}>
                      <Label>
                        <Timer size={15} />
                        {endpointMode === "udp" ? "Session Idle Timeout" : "Connection Timeout"}
                      </Label>
                      <HelpText margin={false}>
                        {endpointMode === "udp"
                          ? "Close the UDP session after this period of inactivity."
                          : "Timeout for establishing backend connections."}
                      </HelpText>
                    </div>
                    <div className={"mt-1"}>
                      <Input
                        value={requestTimeout}
                        onChange={(e) => setRequestTimeout(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder={'30s'}
                        maxWidthClass={"w-[100px]"}
                      />
                    </div>
                  </div>
                </div>
              )}
              {endpointMode === "http" && (
                <>
                  <FancyToggleSwitch
                    value={passHostHeader}
                    onChange={setPassHostHeader}
                    label={
                      <>
                        <GlobeIcon size={15} />
                        Pass Host Header
                      </>
                    }
                    helpText="Forward the original Host header to the backend instead of rewriting it to the target address."
                  />
                  <FancyToggleSwitch
                    value={rewriteRedirects}
                    onChange={setRewriteRedirects}
                    label={
                      <>
                        <ArrowRight size={15} />
                        Rewrite Redirects
                      </>
                    }
                    helpText="Rewrite Location headers in backend responses to use the public domain instead of the internal backend address."
                  />
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <ModalFooter className={"items-center"}>
          <div className={"w-full"}>
            {tab === "targets" && (
              <Paragraph className={"text-sm mt-auto"}>
                Learn more about
                <InlineLink
                  href={REVERSE_PROXY_SERVICES_DOCS_LINK}
                  target={"_blank"}
                >
                  Services
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </Paragraph>
            )}

            {tab === "auth" && (
              <Paragraph className={"text-sm mt-auto"}>
                Learn more about
                <InlineLink
                  href={REVERSE_PROXY_AUTHENTICATION_DOCS_LINK}
                  target={"_blank"}
                >
                  Authentication
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </Paragraph>
            )}

            {tab === "settings" && (
              <Paragraph className={"text-sm mt-auto"}>
                Learn more about
                <InlineLink
                  href={REVERSE_PROXY_SETTINGS_DOCS_LINK}
                  target={"_blank"}
                >
                  Settings
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </Paragraph>
            )}
          </div>
          <div className={"flex gap-3 w-full justify-end"}>
            {!reverseProxy ? (
              <>
                {tab === "targets" && (
                  <>
                    <ModalClose asChild>
                      <Button variant={"secondary"}>Cancel</Button>
                    </ModalClose>
                    {endpointMode === "udp" ? (
                      <Button
                        variant={"primary"}
                        disabled={submitDisabled || !permission?.services?.create}
                        onClick={handleSubmit}
                      >
                        <PlusCircle size={16} />
                        Add Service
                      </Button>
                    ) : (
                      <Button
                        variant={"primary"}
                        onClick={() =>
                          setTab(isL4Mode ? "settings" : "auth")
                        }
                        disabled={!canContinueToSettings}
                      >
                        Continue
                      </Button>
                    )}
                  </>
                )}

                {tab === "auth" && (
                  <>
                    <Button
                      variant={"secondary"}
                      onClick={() => setTab("targets")}
                    >
                      Back
                    </Button>
                    <Button
                      variant={"primary"}
                      onClick={() => setTab("settings")}
                    >
                      Continue
                    </Button>
                  </>
                )}

                {tab === "settings" && (
                  <>
                    <Button
                      variant={"secondary"}
                      onClick={() =>
                        setTab(isL4Mode ? "targets" : "auth")
                      }
                    >
                      Back
                    </Button>
                    <Button
                      variant={"primary"}
                      disabled={submitDisabled || !permission?.services?.create}
                      onClick={handleSubmit}
                    >
                      <PlusCircle size={16} />
                      Add Service
                    </Button>
                  </>
                )}
              </>
            ) : (
              <>
                <ModalClose asChild>
                  <Button variant={"secondary"}>Cancel</Button>
                </ModalClose>
                <Button
                  variant={"primary"}
                  disabled={submitDisabled || !permission?.services?.update}
                  onClick={handleSubmit}
                >
                  Save Changes
                </Button>
              </>
            )}
          </div>
        </ModalFooter>
      </ModalContent>

      <ReverseProxyTargetModal
        key={targetModalOpen ? 1 : 0}
        open={targetModalOpen}
        onOpenChange={(open) => {
          setTargetModalOpen(open);
          if (!open) setEditingTargetIndex(null);
        }}
        onSave={saveTarget}
        currentTarget={
          editingTargetIndex !== null ? targets[editingTargetIndex] : null
        }
        reverseProxy={{
          id: reverseProxy?.id || "",
          name: fullDomain,
          domain: fullDomain,
          targets: targets,
          enabled: reverseProxy?.enabled ?? true,
          mode: endpointMode as ServiceMode,
        }}
        initialResource={initialResource}
        initialPeer={initialPeer}
        initialNetwork={initialNetwork}
      />

      <AuthPasswordModal
        open={passwordModalOpen}
        key={passwordModalOpen ? "pass1" : "pass0"}
        onOpenChange={setPasswordModalOpen}
        currentPassword={password}
        isEnabled={passwordEnabled}
        onSave={(newPassword) => {
          setTimeout(() => {
            setPassword(newPassword);
            setPasswordEnabled(true);
          }, 200);
        }}
        onRemove={() => {
          setTimeout(() => {
            setPassword("");
            setPasswordEnabled(false);
          }, 200);
        }}
      />

      <AuthSSOModal
        open={ssoModalOpen}
        onOpenChange={setSsoModalOpen}
        key={ssoModalOpen ? "sso1" : "sso0"}
        currentGroups={bearerGroups}
        isEnabled={bearerEnabled}
        onSave={(groups) => {
          setTimeout(() => {
            setBearerGroups(groups);
            setBearerEnabled(true);
          }, 200);
        }}
        onRemove={() => {
          setTimeout(() => {
            setBearerGroups([]);
            setBearerEnabled(false);
          }, 200);
        }}
      />

      <AuthPinModal
        open={pinModalOpen}
        onOpenChange={setPinModalOpen}
        key={pinModalOpen ? "p1" : "p0"}
        currentPin={pin}
        isEnabled={pinEnabled}
        onSave={(newPin) => {
          setTimeout(() => {
            setPin(newPin);
            setPinEnabled(true);
          }, 200);
        }}
        onRemove={() => {
          setTimeout(() => {
            setPin("");
            setPinEnabled(false);
          }, 200);
        }}
      />
    </Modal>
  );
}

function TargetDestination({ target }: { target: ReverseProxyTarget }) {
  const { resolveDestination } = useReverseProxies();
  return (
    <span className="text-[0.76rem] text-nb-gray-200 whitespace-nowrap font-mono">
      {resolveDestination(target)}
    </span>
  );
}
