"use client";

import Button from "@components/Button";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import FullTooltip from "@components/FullTooltip";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
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
import {
  ArrowRight,
  Binary,
  CircleUser,
  ClockFadingIcon,
  ExternalLinkIcon,
  FileCode2Icon,
  GlobeIcon,
  LockKeyhole,
  MapPinned,
  NetworkIcon,
  PlusCircle,
  RectangleEllipsis,
  RouteIcon,
  Settings,
  ShieldCheckIcon,
  Users,
} from "lucide-react";
import { Callout } from "@components/Callout";
import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";
import ReverseProxyIcon from "@/assets/icons/ReverseProxyIcon";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import {
  AccessRestrictions,
  HeaderAuthConfig,
  isL4Mode as isL4ServiceMode,
  REVERSE_PROXY_ACCESS_CONTROL_DOCS_LINK,
  REVERSE_PROXY_AUTHENTICATION_DOCS_LINK,
  REVERSE_PROXY_SERVICES_DOCS_LINK,
  REVERSE_PROXY_SETTINGS_DOCS_LINK,
  ReverseProxy,
  ReverseProxyAuth,
  ReverseProxyDomain,
  ReverseProxyTarget,
  ReverseProxyTargetProtocol,
  ReverseProxyTargetType,
  ServiceMode,
} from "@/interfaces/ReverseProxy";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import ReverseProxyDomainInput from "./domain/ReverseProxyDomainInput";
import { useReverseProxyDomain } from "./domain/useReverseProxyDomain";
import AuthPasswordModal from "@/modules/reverse-proxy/auth/AuthPasswordModal";
import AuthHeaderModal from "@/modules/reverse-proxy/auth/AuthHeaderModal";
import AuthPinModal from "@/modules/reverse-proxy/auth/AuthPinModal";
import AuthSSOModal from "@/modules/reverse-proxy/auth/AuthSSOModal";
import AuthNetBirdOnlyModal from "@/modules/reverse-proxy/auth/AuthNetBirdOnlyModal";
import ReverseProxyHTTPTargets from "@/modules/reverse-proxy/ReverseProxyHTTPTargets";
import ReverseProxyLayer4Content from "@/modules/reverse-proxy/ReverseProxyLayer4Content";
import ReverseProxyTargetModal from "@/modules/reverse-proxy/targets/ReverseProxyTargetModal";
import { type Target } from "@/modules/reverse-proxy/targets/ReverseProxyTargetSelector";
import { useReverseProxyAddress } from "@/modules/reverse-proxy/targets/ReverseProxyAddressInput";
import {
  validateSessionIdleTimeout,
  validateTimeout,
} from "@/modules/reverse-proxy/targets/useReverseProxyTargetOptions";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import { Group } from "@/interfaces/Group";
import {
  ReverseProxyServiceModeSelector,
  SERVICE_MODES,
} from "@/modules/reverse-proxy/ReverseProxyServiceModeSelector";
import { ReverseProxyAccessControlRules } from "@/modules/reverse-proxy/ReverseProxyAccessControlRules";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reverseProxy?: ReverseProxy;
  domains?: ReverseProxyDomain[];
  /** Pre-set the subdomain (e.g. from resource name) */
  initialSubdomain?: string;
  /** Pre-set a resource target - hides target selection in modal */
  initialResource?: NetworkResource;
  initialPeer?: Peer;
  initialNetwork?: Network;
  initialTab?: string;
  onSuccess?: () => void;
};

export default function ReverseProxyModal({
  open,
  onOpenChange,
  reverseProxy,
  domains,
  initialSubdomain,
  initialResource,
  initialPeer,
  initialNetwork,
  initialTab,
  onSuccess,
}: Readonly<Props>) {
  const router = useRouter();
  const { permission } = usePermissions();
  const { confirm } = useDialog();
  const { handleCreateOrUpdateProxy } = useReverseProxies();

  const {
    subdomain,
    setSubdomain,
    baseDomain,
    setBaseDomain,
    fullDomain,
    domainAlreadyExists,
    isClusterConnected,
  } = useReverseProxyDomain({ reverseProxy, domains, initialSubdomain });

  const [tab, setTab] = useState(() => {
    if (initialTab && initialTab !== "") return initialTab;
    return "targets";
  });

  const [serviceMode, setServiceMode] = useState<ServiceMode>(
    reverseProxy?.mode ?? ServiceMode.HTTP,
  );

  const isL4Mode = isL4ServiceMode(serviceMode);

  // L4 target selection state (TLS/TCP/UDP) - target is in targets[0]
  const [l4Target, setL4Target] = useState<Target | undefined>(() => {
    const existing = isL4ServiceMode(reverseProxy?.mode)
      ? reverseProxy?.targets?.[0]
      : undefined;
    if (existing) {
      const isPeer = existing.target_type === ReverseProxyTargetType.PEER;
      return {
        type: existing.target_type,
        peerId: isPeer ? existing.target_id : undefined,
        resourceId: isPeer ? undefined : existing.target_id,
        host: existing.host || "",
      };
    }
    if (initialResource) {
      const addr = initialResource.address;
      return {
        type:
          (initialResource.type as ReverseProxyTargetType) ??
          ReverseProxyTargetType.HOST,
        resourceId: initialResource.id,
        host: addr.includes("/") ? addr.split("/")[0] : addr,
      };
    }
    if (initialPeer) {
      return {
        type: ReverseProxyTargetType.PEER,
        peerId: initialPeer.id,
        host: initialPeer.ip,
      };
    }
    return undefined;
  });

  const [port, setPort] = useState<number>(
    reverseProxy?.targets?.[0]?.port || 0,
  );

  const [listenPort, setListenPort] = useState<number>(
    reverseProxy?.listen_port || 0,
  );

  // CIDR detection for L4 subnet resources
  const { isCidrRange: l4IsCidrRange, isValidCidrHost: l4IsValidCidrHost } =
    useReverseProxyAddress(l4Target);

  // Proxy protocol: for L4 modes maps to target proxy_protocol
  const [proxyProtocol, setProxyProtocol] = useState(
    reverseProxy?.targets?.[0]?.options?.proxy_protocol ?? false,
  );

  const [timeoutOption, setTimeoutOption] = useState(
    reverseProxy?.targets?.[0]?.options?.request_timeout ??
      reverseProxy?.targets?.[0]?.options?.session_idle_timeout ??
      "",
  );

  const timeoutError = useMemo(() => {
    if (!timeoutOption) return undefined;
    return serviceMode === ServiceMode.UDP
      ? validateSessionIdleTimeout(timeoutOption)
      : validateTimeout(timeoutOption);
  }, [timeoutOption, serviceMode]);

  const [targets, setTargets] = useState<ReverseProxyTarget[]>(
    reverseProxy?.targets || [],
  );

  const [isPrivate, setIsPrivate] = useState<boolean>(
    reverseProxy?.private ?? false,
  );

  // Tracks whether NetBird-only was switched on automatically because the
  // operator picked a cluster target (see onClusterPick), as opposed to an
  // explicit choice in the NetBird-Only modal. Only auto-enabled private is
  // reverted when the cluster target is later removed or changed.
  const [privateFromCluster, setPrivateFromCluster] = useState(false);

  // togglePrivate normalises related state when the operator flips
  // NetBird-only access. Private services are HTTP-only, so we drop out
  // of L4 mode. NetBird-only and the other auth modes are mutually
  // exclusive — entering private clears bearer/password/pin/header/link
  // state so the inbound peer's tunnel identity is the only auth path.
  // Existing targets are preserved; the backend rejects non-cluster
  // targets on save, but operators expect their input to persist while
  // they reshape it.
  const togglePrivate = (next: boolean) => {
    setIsPrivate(next);
    if (next) {
      setServiceMode(ServiceMode.HTTP);
      setBearerEnabled(false);
      setBearerGroups([]);
      setPasswordEnabled(false);
      setPassword("");
      setPinEnabled(false);
      setPin("");
      setHeaderAuthsEnabled(false);
      setLinkAuthEnabled(false);
    } else {
      setAccessGroups([]);
    }
  };

  const selectedDomain = useMemo(
    () =>
      domains?.find(
        (d) => d.domain === baseDomain || d.target_cluster === baseDomain,
      ),
    [domains, baseDomain],
  );

  // Whether a custom listen port is supported (TLS always, TCP/UDP only when cluster supports it)
  const isListenPortSupported = useMemo(() => {
    if (serviceMode !== ServiceMode.TCP && serviceMode !== ServiceMode.UDP)
      return true;
    return selectedDomain?.supports_custom_ports ?? false;
  }, [selectedDomain, serviceMode]);

  const [passHostHeader, setPassHostHeader] = useState(
    reverseProxy?.pass_host_header ?? false,
  );
  const [rewriteRedirects, setRewriteRedirects] = useState(
    reverseProxy?.rewrite_redirects ?? false,
  );

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

  // Access groups for NetBird-only services. Distinct from bearerGroups
  // (which gates SSO callers); these groups gate inbound peers on
  // private services and feed the auto-generated private-access policy.
  const [
    accessGroups,
    setAccessGroups,
    { save: saveAccessGroups },
  ] = useGroupHelper({
    initial: reverseProxy?.access_groups ?? [],
  });

  // Direct upstream is service-level in the UI; on save it patches the
  // (single) cluster target's options.direct_upstream. Defaults off for
  // peer/resource targets — cluster targets force it on via
  // effectiveDirectUpstream below since they have no WireGuard endpoint
  // to fall back to.
  const [directUpstream, setDirectUpstream] = useState<boolean>(
    reverseProxy?.targets?.some(
      (t) => t.options?.direct_upstream === true,
    ) ?? false,
  );

  // Cluster targets are reached over the embedded proxy's host stack —
  // turning Direct Upstream off would route them back through the
  // WireGuard tunnel they have no other endpoint for, so we force the
  // toggle on and lock it whenever any target is a cluster.
  const hasClusterTarget = useMemo(
    () =>
      targets.some(
        (t) => t.target_type === ReverseProxyTargetType.CLUSTER,
      ),
    [targets],
  );
  const effectiveDirectUpstream = hasClusterTarget || directUpstream;

  // Reverts the NetBird-only state that was auto-applied when a cluster
  // target was picked, once the committed targets no longer include a
  // cluster. Explicit NetBird-only choices (privateFromCluster === false)
  // are left untouched.
  const resetClusterPrivateIfNeeded = (next: ReverseProxyTarget[]) => {
    if (
      privateFromCluster &&
      !next.some((t) => t.target_type === ReverseProxyTargetType.CLUSTER)
    ) {
      togglePrivate(false);
      setPrivateFromCluster(false);
    }
  };

  const [linkAuthEnabled, setLinkAuthEnabled] = useState(
    reverseProxy?.auth?.link_auth?.enabled ?? false,
  );

  const [headerAuthsEnabled, setHeaderAuthsEnabled] = useState(
    (reverseProxy?.auth?.header_auths ?? []).some((h) => h.enabled),
  );
  const [headerAuths, setHeaderAuths] = useState<HeaderAuthConfig[]>(
    reverseProxy?.auth?.header_auths ?? [],
  );

  const [accessRestrictions, setAccessRestrictions] = useState<
    AccessRestrictions | undefined
  >(reverseProxy?.access_restrictions);

  const [accessControlHasErrors, setAccessControlHasErrors] = useState(false);

  // Auth modal states
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [ssoModalOpen, setSsoModalOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [headerModalOpen, setHeaderModalOpen] = useState(false);
  const [netBirdOnlyModalOpen, setNetBirdOnlyModalOpen] = useState(false);

  // Target being added/edited
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [editingTargetIndex, setEditingTargetIndex] = useState<number | null>(
    null,
  );

  // canContinueToSettings gates tab navigation and the Continue button.
  // It only needs domain + at least one valid endpoint so the operator
  // can freely move between tabs to configure the rest of the service
  // (auth, access control, advanced) — including reaching the Auth tab
  // to enable bearer auth for a private service.
  const canContinueToSettings = useMemo(() => {
    const subdomainRequired =
      selectedDomain?.require_subdomain === true;
    const isSubdomainValid =
      baseDomain.length > 0 &&
      !domainAlreadyExists &&
      (subdomain.length > 0 || !subdomainRequired);
    const isValidPort = (port: number) => port >= 1 && port <= 65535;
    const hasHttpEndpoint = !isL4Mode && targets.length > 0;
    const hasL4Endpoint =
      !isPrivate &&
      isL4Mode &&
      !!l4Target &&
      l4IsValidCidrHost &&
      isValidPort(port) &&
      (!isListenPortSupported || isValidPort(listenPort));
    const hasAnyEndpoint = hasHttpEndpoint || hasL4Endpoint;
    return isSubdomainValid && hasAnyEndpoint;
  }, [
    subdomain,
    baseDomain,
    domainAlreadyExists,
    selectedDomain,
    serviceMode,
    targets.length,
    isL4Mode,
    l4Target,
    l4IsValidCidrHost,
    port,
    isListenPortSupported,
    listenPort,
    isPrivate,
  ]);

  // canSaveService is the Save / Add Service button gate. Layers the
  // private-service requirement on top of canContinueToSettings: a
  // NetBird-only service must declare at least one access group so the
  // auto-generated policy has sources to allow inbound peers from.
  const canSaveService = useMemo(() => {
    if (!canContinueToSettings) return false;
    if (!isPrivate) return true;
    return accessGroups.length > 0;
  }, [canContinueToSettings, isPrivate, accessGroups.length]);

  const saveTarget = (targetData: ReverseProxyTarget) => {
    const next =
      editingTargetIndex !== null
        ? targets.map((t, i) =>
            i === editingTargetIndex ? { ...t, ...targetData } : t,
          )
        : [...targets, targetData];
    setTargets(next);
    resetClusterPrivateIfNeeded(next);
    setTargetModalOpen(false);
    setEditingTargetIndex(null);
  };

  const editTarget = (index: number) => {
    setEditingTargetIndex(index);
    setTargetModalOpen(true);
  };

  const removeTarget = (index: number) => {
    const next = targets.filter((_, i) => i !== index);
    setTargets(next);
    resetClusterPrivateIfNeeded(next);
  };

  const toggleTargetEnabled = (index: number) => {
    setTargets(
      targets.map((t, i) => (i === index ? { ...t, enabled: !t.enabled } : t)),
    );
  };

  const isUnprotected =
    !isPrivate &&
    !passwordEnabled &&
    !pinEnabled &&
    !bearerEnabled &&
    !linkAuthEnabled &&
    !headerAuthsEnabled &&
    !accessRestrictions;

  const handleSubmit = async () => {
    if (isUnprotected) {
      const confirmed = await confirm({
        title: "No Protection Configured",
        description:
          "This service has no authentication or access control rules configured. It will be publicly accessible to everyone on the internet. Are you sure you want to continue?",
        type: "warning",
        confirmText: reverseProxy ? "Save Changes" : "Add Service",
        cancelText: "Cancel",
        maxWidthClass: "max-w-lg",
      });
      if (!confirmed) return;
    }

    const savedGroups = await saveGroups();
    const savedAccessGroups = isPrivate ? await saveAccessGroups() : [];

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
      header_auths: headerAuthsEnabled
        ? headerAuths.map((h) => ({ ...h, enabled: true }))
        : [],
    };

    const l4TargetPayload: ReverseProxyTarget | undefined = l4Target
      ? {
          target_id: l4Target?.peerId || l4Target?.resourceId || "",
          target_type: l4Target?.type,
          port: port,
          protocol:
            serviceMode === ServiceMode.TLS
              ? ReverseProxyTargetProtocol.TCP
              : serviceMode === ServiceMode.UDP
              ? ReverseProxyTargetProtocol.UDP
              : ReverseProxyTargetProtocol.TCP,
          host: l4IsCidrRange ? l4Target?.host : undefined,
          enabled: true,
          options: (() => {
            const opts: Record<string, unknown> = {};
            if (serviceMode !== ServiceMode.UDP && proxyProtocol)
              opts.proxy_protocol = true;
            if (timeoutOption) {
              opts[
                serviceMode === ServiceMode.UDP
                  ? "session_idle_timeout"
                  : "request_timeout"
              ] = timeoutOption;
            }
            return Object.keys(opts).length ? opts : undefined;
          })(),
        }
      : undefined;

    const rawSubmittedTargets =
      isL4Mode && l4TargetPayload ? [l4TargetPayload] : targets;

    // For private services, the service-level Direct upstream toggle
    // applies to every target (regardless of type) so the operator can
    // mix cluster + peer/host/domain targets and still control the dial
    // path globally. This is the only call site that writes the flag
    // on a private service's targets.
    const submittedTargets = isPrivate
      ? rawSubmittedTargets.map((t) => ({
          ...t,
          options: {
            ...(t.options ?? {}),
            direct_upstream: effectiveDirectUpstream || undefined,
          },
        }))
      : rawSubmittedTargets;

    handleCreateOrUpdateProxy({
      data: {
        name: fullDomain,
        domain: fullDomain,
        mode: isL4Mode ? (serviceMode as ServiceMode) : undefined,
        listen_port:
          isL4Mode && isListenPortSupported ? listenPort : undefined,
        targets: submittedTargets,
        enabled: reverseProxy?.enabled ?? true,
        pass_host_header: isL4Mode ? undefined : passHostHeader,
        rewrite_redirects: isL4Mode ? undefined : rewriteRedirects,
        auth: isL4Mode ? undefined : auth,
        access_restrictions: accessRestrictions,
        private: isPrivate ? true : undefined,
        access_groups: isPrivate
          ? savedAccessGroups.map((g) => g.id as string)
          : undefined,
      },
      proxyId: reverseProxy?.id,
      onSuccess: () => {
        onOpenChange(false);
        onSuccess?.();
      },
    });
  };

  const modalTitle = useMemo(() => {
    const prefix = reverseProxy ? "Edit" : "Add";
    const label = serviceMode ? SERVICE_MODES[serviceMode].label : "Service";
    return `${prefix} ${label}`;
  }, [reverseProxy, serviceMode]);

  const modalDescription = useMemo(
    () =>
      isL4Mode
        ? "Forward traffic directly to your backend service."
        : "Expose services securely through NetBird's reverse proxy.",
    [isL4Mode],
  );

  return (
    <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
      <ModalContent
        maxWidthClass={tab === "service" ? "max-w-xl" : "max-w-2xl"}
      >
        <ModalHeader
          icon={<ReverseProxyIcon className={"fill-netbird"} size={18} />}
          title={modalTitle}
          description={modalDescription}
          color={"netbird"}
        />

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList justify={"start"} className={"px-8"}>
            <TabsTrigger value={"targets"}>
              <ReverseProxyIcon size={14} />
              Service
            </TabsTrigger>
            {!isL4Mode && (
              <TabsTrigger value={"auth"} disabled={!canContinueToSettings}>
                <LockKeyhole size={14} />
                Authentication
              </TabsTrigger>
            )}
            <TabsTrigger
              value={"access-control"}
              disabled={!canContinueToSettings}
            >
              <ShieldCheckIcon size={14} />
              Access Control
            </TabsTrigger>
            <TabsTrigger value={"settings"} disabled={!canContinueToSettings}>
              <Settings size={14} />
              Advanced Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value={"targets"} className={"pb-8"}>
            <div className={"px-8 flex-col flex gap-6"}>
              <ReverseProxyDomainInput
                subdomain={subdomain}
                onSubdomainChange={setSubdomain}
                baseDomain={baseDomain}
                onBaseDomainChange={setBaseDomain}
                domainAlreadyExists={domainAlreadyExists}
                subdomainRequired={selectedDomain?.require_subdomain === true}
                clusterOffline={
                  reverseProxy?.proxy_cluster && !isClusterConnected
                    ? { clusterName: reverseProxy.proxy_cluster }
                    : undefined
                }
              />

              {!reverseProxy && !isPrivate && (
                <ReverseProxyServiceModeSelector
                  onChange={setServiceMode}
                  value={serviceMode}
                  domain={selectedDomain}
                />
              )}

              {isPrivate && accessGroups.length === 0 && (
                <Paragraph className={"!text-yellow-400 !text-xs !mt-0"}>
                  NetBird-only is on but no access groups are set. Open it
                  on the Authentication tab and pick at least one group.
                </Paragraph>
              )}

              {isL4Mode && !isPrivate ? (
                <ReverseProxyLayer4Content
                  l4Target={l4Target}
                  setL4Target={setL4Target}
                  isListenPortSupported={isListenPortSupported}
                  listenPort={listenPort}
                  setListenPort={setListenPort}
                  port={port}
                  setPort={setPort}
                  initialResource={initialResource}
                  initialPeer={initialPeer}
                  initialNetwork={initialNetwork}
                />
              ) : (
                <ReverseProxyHTTPTargets
                  targets={targets}
                  onEditTarget={editTarget}
                  onRemoveTarget={removeTarget}
                  onToggleTargetEnabled={toggleTargetEnabled}
                  onAddTarget={() => setTargetModalOpen(true)}
                  initialNetwork={initialNetwork}
                  onNavigateToResources={() => {
                    onOpenChange(false);
                    router.push(
                      `/network?id=${initialNetwork?.id}&tab=resources`,
                    );
                  }}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value={"auth"} className={"pb-8"}>
            <div className={"px-8 flex-col flex gap-4"}>
              <SettingCard>
                {serviceMode === ServiceMode.HTTP &&
                  (selectedDomain?.supports_private === true ? (
                    <SettingCard.Item
                      label={
                        <>
                          <NetworkIcon size={15} />
                          NetBird-Only Access
                        </>
                      }
                      description="Reachable only from connected peers in the selected NetBird groups."
                      enabled={isPrivate}
                      onClick={() => {
                        setNetBirdOnlyModalOpen(true);
                      }}
                    />
                  ) : (
                    // Cluster doesn't advertise supports_private: keep the
                    // row visible but disabled, with a tooltip explaining
                    // why. FullTooltip's inline-flex wrapper makes this
                    // row a bit narrower than the others; that's
                    // acceptable for the disabled state.
                    <FullTooltip
                      className={"w-full"}
                      content={
                        <div className={"text-xs max-w-xs"}>
                          NetBird-Only Access requires a proxy cluster with
                          at least one connected embedded proxy (
                          <code>netbird proxy</code>). The selected cluster
                          doesn't have one. Connect an embedded proxy to
                          this cluster to enable this option.
                        </div>
                      }
                    >
                      <SettingCard.Item
                        label={
                          <>
                            <NetworkIcon size={15} />
                            NetBird-Only Access
                          </>
                        }
                        description="Reachable only from connected peers in the selected NetBird groups."
                        enabled={isPrivate}
                        disabled={true}
                        onClick={() => {
                          setNetBirdOnlyModalOpen(true);
                        }}
                      />
                    </FullTooltip>
                  ))}
                {!isPrivate && (
                  <>
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
                    <SettingCard.Item
                      label={
                        <>
                          <FileCode2Icon size={15} />
                          HTTP Headers
                        </>
                      }
                      description="Require specific HTTP headers to access this service."
                      enabled={headerAuthsEnabled}
                      onClick={() => setHeaderModalOpen(true)}
                    />
                  </>
                )}
              </SettingCard>
            </div>
          </TabsContent>

          <TabsContent value={"access-control"} className={"pb-8"}>
            <div className={"px-8 flex-col flex gap-4"}>
              {isPrivate && (
                <Callout
                  variant="info"
                  icon={
                    <CircleUser
                      size={14}
                      className="shrink-0 relative top-[3px]"
                    />
                  }
                >
                  This service is accessible via NetBird only. An allow rule
                  for the NetBird network range is applied by default. Any
                  rules you add here are layered on top.
                </Callout>
              )}
              <ReverseProxyAccessControlRules
                value={accessRestrictions}
                onChange={setAccessRestrictions}
                onValidationChange={setAccessControlHasErrors}
                supportsCrowdSec={selectedDomain?.supports_crowdsec}
              />
            </div>
          </TabsContent>

          <TabsContent value={"settings"} className={"pb-8"}>
            <div className={"px-8 flex-col flex gap-6"}>
              {(serviceMode === ServiceMode.TCP ||
                serviceMode === ServiceMode.TLS) && (
                <FancyToggleSwitch
                  value={proxyProtocol}
                  onChange={setProxyProtocol}
                  label={
                    <>
                      <MapPinned size={15} />
                      Preserve Client Source IP
                    </>
                  }
                  helpText="Preserve client source IP addresses when forwarding traffic to the backend using PROXY Protocol v2."
                />
              )}

              {isL4Mode && (
                <>
                  <div className={"flex items-center justify-between"}>
                    <div>
                      <Label>
                        {serviceMode === ServiceMode.UDP
                          ? "Session Idle Timeout"
                          : "Connection Timeout"}
                      </Label>
                      <HelpText className={"mb-0"}>
                        {serviceMode === ServiceMode.UDP ? (
                          <>
                            Close the UDP session after this period of
                            inactivity.
                            <br /> Leave this field empty for no timeout.
                          </>
                        ) : (
                          <>
                            Timeout for establishing backend connections. <br />{" "}
                            Leave this field empty for no timeout.
                          </>
                        )}
                      </HelpText>
                    </div>
                    <Input
                      customPrefix={<ClockFadingIcon size={16} />}
                      placeholder="e.g. 10s, 30s, 1m"
                      value={timeoutOption}
                      onChange={(e) => setTimeoutOption(e.target.value)}
                      maxWidthClass="w-[180px]"
                      errorTooltip={true}
                      error={timeoutError}
                    />
                  </div>
                </>
              )}

              {!isL4Mode && (
                <div className={"flex flex-col gap-4"}>
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
                  {isPrivate && (
                    <FullTooltip
                      disabled={selectedDomain?.supports_private === true}
                      content={
                        <div className={"text-xs max-w-xs"}>
                          Direct Upstream is only configurable on clusters with
                          at least one connected embedded proxy (
                          <code>netbird proxy</code>). The selected cluster
                          doesn't have one.
                        </div>
                      }
                    >
                      <FancyToggleSwitch
                        value={effectiveDirectUpstream}
                        onChange={setDirectUpstream}
                        disabled={
                          hasClusterTarget ||
                          selectedDomain?.supports_private !== true
                        }
                        label={
                          <>
                            <RouteIcon size={15} />
                            Direct Upstream
                          </>
                        }
                        helpText={
                          hasClusterTarget
                            ? "Required and locked on for proxy-cluster targets: the cluster has no WireGuard endpoint to fall back to."
                            : "Dial the upstream target from the proxy host instead of through the WireGuard tunnel. Turn on when the upstream is reachable without a WireGuard connection."
                        }
                      />
                    </FullTooltip>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <ModalFooter className={"items-center"}>
          <div className={"w-full"}>
            {(() => {
              const docsLink = {
                targets: {
                  href: REVERSE_PROXY_SERVICES_DOCS_LINK,
                  label: "Services",
                },
                auth: {
                  href: REVERSE_PROXY_AUTHENTICATION_DOCS_LINK,
                  label: "Authentication",
                },
                "access-control": {
                  href: REVERSE_PROXY_ACCESS_CONTROL_DOCS_LINK,
                  label: "Access Control",
                },
                settings: {
                  href: REVERSE_PROXY_SETTINGS_DOCS_LINK,
                  label: "Settings",
                },
              }[tab];
              return docsLink ? (
                <Paragraph className={"text-sm mt-auto"}>
                  Learn more about
                  <InlineLink href={docsLink.href} target={"_blank"}>
                    {docsLink.label}
                    <ExternalLinkIcon size={12} />
                  </InlineLink>
                </Paragraph>
              ) : null;
            })()}
          </div>
          <div className={"flex gap-3 w-full justify-end"}>
            {!reverseProxy ? (
              <>
                {tab === "targets" && (
                  <>
                    <ModalClose asChild>
                      <Button variant={"secondary"}>Cancel</Button>
                    </ModalClose>
                    <Button
                      variant={"primary"}
                      onClick={() =>
                        setTab(isL4Mode ? "access-control" : "auth")
                      }
                      disabled={!canContinueToSettings}
                    >
                      Continue
                    </Button>
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
                      onClick={() => setTab("access-control")}
                    >
                      Continue
                    </Button>
                  </>
                )}

                {tab === "access-control" && (
                  <>
                    <Button
                      variant={"secondary"}
                      onClick={() => setTab(isL4Mode ? "targets" : "auth")}
                    >
                      Back
                    </Button>
                    <Button
                      variant={"primary"}
                      onClick={() => setTab("settings")}
                      disabled={accessControlHasErrors}
                    >
                      Continue
                    </Button>
                  </>
                )}

                {tab === "settings" && (
                  <>
                    <Button
                      variant={"secondary"}
                      onClick={() => setTab("access-control")}
                    >
                      Back
                    </Button>
                    <Button
                      variant={"primary"}
                      disabled={
                        !canSaveService ||
                        !permission?.services?.create ||
                        !!timeoutError ||
                        accessControlHasErrors
                      }
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
                  disabled={
                    !canSaveService ||
                    !permission?.services?.update ||
                    !!timeoutError ||
                    accessControlHasErrors
                  }
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
          proxy_cluster: selectedDomain?.target_cluster || baseDomain || undefined,
          targets: targets,
          enabled: reverseProxy?.enabled ?? true,
          mode: serviceMode,
        }}
        initialResource={initialResource}
        initialPeer={initialPeer}
        initialNetwork={initialNetwork}
        onClusterPick={(cluster) => {
          // Picking a cluster from the target selector commits it as
          // the service's domain when none is set yet. We update
          // baseDomain — selectedDomain is derived from it via useMemo.
          if (!baseDomain) {
            setBaseDomain(cluster);
          }
          // Cluster targets are reached over the WireGuard overlay, so
          // the only callers that ever hit the proxy are NetBird peers.
          // Auto-flip the service to NetBird-only so the auth model
          // matches the wire reality instead of advertising SSO/PW/PIN
          // that no public client could ever exercise. No-op when
          // already private.
          if (!isPrivate) {
            togglePrivate(true);
            setPrivateFromCluster(true);
          }
        }}
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

      <AuthNetBirdOnlyModal
        open={netBirdOnlyModalOpen}
        onOpenChange={setNetBirdOnlyModalOpen}
        key={netBirdOnlyModalOpen ? "nb1" : "nb0"}
        currentGroups={accessGroups}
        isEnabled={isPrivate}
        onSave={(groups) => {
          setTimeout(() => {
            setAccessGroups(groups);
            togglePrivate(true);
            setPrivateFromCluster(false);
          }, 200);
        }}
        onRemove={() => {
          setTimeout(() => {
            togglePrivate(false);
            setPrivateFromCluster(false);
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

      <AuthHeaderModal
        open={headerModalOpen}
        onOpenChange={setHeaderModalOpen}
        key={headerModalOpen ? "h1" : "h0"}
        currentHeaders={headerAuths}
        onSave={(headers) => {
          setTimeout(() => {
            setHeaderAuths(headers);
            setHeaderAuthsEnabled(true);
          }, 200);
        }}
        onRemove={() => {
          setTimeout(() => {
            setHeaderAuths([]);
            setHeaderAuthsEnabled(false);
          }, 200);
        }}
      />
    </Modal>
  );
}
