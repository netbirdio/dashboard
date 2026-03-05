"use client";

import Button from "@components/Button";
import { Checkbox } from "@components/Checkbox";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { Modal, ModalContent, ModalFooter } from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import { SelectDropdown } from "@components/select/SelectDropdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import useFetchApi from "@utils/api";
import {
  AlertTriangle,
  ExternalLinkIcon,
  HelpCircle,
  MinusCircleIcon,
  PlusCircle,
  PlusIcon,
  RotateCcw,
  Server,
  Settings,
  Text,
} from "lucide-react";
import { Callout } from "@components/Callout";
import cidr from "ip-cidr";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import {
  REVERSE_PROXY_TARGETS_DOCS_LINK,
  ReverseProxy,
  ReverseProxyTarget,
  ReverseProxyTargetProtocol,
  ReverseProxyTargetType,
  ServiceTargetOptions,
  ServiceTargetOptionsPathRewrite,
} from "@/interfaces/ReverseProxy";
import {
  defaultPortForProtocol,
  isResourceTargetType,
} from "@/contexts/ReverseProxiesProvider";
import { cn } from "@utils/helpers";
import { HelpTooltip } from "@components/HelpTooltip";
import InlineLink, { InlineButtonLink } from "@components/InlineLink";
import SetupModal from "@/modules/setup-netbird-modal/SetupModal";
import FullTooltip from "@components/FullTooltip";
import Paragraph from "@components/Paragraph";

// RFC 7230 token characters for header names
const HEADER_NAME_RE = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
// Go time.ParseDuration format: one or more {number}{unit} pairs
const DURATION_RE = /^(\d+(\.\d+)?(ns|us|µs|ms|s|m|h))+$/;
// Headers managed by the proxy that users cannot override
const BLOCKED_HEADERS = new Set([
  "host", "connection", "transfer-encoding", "keep-alive",
  "proxy-authenticate", "proxy-authorization", "te", "trailer", "upgrade",
]);

type HeaderEntry = { id: number; name: string; value: string };

function recordToHeaderEntries(
  record: Record<string, string> | undefined,
  nextId: () => number,
): HeaderEntry[] {
  if (!record) return [];
  return Object.entries(record).map(([name, value]) => ({
    id: nextId(),
    name,
    value,
  }));
}

function headerEntriesToRecord(
  entries: HeaderEntry[],
): Record<string, string> | undefined {
  if (entries.length === 0) return undefined;
  const record: Record<string, string> = {};
  for (const entry of entries) {
    if (entry.name) record[entry.name] = entry.value;
  }
  return Object.keys(record).length > 0 ? record : undefined;
}

function validateHeaderName(
  name: string,
  allNames: string[],
): string | undefined {
  if (!name) return "Header name is required";
  if (!HEADER_NAME_RE.test(name)) return "Invalid characters in header name";
  if (BLOCKED_HEADERS.has(name.toLowerCase()))
    return `"${name}" is a reserved header`;
  const dupeCount = allNames.filter(
    (n) => n.toLowerCase() === name.toLowerCase(),
  ).length;
  if (dupeCount > 1) return "Duplicate header name";
  return undefined;
}

function validateHeaderValue(value: string): string | undefined {
  if (value.includes("\r") || value.includes("\n"))
    return "Value must not contain line breaks";
  return undefined;
}

function validateTimeout(timeout: string): string | undefined {
  if (!timeout) return undefined;
  if (!DURATION_RE.test(timeout))
    return 'Invalid duration, use e.g. "10s", "30s", "1m"';
  return undefined;
}

/** Get initial host value based on target, resource, or peer */
function getInitialHost(
  currentTarget: ReverseProxyTarget | null | undefined,
  initialResource: { address: string } | undefined,
  initialPeer: { ip: string } | undefined,
): string {
  if (currentTarget?.host) return currentTarget.host;
  if (initialResource) {
    const address = initialResource.address;
    return address.includes("/") ? address.split("/")[0] : address;
  }
  if (initialPeer) return initialPeer.ip;
  return "";
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (target: ReverseProxyTarget) => void;
  currentTarget?: ReverseProxyTarget | null;
  reverseProxy: ReverseProxy;
  /** Pre-set a resource target - hides target selection */
  initialResource?: NetworkResource;
  initialPeer?: Peer;
  initialNetwork?: Network;
};

export default function ReverseProxyTargetModal({
  open,
  onOpenChange,
  onSave,
  currentTarget,
  reverseProxy,
  initialResource,
  initialPeer,
  initialNetwork,
}: Readonly<Props>) {
  const existingTargets = reverseProxy.targets || [];
  const domain = reverseProxy.domain;
  // Fetch resources and peers for target selection
  const { data: resources } = useFetchApi<NetworkResource[]>(
    "/networks/resources",
  );
  const { data: peers } = useFetchApi<Peer[]>("/peers");

  const [tab, setTab] = useState("details");

  const [targetType, setTargetType] = useState<ReverseProxyTargetType>(
    currentTarget?.target_type ??
      (initialResource
        ? (initialResource.type as ReverseProxyTargetType) ??
          ReverseProxyTargetType.HOST
        : ReverseProxyTargetType.PEER),
  );
  const [targetPeerId, setTargetPeerId] = useState<string | undefined>(
    currentTarget?.target_type === ReverseProxyTargetType.PEER
      ? currentTarget?.target_id
      : initialPeer?.id,
  );
  const [targetResourceId, setTargetResourceId] = useState<string | undefined>(
    currentTarget && isResourceTargetType(currentTarget.target_type)
      ? currentTarget?.target_id
      : initialResource?.id,
  );
  const [targetProtocol, setTargetProtocol] =
    useState<ReverseProxyTargetProtocol>(
      currentTarget?.protocol ?? ReverseProxyTargetProtocol.HTTP,
    );
  const [targetHost, setTargetHost] = useState(
    getInitialHost(currentTarget, initialResource, initialPeer),
  );
  const [targetPort, setTargetPort] = useState<number>(
    currentTarget?.port ?? 0,
  );
  const [targetPath, setTargetPath] = useState(currentTarget?.path ?? "");
  const [accessLocal, setAccessLocal] = useState(
    currentTarget?.access_local ?? false,
  );
  const headerIdRef = useRef(0);
  const nextHeaderId = useCallback(() => ++headerIdRef.current, []);
  const [targetOptions, setTargetOptions] = useState<ServiceTargetOptions>(
    () => {
      const { custom_headers: _, ...rest } = currentTarget?.options ?? {};
      return rest;
    },
  );
  const [headerEntries, setHeaderEntries] = useState<HeaderEntry[]>(() =>
    recordToHeaderEntries(currentTarget?.options?.custom_headers, nextHeaderId),
  );
  const portInputRef = useRef<HTMLInputElement>(null);
  const [installModal, setInstallModal] = useState(false);

  // Get the current resource's address (from initialResource or selected resource)
  const currentResourceAddress = useMemo(() => {
    if (initialResource) return initialResource.address;
    if (targetResourceId) {
      const resource = resources?.find((r) => r.id === targetResourceId);
      return resource?.address || "";
    }
    return "";
  }, [initialResource, targetResourceId, resources]);

  // Parse the CIDR using ip-cidr library
  const cidrInfo = useMemo(() => {
    if (!currentResourceAddress) return null;
    if (!cidr.isValidCIDR(currentResourceAddress)) return null;
    try {
      return new cidr(currentResourceAddress);
    } catch {
      return null;
    }
  }, [currentResourceAddress]);

  // Get the CIDR mask (e.g., 24 for /24)
  const cidrMask = useMemo(() => {
    if (!cidrInfo) return null;
    const parts = currentResourceAddress.split("/");
    return parts.length === 2 ? parseInt(parts[1], 10) : 32;
  }, [cidrInfo, currentResourceAddress]);

  // Check if address is a CIDR range (has more than one address)
  const isCidrRange = useMemo(() => {
    return cidrMask !== null && cidrMask < 32;
  }, [cidrMask]);

  // Host should be editable if it's a CIDR range with multiple addresses
  const isHostEditable = isCidrRange;

  // Validate if current host is within CIDR range
  const isHostInCidrRange = useMemo(() => {
    if (!cidrInfo || !targetHost) return false;
    if (!cidr.isValidAddress(targetHost)) return false;
    return cidrInfo.contains(targetHost);
  }, [cidrInfo, targetHost]);

  // Normalize path for comparison (ensure it starts with / and handle empty as /)
  const normalizePath = (path: string | undefined) => {
    if (!path || path === "") return "/";
    return path.startsWith("/") ? path : `/${path}`;
  };

  // Check if path already exists in other targets
  const isPathDuplicate = useMemo(() => {
    const normalizedCurrentPath = normalizePath(targetPath);
    const normalizedOriginalPath = currentTarget
      ? normalizePath(currentTarget.path)
      : null;
    return existingTargets.some((t) => {
      // Skip the target being edited
      if (
        normalizedOriginalPath !== null &&
        normalizePath(t.path) === normalizedOriginalPath
      ) {
        return false;
      }
      return normalizePath(t.path) === normalizedCurrentPath;
    });
  }, [targetPath, existingTargets, currentTarget]);

  const isValidPort =
    targetPort === 0 || (targetPort >= 1 && targetPort <= 65535);
  const isValidCidrHost = !isCidrRange || (targetHost && isHostInCidrRange);

  const canAddTarget = useMemo(() => {
    // Don't allow if path is duplicate or port is invalid
    if (isPathDuplicate || !isValidPort) return false;

    if (initialResource) {
      // If CIDR range, must have a valid IP within range
      return isValidCidrHost;
    }
    if (initialPeer) {
      return true;
    }
    if (targetType === ReverseProxyTargetType.PEER) {
      return !!targetPeerId;
    }
    if (isResourceTargetType(targetType)) {
      return !!targetResourceId && isValidCidrHost;
    }
    return false;
  }, [
    isPathDuplicate,
    isValidPort,
    initialResource,
    initialPeer,
    targetType,
    targetPeerId,
    targetResourceId,
    isValidCidrHost,
  ]);

  const hasTarget =
    initialResource || initialPeer || targetPeerId || targetResourceId;

  const isResource = isResourceTargetType(targetType) || !!initialResource;

  const updateOption = useCallback(
    <K extends keyof ServiceTargetOptions>(
      key: K,
      value: ServiceTargetOptions[K],
    ) => {
      setTargetOptions((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const addHeader = useCallback(() => {
    setHeaderEntries((prev) => [
      ...prev,
      { id: nextHeaderId(), name: "", value: "" },
    ]);
  }, [nextHeaderId]);

  const removeHeader = useCallback((id: number) => {
    setHeaderEntries((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const updateHeaderEntry = useCallback(
    (id: number, field: "name" | "value", fieldValue: string) => {
      setHeaderEntries((prev) =>
        prev.map((h) => (h.id === id ? { ...h, [field]: fieldValue } : h)),
      );
    },
    [],
  );

  const hasAnyOptions =
    targetOptions.skip_tls_verify !== undefined ||
    targetOptions.request_timeout !== undefined ||
    targetOptions.path_rewrite !== undefined ||
    headerEntries.length > 0;

  const resetOptions = useCallback(() => {
    setTargetOptions({});
    setHeaderEntries([]);
  }, []);

  const handleSave = () => {
    const resolvedType = initialPeer ? ReverseProxyTargetType.PEER : targetType;
    const resolvedIsResource =
      isResourceTargetType(resolvedType) || !!initialResource;
    const customHeaders = headerEntriesToRecord(headerEntries);
    const mergedOptions: ServiceTargetOptions = {
      ...targetOptions,
      custom_headers: customHeaders,
    };
    const hasOptions = Object.values(mergedOptions).some(
      (v) => v !== undefined,
    );
    const targetData: ReverseProxyTarget = {
      target_type: resolvedType,
      target_id:
        resolvedType === ReverseProxyTargetType.PEER
          ? targetPeerId
          : targetResourceId,
      protocol: targetProtocol,
      host:
        resolvedType === ReverseProxyTargetType.SUBNET ? targetHost : undefined,
      port: targetPort,
      path: targetPath || undefined,
      enabled: currentTarget?.enabled ?? true,
      access_local: resolvedIsResource ? accessLocal : undefined,
      options: hasOptions ? mergedOptions : undefined,
    };
    onSave(targetData);
    onOpenChange(false);
  };

  const allHeaderNames = headerEntries.map((h) => h.name);
  const timeoutError = validateTimeout(targetOptions.request_timeout ?? "");
  const headerErrors = headerEntries.map((entry) => ({
    name: validateHeaderName(entry.name, allHeaderNames),
    value: validateHeaderValue(entry.value),
  }));
  const hasOptionsErrors =
    !!timeoutError || headerErrors.some((e) => e.name || e.value);

  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange}>
        <ModalContent maxWidthClass="max-w-xl">
          <ModalHeader
            icon={<Server className="text-netbird" size={16} />}
            title={currentTarget ? "Edit Target" : "Add Target"}
            description="Configure the target for your reverse proxy."
            color="netbird"
          />

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList justify={"start"} className={"px-8"}>
              <TabsTrigger value={"details"}>
                <Text size={14} />
                Details
              </TabsTrigger>
              <TabsTrigger value={"options"} disabled={!hasTarget}>
                <Settings size={14} />
                Options
                {hasOptionsErrors && tab !== "options" && (
                  <span className="ml-1 inline-block w-2 h-2 rounded-full bg-red-500" />
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={"details"} className={"pb-8"}>
              <div className="px-8 flex flex-col gap-6">
                {!initialResource && !initialPeer && (
                  <div>
                    <Label className={"gap-0 inline"}>
                      {initialNetwork ? (
                        "Select Resource"
                      ) : (
                        <>
                          Select{" "}
                          <HelpTooltip
                            content={
                              <div className="max-w-sm text-xs">
                                A{" "}
                                <span className={"text-white font-medium"}>
                                  peer
                                </span>{" "}
                                is a machine (e.g., laptop, server, container)
                                running NetBird. Select a peer if your service runs
                                directly on it.
                                <span className={"mt-1 block"}>
                                  If you don&apos;t have a peer yet, you can{" "}
                                  <InlineButtonLink
                                    onClick={() => setInstallModal(true)}
                                  >
                                    Install NetBird
                                  </InlineButtonLink>
                                  .
                                </span>
                              </div>
                            }
                          >
                            Peer
                          </HelpTooltip>{" "}
                          or{" "}
                          <HelpTooltip
                            content={
                              <div className="max-w-sm text-xs">
                                A{" "}
                                <span className={"text-white font-medium"}>
                                  resource
                                </span>{" "}
                                is a destination (IP, subnet, or domain) that
                                can&apos;t run NetBird directly. Resources are part
                                of a network and are reached through a routing peer
                                that forwards traffic to them.
                                <span className={"mt-1 block"}>
                                  If you don&apos;t have resources yet, go to{" "}
                                  <InlineLink href={"/networks"}>
                                    Networks
                                  </InlineLink>{" "}
                                  to create some.
                                </span>
                              </div>
                            }
                          >
                            Resource
                          </HelpTooltip>
                        </>
                      )}
                    </Label>

                    <HelpText>
                      {initialNetwork
                        ? "Select the resource from your network you want to expose."
                        : "Select the peer where your service is running or select a resource to expose it."}
                    </HelpText>
                    <PeerGroupSelector
                      values={[]}
                      onChange={() => {}}
                      placeholder={
                        initialNetwork
                          ? "Select a resource..."
                          : "Select a peer or resource..."
                      }
                      showPeers={!initialNetwork}
                      showResources={true}
                      showRoutes={false}
                      hideAllGroup={true}
                      hideGroupsTab={true}
                      resourceIds={
                        initialNetwork ? initialNetwork.resources ?? [] : undefined
                      }
                      tabOrder={
                        initialNetwork ? ["resources"] : ["peers", "resources"]
                      }
                      closeOnSelect={true}
                      max={1}
                      resource={
                        isResourceTargetType(targetType) && targetResourceId
                          ? { id: targetResourceId, type: "host" }
                          : targetType === ReverseProxyTargetType.PEER &&
                            targetPeerId
                          ? { id: targetPeerId, type: "peer" }
                          : undefined
                      }
                      onResourceChange={(res) => {
                        if (res) {
                          if (res.type === "peer") {
                            setTargetType(ReverseProxyTargetType.PEER);
                            setTargetPeerId(res.id);
                            setTargetResourceId(undefined);
                            const peer = peers?.find((p) => p.id === res.id);
                            setTargetHost(peer?.ip || "localhost");
                          } else {
                            const selectedResource = resources?.find(
                              (r) => r.id === res.id,
                            );
                            setTargetType(
                              (selectedResource?.type as ReverseProxyTargetType) ??
                                ReverseProxyTargetType.HOST,
                            );
                            setTargetResourceId(res.id);
                            setTargetPeerId(undefined);
                            const address = selectedResource?.address || "";
                            // If CIDR range, pre-fill with base IP
                            if (address.includes("/")) {
                              setTargetHost(address.split("/")[0]);
                            } else {
                              setTargetHost(address);
                            }
                          }
                          setTimeout(() => portInputRef.current?.focus(), 0);
                        } else {
                          setTargetPeerId(undefined);
                          setTargetResourceId(undefined);
                          setTargetHost("");
                        }
                      }}
                    />
                  </div>
                )}

                <div>
                  <Label>Location (Optional)</Label>
                  <HelpText>
                    Specify an optional path from where requests are routed to your
                    service.
                  </HelpText>
                  <div className="flex w-full">
                    <div
                      className={`bg-nb-gray-900 rounded-l-md border text-nb-gray-300 border-r-0 text-sm border-nb-gray-700 flex items-center justify-center whitespace-nowrap px-4 ${
                        !hasTarget ? "opacity-50" : "opacity-80"
                      }`}
                    >
                      {domain || "domain.example.com"}
                    </div>
                    <Input
                      placeholder="/"
                      value={targetPath}
                      className={cn("rounded-l-none")}
                      maxWidthClass="w-full"
                      disabled={!hasTarget}
                      onChange={(e) => {
                        let value = e.target.value;
                        if (value && !value.startsWith("/")) {
                          value = "/" + value;
                        }
                        setTargetPath(value);
                      }}
                    />
                  </div>
                  {isPathDuplicate && hasTarget && (
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
                      Please use a different location. This location is already used
                      by another target and cannot be added.
                    </Callout>
                  )}
                </div>

                <div className="flex gap-3 mt-1">
                  <div className="flex-1">
                    <Label>Protocol & Host / IP</Label>
                    {cidrInfo && (
                      <HelpText className="!mt-1">
                        Enter an IP address within {currentResourceAddress}
                      </HelpText>
                    )}
                    <div className="flex items-center mt-2">
                      <div className="w-[120px]">
                        <SelectDropdown
                          value={targetProtocol}
                          onChange={(v) => {
                            const proto = v as ReverseProxyTargetProtocol;
                            setTargetProtocol(proto);
                            if (proto !== ReverseProxyTargetProtocol.HTTPS) {
                              updateOption("skip_tls_verify", undefined);
                            }
                          }}
                          options={[
                            {
                              value: ReverseProxyTargetProtocol.HTTP,
                              label: "http://",
                            },
                            {
                              value: ReverseProxyTargetProtocol.HTTPS,
                              label: "https://",
                            },
                          ]}
                          className="!rounded-r-none !border-r-0"
                          disabled={!hasTarget}
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          value={targetHost}
                          onChange={(e) => {
                            // Only allow valid IP characters for CIDR ranges
                            const value = isHostEditable
                              ? e.target.value.replace(/[^0-9.]/g, "")
                              : e.target.value;
                            setTargetHost(value);
                          }}
                          placeholder="e.g., 192.168.0.10"
                          className="!rounded-l-none"
                          disabled={!hasTarget}
                          readOnly={hasTarget && !isHostEditable ? true : undefined}
                          autoFocus={!!initialResource && isHostEditable}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="w-[150px]">
                    <Label>
                      Port
                      <FullTooltip
                        content={
                          <div className={"text-xs max-w-xs"}>
                            Enter the port where your service (e.g., webserver, app,
                            API) is currently listening. If left empty, defaults to
                            port 80 for HTTP or 443 for HTTPS.
                          </div>
                        }
                      >
                        <HelpCircle
                          size={12}
                          className="cursor-help hover:text-nb-gray-100 transition-colors"
                        />
                      </FullTooltip>
                    </Label>
                    {cidrInfo && <HelpText className="!mt-1">&nbsp;</HelpText>}
                    <div className="mt-2">
                      <Input
                        ref={portInputRef}
                        type="number"
                        value={targetPort === 0 ? "" : targetPort}
                        onChange={(e) =>
                          setTargetPort(parseInt(e.target.value) || 0)
                        }
                        placeholder={String(defaultPortForProtocol(targetProtocol))}
                        min={0}
                        max={65535}
                        disabled={!hasTarget}
                        autoFocus={!!initialResource && !isHostEditable}
                      />
                    </div>
                  </div>
                </div>

                {isResource && hasTarget && (
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={accessLocal}
                      onCheckedChange={(v) => setAccessLocal(v === true)}
                    />
                    <div>
                      <Label className="!mb-0" as={"div"}>
                        This is the routing peer
                      </Label>
                      <HelpText className="!mt-1">
                        Enable if the service runs directly on the routing
                        peer rather than behind it.
                      </HelpText>
                    </div>
                  </label>
                )}
              </div>
            </TabsContent>

            <TabsContent value={"options"} className={"pb-8"}>
              <div className="px-8 flex flex-col gap-6">
                {targetProtocol === ReverseProxyTargetProtocol.HTTPS && (
                  <FancyToggleSwitch
                    value={targetOptions.skip_tls_verify ?? false}
                    onChange={(v) => updateOption("skip_tls_verify", v || undefined)}
                    label={
                      <>
                        <Settings size={15} />
                        Skip TLS Verification
                      </>
                    }
                    helpText="Skip certificate verification when connecting to this HTTPS backend."
                  />
                )}

                <div>
                  <Label>Request Timeout</Label>
                  <HelpText>
                    Response timeout as a Go duration string (max 5m). Leave
                    empty for the default.
                  </HelpText>
                  <Input
                    className="mt-2"
                    placeholder="e.g. 10s, 30s, 1m"
                    value={targetOptions.request_timeout ?? ""}
                    onChange={(e) =>
                      updateOption("request_timeout", e.target.value || undefined)
                    }
                    maxWidthClass="max-w-[200px]"
                    error={timeoutError}
                  />
                </div>

                <div>
                  <Label>Path Rewrite</Label>
                  <HelpText>
                    Controls how the request path is rewritten before forwarding.
                    By default the matched prefix is stripped.
                  </HelpText>
                  <SelectDropdown
                    className="mt-2"
                    value={targetOptions.path_rewrite ?? "default"}
                    onChange={(v) =>
                      updateOption(
                        "path_rewrite",
                        v === "default"
                          ? undefined
                          : (v as ServiceTargetOptionsPathRewrite),
                      )
                    }
                    options={[
                      { value: "default", label: "Strip matched prefix (default)" },
                      { value: "preserve", label: "Preserve full path" },
                    ]}
                  />
                </div>

                <div>
                  <Label>Custom Headers</Label>
                  <HelpText>
                    Extra headers sent to the backend. Hop-by-hop headers
                    (Host, Connection, etc.) are not allowed.
                  </HelpText>
                  {headerEntries.length > 0 && (
                    <div className="flex flex-col gap-2 mt-3">
                      {headerEntries.map((entry, index) => (
                        <div key={entry.id} className="flex items-center gap-2">
                          <Input
                            placeholder="Header name"
                            value={entry.name}
                            onChange={(e) =>
                              updateHeaderEntry(entry.id, "name", e.target.value)
                            }
                            maxWidthClass="flex-1"
                            error={headerErrors[index]?.name}
                            errorTooltip
                          />
                          <Input
                            placeholder="Value"
                            value={entry.value}
                            onChange={(e) =>
                              updateHeaderEntry(entry.id, "value", e.target.value)
                            }
                            maxWidthClass="flex-1"
                            error={headerErrors[index]?.value}
                            errorTooltip
                          />
                          <Button
                            variant="default-outline"
                            className="!px-2 shrink-0"
                            onClick={() => removeHeader(entry.id)}
                            aria-label="Remove header"
                          >
                            <MinusCircleIcon size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    variant="dotted"
                    className="w-full mt-3"
                    size="sm"
                    onClick={addHeader}
                  >
                    <PlusIcon size={14} />
                    Add Header
                  </Button>
                </div>

              </div>
            </TabsContent>
          </Tabs>

          <ModalFooter className={"items-center"}>
            <div className={"w-full"}>
              <Paragraph className={"text-sm mt-auto"}>
                Learn more about
                <InlineLink
                  href={REVERSE_PROXY_TARGETS_DOCS_LINK}
                  target={"_blank"}
                >
                  Targets
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </Paragraph>
            </div>
            <div className="flex gap-3 w-full justify-end">
              {tab === "options" && hasAnyOptions && (
                <Button variant="default-outline" onClick={resetOptions}>
                  <RotateCcw size={14} />
                  Clear
                </Button>
              )}
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!canAddTarget || hasOptionsErrors}
              >
                {currentTarget ? (
                  "Save Changes"
                ) : (
                  <>
                    <PlusCircle size={16} />
                    Add Target
                  </>
                )}
              </Button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal open={installModal} onOpenChange={setInstallModal}>
        <SetupModal />
      </Modal>
    </>
  );
}
