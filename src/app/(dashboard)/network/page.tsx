"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import Card from "@components/Card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import FullTooltip from "@components/FullTooltip";
import InlineLink from "@components/InlineLink";
import Separator from "@components/Separator";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import useRedirect from "@hooks/useRedirect";
import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import {
  ArrowUpRightIcon,
  HelpCircle,
  MoreVertical,
  PencilLineIcon,
  ServerIcon,
  ShieldCheckIcon,
  ShieldXIcon,
  Trash2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Network } from "@/interfaces/Network";
import PageContainer from "@/layouts/PageContainer";
import { NetworkInformationSquare } from "@/modules/networks/misc/NetworkInformationSquare";
import {
  NetworkProvider,
  useNetworksContext,
} from "@/modules/networks/NetworkProvider";
import { ResourcesSection } from "@/modules/networks/resources/ResourcesSection";
import { NetworkRoutingPeersSection } from "@/modules/networks/routing-peers/NetworkRoutingPeersSection";

export default function NetworkDetailPage() {
  const queryParameter = useSearchParams();
  const networkId = queryParameter.get("id");
  const { data: network, isLoading } = useFetchApi<Network>(
    `/networks/${networkId}`,
    true,
  );

  useRedirect("/networks", false, !networkId);

  return network && !isLoading ? (
    <NetworkOverview network={network} />
  ) : (
    <FullScreenLoading />
  );
}

function NetworkOverview({ network }: Readonly<{ network: Network }>) {
  const { permission } = usePermissions();

  const [networkModal, setNetworkModal] = useState(false);
  const { mutate } = useSWRConfig();

  const isActive = !!(
    network?.routing_peers_count && network.routing_peers_count > 0
  );

  return (
    <PageContainer>
      <NetworkProvider network={network}>
        <div className={"p-default py-6 mb-4"}>
          <Breadcrumbs>
            <Breadcrumbs.Item
              href={"/networks"}
              label={"Networks"}
              disabled={!permission.networks.read}
              icon={<NetworkRoutesIcon size={13} />}
            />
            <Breadcrumbs.Item
              href={"/network"}
              label={network.name}
              active={true}
            />
          </Breadcrumbs>

          <div className={"flex justify-between max-w-6xl"}>
            <div
              className={"w-full lg:w-1/2 flex justify-between items-center"}
            >
              <div
                className={cn(
                  "flex items-center w-full",
                  !network.description && "gap-2",
                )}
              >
                <NetworkInformationSquare
                  name={network.name}
                  active={isActive}
                  size={"lg"}
                  description={network.description}
                />
              </div>
              <NetworkProvider network={network}>
                <NetworkActions />
              </NetworkProvider>
            </div>
          </div>

          <div className={"flex gap-10 w-full mt-8 max-w-6xl items-start"}>
            <NetworkInformationCard network={network} />
          </div>
        </div>

        <Separator />
        <ResourcesSection network={network} />
        <div className={"h-3"} />
        <Separator />
        <NetworkRoutingPeersSection network={network} />
      </NetworkProvider>
    </PageContainer>
  );
}

function NetworkActions() {
  const { permission } = usePermissions();
  const { deleteNetwork, openEditNetworkModal, network } = useNetworksContext();
  const router = useRouter();

  if (!network) return;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        asChild={true}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <Button variant={"secondary"} className={"!px-3"}>
          <MoreVertical size={16} className={"shrink-0"} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-auto" align="end">
        <DropdownMenuItem
          onClick={() => openEditNetworkModal(network)}
          disabled={!permission.networks.update}
        >
          <div className={"flex gap-3 items-center"}>
            <PencilLineIcon size={14} className={"shrink-0"} />
            Rename
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() =>
            deleteNetwork(network).then(() => router.push("/networks"))
          }
          variant={"danger"}
          disabled={!permission.networks.delete}
        >
          <div className={"flex gap-3 items-center"}>
            <Trash2 size={14} className={"shrink-0"} />
            Delete
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NetworkInformationCard({ network }: Readonly<{ network: Network }>) {
  const isHighlyAvailable = !!(
    network?.routing_peers_count && network?.routing_peers_count >= 2
  );

  const disabledText = useMemo(
    () => (
      <>
        High availability is currently{" "}
        <span className={"text-yellow-400 font-medium"}>inactive</span> for this
        network.
      </>
    ),
    [],
  );

  const enabledText = useMemo(
    () => (
      <>
        High availability is{" "}
        <span className={"text-green-500 font-medium"}>active</span> for this
        network.
      </>
    ),
    [],
  );

  const policyCount = network.policies?.length ?? 0;

  return (
    <Card className={"w-full lg:w-1/2"}>
      <Card.List>
        <Card.ListItem
          tooltip={false}
          label={
            <>
              <ServerIcon size={16} />
              High Availability
            </>
          }
          value={
            <FullTooltip
              interactive={false}
              content={
                <div className={"max-w-xs text-xs"}>
                  {isHighlyAvailable ? enabledText : disabledText}
                  {isHighlyAvailable ? (
                    <div className={"inline-flex mt-2"}>
                      You can add more routing peers to increase the
                      availability of this network.
                    </div>
                  ) : (
                    <div className={"inline-flex mt-2"}>
                      Go ahead and add more routing peers or groups with routing
                      peers to enable high availability for this network.
                    </div>
                  )}
                </div>
              }
            >
              <div
                className={cn(
                  "flex gap-2.5 items-center text-nb-gray-300 text-sm cursor-help",
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    !isHighlyAvailable ? "bg-yellow-400" : "bg-green-500",
                  )}
                ></span>
                {isHighlyAvailable ? "Active" : "Inactive"}
                <HelpCircle size={12} />
              </div>
            </FullTooltip>
          }
        />
        <Card.ListItem
          tooltip={false}
          label={
            policyCount > 0 ? (
              <>
                <ShieldCheckIcon size={16} className={"text-green-500"} />
                {policyCount}{" "}
                {policyCount === 1 ? "Active Policy" : "Active Policies"}
              </>
            ) : (
              <>
                <ShieldXIcon size={16} className={"text-red-500"} />
                No Active Policies
              </>
            )
          }
          value={
            policyCount > 0 ? (
              <InlineLink href={"/access-control"}>
                Go to Policies
                <ArrowUpRightIcon size={14} />
              </InlineLink>
            ) : null
          }
        />
      </Card.List>
    </Card>
  );
}
