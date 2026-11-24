"use client";

import { Callout } from "@components/Callout";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import { HelpTooltip } from "@components/HelpTooltip";
import { Label } from "@components/Label";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import { PortSelector } from "@components/PortSelector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import PolicyDirection from "@components/ui/PolicyDirection";
import { cn } from "@utils/helpers";
import {
  AlertCircleIcon,
  FolderDown,
  FolderInput,
  Power,
  Share2,
  Shield,
  SquareTerminalIcon,
} from "lucide-react";
import * as React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useUsers } from "@/contexts/UsersProvider";
import { NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { Protocol } from "@/interfaces/Policy";
import { SSHAccessType } from "@/modules/access-control/ssh/SSHAccessType";
import { SSHAuthorizedGroups } from "@/modules/access-control/ssh/SSHAuthorizedGroups";
import {
  isNetworkResource,
  useAccessControl,
} from "@/modules/access-control/useAccessControl";

export type PolicyDestinationScope = {
  resourceIds: string[];
  groupIds: string[];
};

export type SiteToSiteScope = {
  sourceResourceIds: string[];
  destinationResourceIds: string[];
};

type Props = {
  state: ReturnType<typeof useAccessControl>;
  className?: string;
  allowEditPeers?: boolean;
  additionalPeers?: Peer[];
  additionalResources?: NetworkResource[];
  // The destination is one network's resources only, and the policy is one-way.
  destinationScope?: PolicyDestinationScope;
  // Each side picks a resource of its own network.
  siteToSiteScope?: SiteToSiteScope;
  disableDestinationSelector?: boolean;
  useSave?: boolean;
};

/**
 * The rule of an access control policy: protocol, source, direction,
 * destination, ports and the enable switch. The policy modal shows it on its
 * Policy tab and the site-to-site wizard on its Access Control tab.
 */
export const PolicyRuleFields = ({
  state,
  className,
  allowEditPeers = false,
  additionalPeers,
  additionalResources,
  destinationScope,
  siteToSiteScope,
  disableDestinationSelector = false,
  useSave = true,
}: Props) => {
  const { permission } = usePermissions();
  const { users } = useUsers();
  const {
    portDisabled,
    destinationGroups,
    direction,
    ports,
    sourceGroups,
    destinationHasResources,
    destinationOnlyResources,
    resourceToResource,
    setSourceGroups,
    setDestinationGroups,
    setPorts,
    setDirection,
    setProtocol,
    enabled,
    setEnabled,
    protocol,
    sourceResource,
    setSourceResource,
    destinationResource,
    setDestinationResource,
    portRanges,
    setPortRanges,
    hasPortSupport,
    sshAccessType,
    setSshAccessType,
    sshAuthorizedGroups,
    setSshAuthorizedGroups,
  } = state;

  const isSiteToSite = !!siteToSiteScope;
  const showSourceResources =
    protocol !== "netbird-ssh" &&
    (isSiteToSite || isNetworkResource(sourceResource));

  const handleProtocolChange = (p: Protocol) => {
    setProtocol(p);
    if (!hasPortSupport(p)) {
      setPorts([]);
      setPortRanges([]);
    }
  };

  return (
    <div className={cn("flex-col flex gap-6", className)}>
      <div
        className={"flex justify-between items-center gap-10"}
        data-testid={"protocol-wrapper"}
      >
        <div className={"w-full"}>
          <Label>Protocol</Label>
          <HelpText className={"max-w-sm"}>
            Allow only specified network protocols. To change traffic direction
            and ports, select{" "}
            <b className={"text-nb-gray-100 dark:text-white"}>TCP</b> or{" "}
            <b className={"text-nb-gray-100 dark:text-white"}>UDP</b> protocol.
          </HelpText>
        </div>
        <Select
          value={protocol}
          onValueChange={(v) => handleProtocolChange(v as Protocol)}
          disabled={!permission.policies.update || !permission.policies.create}
        >
          <SelectTrigger className="w-[280px]">
            <div
              className={"flex items-center gap-3"}
              data-testid={"protocol-select-button"}
            >
              <Share2 size={15} className={"text-nb-gray-300"} />
              <SelectValue placeholder="Select protocol..." />
            </div>
          </SelectTrigger>
          <SelectContent data-testid={"protocol-selection"}>
            <SelectItem value="all">ALL</SelectItem>
            <SelectItem value="tcp">TCP</SelectItem>
            <SelectItem value="udp">UDP</SelectItem>
            <SelectItem value="icmp">ICMP</SelectItem>
            <SelectItem
              value="netbird-ssh"
              extra={
                <HelpTooltip
                  triggerClassName={"ml-[0.01rem]"}
                  align={"center"}
                  side={"right"}
                  content={
                    <>
                      Select NetBird SSH for SSH-specific policies with
                      fine-grained access control, or use TCP with port 22 for
                      basic network-level SSH access
                    </>
                  }
                />
              }
            >
              NetBird SSH
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={"flex gap-6 items-center"}>
        <div className={"w-full self-start"}>
          <Label className={"mb-2"}>
            <FolderDown size={15} />
            Source
            <HelpTooltip
              content={
                <>
                  Typically a group of user devices (e.g., Developers,
                  Marketing) or individual devices in peer-to-peer connections
                  that will access the destination.
                </>
              }
            />
          </Label>
          <PeerGroupSelector
            data-testid={"source-group-selector"}
            popoverWidth={500}
            placeholder={
              isSiteToSite ? "Select source..." : "Select source(s)..."
            }
            showRoutes={protocol !== "netbird-ssh"}
            showResources={showSourceResources}
            showPeers={!isSiteToSite && protocol !== "netbird-ssh"}
            hideGroupsTab={isSiteToSite}
            resourceIds={siteToSiteScope?.sourceResourceIds}
            groupResourcesByNetwork={true}
            showResourceCounter={false}
            showPeerCount={allowEditPeers}
            disableInlineRemoveGroup={false}
            values={sourceGroups}
            onChange={setSourceGroups}
            users={protocol === "netbird-ssh" ? users : undefined}
            resource={sourceResource}
            onResourceChange={setSourceResource}
            additionalPeers={additionalPeers}
            saveGroupAssignments={useSave}
            disabled={
              !permission.policies.update || !permission.policies.create
            }
          />
        </div>
        <PolicyDirection
          value={direction}
          onChange={setDirection}
          disabled={destinationOnlyResources || !!destinationScope}
          protocol={protocol}
          destinationResource={
            resourceToResource ? undefined : destinationResource
          }
        />

        <div className={"w-full self-start"}>
          <Label className={"mb-2"}>
            <FolderInput size={15} />
            Destination
            <HelpTooltip
              content={
                <>
                  Typically a group of peers or resources (e.g., Servers,
                  Databases, Internal Services) that will be accessed by the
                  source. Can also be an individual peer or resource.
                </>
              }
            />
          </Label>
          <PeerGroupSelector
            data-testid={"destination-group-selector"}
            popoverWidth={500}
            placeholder={
              isSiteToSite
                ? "Select destination..."
                : "Select destination(s)..."
            }
            showRoutes={true}
            showResources={protocol !== "netbird-ssh"}
            showPeers={!destinationScope && !isSiteToSite}
            hideGroupsTab={isSiteToSite}
            groupResourcesByNetwork={true}
            resourceIds={
              siteToSiteScope?.destinationResourceIds ??
              destinationScope?.resourceIds
            }
            groupIds={destinationScope?.groupIds}
            hideAllGroup={!!destinationScope}
            showResourceCounter={true}
            showPeerCount={allowEditPeers}
            disableInlineRemoveGroup={false}
            values={destinationGroups}
            onChange={setDestinationGroups}
            resource={destinationResource}
            onResourceChange={setDestinationResource}
            additionalPeers={additionalPeers}
            saveGroupAssignments={useSave}
            additionalResources={additionalResources}
            disabled={
              disableDestinationSelector ||
              !permission.policies.update ||
              !permission.policies.create
            }
          />
        </div>
      </div>

      {destinationHasResources &&
        !destinationOnlyResources &&
        !resourceToResource &&
        direction === "bi" && (
          <Callout
            variant={"warning"}
            icon={
              <AlertCircleIcon
                size={14}
                className={"shrink-0 relative top-[3px] text-netbird"}
              />
            }
            className="mb-4"
          >
            Some destination groups contain resources. Resources only support
            incoming traffic and cannot initiate connections.
          </Callout>
        )}

      {protocol === "netbird-ssh" ? (
        <div>
          {destinationHasResources && (
            <Callout
              variant={"warning"}
              icon={
                <AlertCircleIcon
                  size={14}
                  className={"shrink-0 relative top-[3px] text-netbird"}
                />
              }
              className="mb-6"
            >
              SSH access only works on peers, not on routed resources. Please
              ensure your destination groups contain peers for SSH connectivity.
            </Callout>
          )}
          <div className={"flex justify-between items-center gap-10 mt-2"}>
            <div className={"w-full"}>
              <Label className={"flex items-center gap-2"}>
                <SquareTerminalIcon size={15} />
                SSH Access
              </Label>
              <HelpText>
                Select {`'Full Access'`} to allow SSH as any local user, or{" "}
                {`'Limited Access'`} to specify which local users each group is
                allowed to use.
              </HelpText>
            </div>
            <SSHAccessType value={sshAccessType} onChange={setSshAccessType} />
          </div>
          <SSHAuthorizedGroups
            sourceGroups={sourceGroups}
            authorizedGroups={sshAuthorizedGroups}
            setAuthorizedGroups={setSshAuthorizedGroups}
            accessType={sshAccessType}
          />
        </div>
      ) : (
        <div
          className={cn(
            "mb-2 mt-2",
            portDisabled && "opacity-30 pointer-events-none",
          )}
        >
          <div>
            <Label className={"flex items-center gap-2"}>
              <Shield size={14} />
              Ports
            </Label>
            <HelpText>
              Allow network traffic and access only to specified ports. Select
              ports or port ranges between 1 and 65535.
            </HelpText>
          </div>
          <div className={""}>
            <PortSelector
              showAll={true}
              ports={ports}
              onPortsChange={setPorts}
              portRanges={portRanges}
              onPortRangesChange={setPortRanges}
              disabled={portDisabled}
            />
          </div>
        </div>
      )}

      <FancyToggleSwitch
        value={enabled}
        onChange={setEnabled}
        disabled={!permission.policies.update || !permission.policies.create}
        label={
          <>
            <Power size={15} />
            Enable Policy
          </>
        }
        helpText={"Use this switch to enable or disable the policy."}
      />
    </div>
  );
};
