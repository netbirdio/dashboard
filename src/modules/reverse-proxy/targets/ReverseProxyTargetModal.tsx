"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@components/Accordion";
import Button from "@components/Button";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { Modal, ModalContent, ModalFooter } from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { SelectDropdown } from "@components/select/SelectDropdown";
import {
  AlertTriangle,
  ClockFadingIcon,
  ExternalLinkIcon,
  PlusCircle,
  Server,
  ShieldXIcon,
} from "lucide-react";
import { Callout } from "@components/Callout";
import React, { useMemo, useRef, useState } from "react";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import {
  REVERSE_PROXY_TARGETS_DOCS_LINK,
  ReverseProxy,
  ReverseProxyTarget,
  ReverseProxyTargetProtocol,
  ReverseProxyTargetType,
  ServiceMode,
  ServiceTargetOptionsPathRewrite,
} from "@/interfaces/ReverseProxy";
import {
  defaultPortForProtocol,
  isResourceTargetType,
} from "@/contexts/ReverseProxiesProvider";
import { cn } from "@utils/helpers";
import { HelpTooltip } from "@components/HelpTooltip";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import ReverseProxyTargetCustomHeaders from "@/modules/reverse-proxy/targets/ReverseProxyTargetCustomHeaders";
import ReverseProxyTargetSelector, {
  Target,
} from "@/modules/reverse-proxy/targets/ReverseProxyTargetSelector";
import { useReverseProxyTargetOptions } from "@/modules/reverse-proxy/targets/useReverseProxyTargetOptions";
import ReverseProxyAddressInput, {
  CidrHelpText,
  useReverseProxyAddress,
} from "@/modules/reverse-proxy/targets/ReverseProxyAddressInput";
import Separator from "@components/Separator";

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

  const [target, setTarget] = useState<Target | undefined>(
    currentTarget || initialResource || initialPeer
      ? {
          type:
            currentTarget?.target_type ??
            (initialResource
              ? (initialResource.type as ReverseProxyTargetType) ??
                ReverseProxyTargetType.HOST
              : ReverseProxyTargetType.PEER),
          peerId:
            currentTarget?.target_type === ReverseProxyTargetType.PEER
              ? currentTarget?.target_id
              : initialPeer?.id,
          resourceId:
            currentTarget && isResourceTargetType(currentTarget.target_type)
              ? currentTarget?.target_id
              : initialResource?.id,
          host: getInitialHost(currentTarget, initialResource, initialPeer),
        }
      : undefined,
  );

  const [targetProtocol, setTargetProtocol] =
    useState<ReverseProxyTargetProtocol>(
      currentTarget?.protocol ?? ReverseProxyTargetProtocol.HTTP,
    );
  const [targetPort, setTargetPort] = useState<number>(
    currentTarget?.port ?? 0,
  );
  const [targetPath, setTargetPath] = useState(currentTarget?.path ?? "");
  const [accessLocal] = useState(currentTarget?.access_local ?? false);
  const [options, setOption, { getTargetOptions, headers, errors }] =
    useReverseProxyTargetOptions(currentTarget?.options);
  const portInputRef = useRef<HTMLInputElement>(null);

  const { isCidrRange, isHostEditable, isValidCidrHost } =
    useReverseProxyAddress(target);

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
    if (!target) return false;
    if (target.type === ReverseProxyTargetType.PEER) {
      return !!target.peerId;
    }
    if (isResourceTargetType(target.type)) {
      return !!target.resourceId && isValidCidrHost;
    }
    return false;
  }, [
    isPathDuplicate,
    isValidPort,
    initialResource,
    initialPeer,
    target,
    isValidCidrHost,
  ]);

  const hasTarget = !!(initialResource || initialPeer || target);

  const handleSave = () => {
    if (!target) return;
    const resolvedType = initialPeer
      ? ReverseProxyTargetType.PEER
      : target.type;
    const resolvedIsResource =
      isResourceTargetType(resolvedType) || !!initialResource;
    const targetData: ReverseProxyTarget = {
      target_type: resolvedType,
      target_id:
        resolvedType === ReverseProxyTargetType.PEER
          ? target.peerId
          : target.resourceId,
      protocol: targetProtocol,
      host:
        resolvedType === ReverseProxyTargetType.SUBNET
          ? target.host
          : undefined,
      port: targetPort,
      path: targetPath || undefined,
      enabled: currentTarget?.enabled ?? true,
      access_local: resolvedIsResource ? accessLocal : undefined,
      options: getTargetOptions(),
    };
    onSave(targetData);
    onOpenChange(false);
  };

  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange}>
        <ModalContent maxWidthClass="max-w-2xl">
          <ModalHeader
            icon={<Server className="text-netbird" size={16} />}
            title={currentTarget ? "Edit Target" : "Add Target"}
            description="Configure the target for your reverse proxy."
            color="netbird"
          />

          <Separator />

          <div className="px-8 pt-5 pb-4 flex flex-col gap-6">
            {!initialResource && !initialPeer && (
              <ReverseProxyTargetSelector
                value={target}
                initialNetwork={initialNetwork}
                onChange={(selection) => {
                  setTarget(selection);
                  if (selection) {
                    setTimeout(() => portInputRef.current?.focus(), 0);
                  }
                }}
              />
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
                    if (!value || value === "/") {
                      setOption("path_rewrite", undefined);
                    }
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
                  This location is already used by another target and cannot be
                  added. <br /> Please use a different location.
                </Callout>
              )}
              {targetPath &&
                targetPath !== "/" &&
                hasTarget &&
                !isPathDuplicate && (
                  <FancyToggleSwitch
                    value={options.path_rewrite === "preserve"}
                    onChange={(v) =>
                      setOption(
                        "path_rewrite",
                        v
                          ? ("preserve" as ServiceTargetOptionsPathRewrite)
                          : undefined,
                      )
                    }
                    className={"mt-3.5"}
                    label={
                      <>
                        Preserve Full Path
                        <HelpTooltip
                          content={
                            <div className="text-xs max-w-xs flex flex-col gap-2">
                              <div>
                                When disabled, a request to e.g.,{" "}
                                <span className="font-mono text-white">
                                  {targetPath}/users
                                </span>{" "}
                                is forwarded as{" "}
                                <span className="font-mono text-white">
                                  /users
                                </span>
                                .
                              </div>
                              <div>
                                When enabled, a request to e.g.,{" "}
                                <span className="font-mono text-white">
                                  {targetPath}/users
                                </span>{" "}
                                is forwarded as{" "}
                                <span className="font-mono text-white">
                                  {targetPath}/users
                                </span>
                                .
                              </div>
                            </div>
                          }
                        />
                      </>
                    }
                    helpText={
                      <div>
                        Keep the original full request path when forwarding.{" "}
                        <br />
                        When disabled the matched prefix path is stripped.
                      </div>
                    }
                  />
                )}
            </div>

            <div>
              <div className="flex mt-1">
                <div className="flex-1">
                  <Label>
                    Protocol & Host / IP
                    <CidrHelpText target={target} />
                  </Label>
                  <div className="flex items-center mt-2">
                    <div className="w-[120px]">
                      <SelectDropdown
                        value={targetProtocol}
                        onChange={(v) => {
                          const proto = v as ReverseProxyTargetProtocol;
                          setTargetProtocol(proto);
                          if (proto !== ReverseProxyTargetProtocol.HTTPS) {
                            setOption("skip_tls_verify", undefined);
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
                      <ReverseProxyAddressInput
                        value={target}
                        onChange={setTarget}
                        autoFocus={!!initialResource && isHostEditable}
                        className="!rounded-l-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="w-[150px]">
                  <Label>
                    Port
                    <HelpTooltip
                      content={
                        "Enter the port where your service (e.g., webserver, app, API) is currently listening. If left empty, defaults to port 80 for HTTP or 443 for HTTPS."
                      }
                    />
                  </Label>
                  <div className="mt-2">
                    <Input
                      ref={portInputRef}
                      type="number"
                      className={"rounded-l-none"}
                      value={targetPort === 0 ? "" : targetPort}
                      onChange={(e) =>
                        setTargetPort(parseInt(e.target.value) || 0)
                      }
                      placeholder={String(
                        defaultPortForProtocol(targetProtocol),
                      )}
                      min={0}
                      max={65535}
                      disabled={!hasTarget}
                      autoFocus={!!initialResource && !isHostEditable}
                    />
                  </div>
                </div>
              </div>
              {targetProtocol === ReverseProxyTargetProtocol.HTTPS &&
                hasTarget && (
                  <FancyToggleSwitch
                    className={"mt-3.5"}
                    value={options.skip_tls_verify ?? false}
                    onChange={(v) =>
                      setOption("skip_tls_verify", v || undefined)
                    }
                    label={
                      <>
                        <ShieldXIcon size={15} />
                        Skip TLS Verification
                      </>
                    }
                    helpText="Skip certificate verification when connecting to this target. Useful if your service already uses a self-signed certificate."
                  />
                )}
            </div>

            <Accordion
              type={"multiple"}
              className={"flex flex-col gap-2 -mt-2"}
            >
              <AccordionItem value={"optional-settings"}>
                <AccordionTrigger
                  className={
                    "text-[0.8rem] tracking-wider text-nb-gray-200 py-4 my-0 leading-none gap-2 flex items-center"
                  }
                >
                  <span className={"relative top-[1px]"}>
                    Optional Settings
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className={"flex flex-col gap-8 pb-6 pt-2"}>
                    <div className={"flex items-center justify-between"}>
                      <div>
                        <Label>Request Timeout</Label>
                        <HelpText className={"mb-0"}>
                          Max time to wait for a response as duration string
                          (e.g. 30s, 2m). <br /> Leave this field empty for no
                          timeout.
                        </HelpText>
                      </div>
                      <Input
                        customPrefix={<ClockFadingIcon size={16} />}
                        placeholder="e.g. 10s, 30s, 1m"
                        value={options.request_timeout ?? ""}
                        onChange={(e) =>
                          setOption(
                            "request_timeout",
                            e.target.value || undefined,
                          )
                        }
                        maxWidthClass="w-[180px]"
                        errorTooltip={true}
                        error={errors.timeout}
                      />
                    </div>

                    {reverseProxy.mode === ServiceMode.UDP && (
                      <div className={"flex items-center justify-between"}>
                        <div>
                          <Label>Session Idle Timeout</Label>
                          <HelpText className={"mb-0"}>
                            How long a UDP session stays alive without traffic
                            (e.g., 30s, 2m). <br /> Defaults to 30s when empty.
                          </HelpText>
                        </div>
                        <Input
                          customPrefix={<ClockFadingIcon size={16} />}
                          placeholder="e.g. 30s, 2m, 5m"
                          value={options.session_idle_timeout ?? ""}
                          onChange={(e) =>
                            setOption(
                              "session_idle_timeout",
                              e.target.value || undefined,
                            )
                          }
                          maxWidthClass="w-[180px]"
                          errorTooltip={true}
                          error={errors.sessionIdleTimeout}
                        />
                      </div>
                    )}

                    <ReverseProxyTargetCustomHeaders {...headers} />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

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
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!canAddTarget || errors.options}
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
    </>
  );
}
