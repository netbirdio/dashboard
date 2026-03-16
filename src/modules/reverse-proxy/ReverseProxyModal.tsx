"use client";

import Button from "@components/Button";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
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
  ExternalLinkIcon,
  GlobeIcon,
  LockKeyhole,
  Network as NetworkIcon,
  PlusCircle,
  RectangleEllipsis,
  Settings,
  Timer,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";
import ReverseProxyIcon from "@/assets/icons/ReverseProxyIcon";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import {
  isL4Mode as isL4ServiceMode,
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
import AuthPinModal from "@/modules/reverse-proxy/auth/AuthPinModal";
import AuthSSOModal from "@/modules/reverse-proxy/auth/AuthSSOModal";
import ReverseProxyHTTPTargets from "@/modules/reverse-proxy/ReverseProxyHTTPTargets";
import ReverseProxyLayer4Content from "@/modules/reverse-proxy/ReverseProxyLayer4Content";
import ReverseProxyTargetModal from "@/modules/reverse-proxy/targets/ReverseProxyTargetModal";
import { type Target } from "@/modules/reverse-proxy/targets/ReverseProxyTargetSelector";
import { useReverseProxyAddress } from "@/modules/reverse-proxy/targets/ReverseProxyAddressInput";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import { ReverseProxyServiceModeSelector } from "@/modules/reverse-proxy/ReverseProxyServiceModeSelector";

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
  const existingL4Target = isL4Mode
    ? reverseProxy?.targets?.[0]
    : undefined;

  const [l4Target, setL4Target] = useState<Target | undefined>(() => {
    if (existingL4Target) {
      const isPeer =
        existingL4Target.target_type === ReverseProxyTargetType.PEER;
      return {
        type: existingL4Target.target_type,
        peerId: isPeer ? existingL4Target.target_id : undefined,
        resourceId: isPeer ? undefined : existingL4Target.target_id,
        host: existingL4Target.host || "",
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
        resourceAddress: addr,
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
  const [tlsPort, setTlsPort] = useState<number>(existingL4Target?.port || 0);
  const [tlsListenPort, setTlsListenPort] = useState<number>(
    reverseProxy?.listen_port || 0,
  );

  // CIDR detection for L4 subnet resources
  const { isCidrRange: l4IsCidrRange, isValidCidrHost: l4IsValidCidrHost } =
    useReverseProxyAddress(l4Target);

  // Proxy protocol: for L4 modes maps to target proxy_protocol
  const [proxyProtocol, setProxyProtocol] = useState(
    existingL4Target?.options?.proxy_protocol ?? false,
  );

  const [requestTimeout, setRequestTimeout] = useState(
    existingL4Target?.options?.request_timeout ??
      existingL4Target?.options?.session_idle_timeout ??
      "",
  );

  const [targets, setTargets] = useState<ReverseProxyTarget[]>(
    reverseProxy?.targets || [],
  );

  // Whether a custom listen port is supported (TLS always, TCP/UDP only when cluster supports it)
  const isListenPortSupported = useMemo(() => {
    if (serviceMode !== "tcp" && serviceMode !== "udp") return true;
    const selectedDomain = domains?.find(
      (d) => d.domain === baseDomain || d.target_cluster === baseDomain,
    );
    return selectedDomain?.supports_custom_ports ?? false;
  }, [domains, baseDomain, serviceMode]);

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

  const canContinueToSettings = useMemo(() => {
    const isSubdomainValid =
      subdomain.length > 0 && baseDomain.length > 0 && !domainAlreadyExists;
    const isValidPort = (port: number) => port >= 1 && port <= 65535;
    const hasHttpEndpoint = !isL4Mode && targets.length > 0;
    const hasL4Endpoint =
      isL4Mode &&
      !!l4Target &&
      l4IsValidCidrHost &&
      isValidPort(tlsPort) &&
      (!isListenPortSupported || isValidPort(tlsListenPort));
    const hasAnyEndpoint = hasHttpEndpoint || hasL4Endpoint;
    return isSubdomainValid && hasAnyEndpoint;
  }, [
    subdomain,
    baseDomain,
    domainAlreadyExists,
    serviceMode,
    targets.length,
    isL4Mode,
    l4Target,
    l4IsValidCidrHost,
    tlsPort,
    isListenPortSupported,
    tlsListenPort,
  ]);

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
    if (!isL4Mode && hasNoAuth) {
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

    const l4TargetType =
      l4Target?.type === ReverseProxyTargetType.PEER
        ? ReverseProxyTargetType.PEER
        : l4Target?.type === ReverseProxyTargetType.SUBNET
        ? ReverseProxyTargetType.SUBNET
        : ReverseProxyTargetType.HOST;

    const l4TargetPayload: ReverseProxyTarget = {
      target_id: l4Target?.peerId || l4Target?.resourceId || "",
      target_type: l4TargetType,
      port: tlsPort,
      protocol: (serviceMode === "tls"
        ? "tcp"
        : serviceMode) as ReverseProxyTargetProtocol,
      host: l4IsCidrRange ? l4Target?.host : undefined,
      enabled: true,
      options: (() => {
        const opts: Record<string, unknown> = {};
        if (serviceMode !== "udp" && proxyProtocol) opts.proxy_protocol = true;
        if (requestTimeout) {
          opts[
            serviceMode === "udp" ? "session_idle_timeout" : "request_timeout"
          ] = requestTimeout;
        }
        return Object.keys(opts).length ? opts : undefined;
      })(),
    };

    handleCreateOrUpdateProxy({
      data: {
        name: fullDomain,
        domain: fullDomain,
        mode: isL4Mode ? (serviceMode as ServiceMode) : undefined,
        listen_port:
          isL4Mode && isListenPortSupported ? tlsListenPort : undefined,
        targets: isL4Mode ? [l4TargetPayload] : targets,
        enabled: reverseProxy?.enabled ?? true,
        pass_host_header: isL4Mode ? undefined : passHostHeader,
        rewrite_redirects: isL4Mode ? undefined : rewriteRedirects,
        auth: isL4Mode ? undefined : auth,
      },
      proxyId: reverseProxy?.id,
      onSuccess: () => {
        onOpenChange(false);
        onSuccess?.();
      },
    });
  };

  const modalTitle = useMemo(() => {
    if (reverseProxy) return "Edit Service";
    switch (serviceMode) {
      case "tls":
        return "Add TLS Passthrough";
      case "tcp":
        return "Add TCP Service";
      case "udp":
        return "Add UDP Service";
      case "http":
        return "Add HTTP/S Service";
      default:
        return "Add Service";
    }
  }, [reverseProxy, serviceMode]);

  const modalDescription = useMemo(
    () =>
      isL4Mode
        ? "Forward traffic directly to your backend."
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
              <ReverseProxyDomainInput
                subdomain={subdomain}
                onSubdomainChange={setSubdomain}
                baseDomain={baseDomain}
                onBaseDomainChange={setBaseDomain}
                domainAlreadyExists={domainAlreadyExists}
                isL4Mode={isL4Mode}
                clusterOffline={
                  reverseProxy?.proxy_cluster && !isClusterConnected
                    ? { clusterName: reverseProxy.proxy_cluster }
                    : undefined
                }
              />

              <ReverseProxyServiceModeSelector
                onChange={setServiceMode}
                value={serviceMode}
                disabled={!!reverseProxy}
              />

              {isL4Mode ? (
                <ReverseProxyLayer4Content
                  l4Target={l4Target}
                  setL4Target={setL4Target}
                  isListenPortSupported={isListenPortSupported}
                  tlsListenPort={tlsListenPort}
                  setTlsListenPort={setTlsListenPort}
                  tlsPort={tlsPort}
                  setTlsPort={setTlsPort}
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
              {(serviceMode === "tcp" || serviceMode === "tls") && (
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
                <div
                  className={
                    "px-6 py-4 border rounded-md border-nb-gray-910 bg-nb-gray-900/30"
                  }
                >
                  <div className={"flex justify-between gap-10"}>
                    <div className={"max-w-sm"}>
                      <Label>
                        <Timer size={15} />
                        {serviceMode === "udp"
                          ? "Session Idle Timeout"
                          : "Connection Timeout"}
                      </Label>
                      <HelpText margin={false}>
                        {serviceMode === "udp"
                          ? "Close the UDP session after this period of inactivity."
                          : "Timeout for establishing backend connections."}
                      </HelpText>
                    </div>
                    <div className={"mt-1"}>
                      <Input
                        value={requestTimeout}
                        onChange={(e) => setRequestTimeout(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder={"30s"}
                        maxWidthClass={"w-[100px]"}
                      />
                    </div>
                  </div>
                </div>
              )}
              {!isL4Mode && (
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
                      onClick={() => setTab(isL4Mode ? "settings" : "auth")}
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
                      onClick={() => setTab(isL4Mode ? "targets" : "auth")}
                    >
                      Back
                    </Button>
                    <Button
                      variant={"primary"}
                      disabled={
                        !canContinueToSettings || !permission?.services?.create
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
                    !canContinueToSettings || !permission?.services?.update
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
          targets: targets,
          enabled: reverseProxy?.enabled ?? true,
          mode: serviceMode,
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
