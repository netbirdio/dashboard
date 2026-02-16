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
  PlusCircle,
  PlusIcon,
  RectangleEllipsis,
  Server,
  Settings,
  Text,
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
  REVERSE_PROXY_AUTHENTICATION_DOCS_LINK,
  REVERSE_PROXY_SERVICES_DOCS_LINK,
  REVERSE_PROXY_SETTINGS_DOCS_LINK,
  ReverseProxy,
  ReverseProxyAuth,
  ReverseProxyDomain,
  ReverseProxyDomainType,
  ReverseProxyTarget,
} from "@/interfaces/ReverseProxy";
import { CustomDomainSelector } from "./domain/CustomDomainSelector";
import { cn } from "@utils/helpers";
import AuthPasswordModal from "@/modules/reverse-proxy/auth/AuthPasswordModal";
import AuthPinModal from "@/modules/reverse-proxy/auth/AuthPinModal";
import AuthSSOModal from "@/modules/reverse-proxy/auth/AuthSSOModal";
import ReverseProxyTargetModal from "@/modules/reverse-proxy/targets/ReverseProxyTargetModal";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";

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
  const parsed = reverseProxy?.domain ? parseDomain(reverseProxy.domain) : null;

  // Form state
  const [subdomain, setSubdomain] = useState(
    parsed?.subdomain ||
      initialSubdomain
        ?.toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "") ||
      "",
  );

  const [baseDomain, setBaseDomain] = useState(() => {
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

  const [targets, setTargets] = useState<ReverseProxyTarget[]>(
    reverseProxy?.targets || [],
  );
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
    return (
      subdomain.length > 0 && baseDomain.length > 0 && !domainAlreadyExists
    );
  }, [subdomain, baseDomain, domainAlreadyExists]);

  const canContinueToSettings = useMemo(() => {
    return isSubdomainValid && targets.length > 0;
  }, [isSubdomainValid, targets]);

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
    // Show warning if no authentication is configured
    if (hasNoAuth) {
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

    handleCreateOrUpdateProxy({
      data: {
        name: fullDomain,
        domain: fullDomain,
        targets,
        enabled: reverseProxy?.enabled ?? true,
        pass_host_header: passHostHeader,
        rewrite_redirects: rewriteRedirects,
        auth,
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
          title={reverseProxy ? "Edit Service" : "Add Service"}
          description={
            "Expose services securely through NetBird's reverse proxy."
          }
          color={"netbird"}
        />

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList justify={"start"} className={"px-8"}>
            <TabsTrigger value={"targets"}>
              <Text size={14} />
              Details
            </TabsTrigger>
            <TabsTrigger value={"auth"} disabled={!canContinueToSettings}>
              <LockKeyhole size={16} />
              Authentication
            </TabsTrigger>
            <TabsTrigger value={"settings"} disabled={!canContinueToSettings}>
              <Settings size={14} />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value={"targets"} className={"pb-8"}>
            <div className={"px-8 flex-col flex gap-6"}>
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

              {reverseProxy?.proxy_cluster && !isClusterConnected && (
                <Callout variant={"error"}>
                  Cluster {reverseProxy.proxy_cluster} is offline. Make sure the
                  proxy server is running and connected to the right management
                  address.
                </Callout>
              )}

              <div>
                <Label>
                  <Server size={14} />
                  Targets
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
                    <Button
                      variant={"primary"}
                      onClick={() => setTab("auth")}
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
                      onClick={() => setTab("auth")}
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
