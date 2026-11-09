import Badge from "@components/Badge";
import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import { Callout } from "@components/Callout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import FullTooltip from "@components/FullTooltip";
import InlineLink from "@components/InlineLink";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import { ToggleSwitch } from "@components/ToggleSwitch";
import GetStartedTest from "@components/ui/GetStartedTest";
import MultipleGroups from "@components/ui/MultipleGroups";
import * as Tabs from "@radix-ui/react-tabs";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import useFetchApi, { useApiCall } from "@utils/api";
import {
  CloudOffIcon,
  ExternalLinkIcon,
  LifeBuoyIcon,
  MoreVertical,
  PencilIcon,
  PlusCircle,
  RadioTowerIcon,
  RocketIcon,
  Trash2,
} from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import RoundedFlag from "@/assets/countries/RoundedFlag";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { useIsFeatureLocked } from "@/cloud/cloud-hooks/useIsFeatureLocked";
import { useCountries } from "@/contexts/CountryProvider";
import { useDialog } from "@/contexts/DialogProvider";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Group } from "@/interfaces/Group";
import { Relay } from "@/interfaces/Relay";
import { LockedFeatureInfoCard } from "@/modules/billing/locked-feature/LockedFeatureInfoCard";
import { LockedFeatureOverlay } from "@/modules/billing/locked-feature/LockedFeatureOverlay";
import { formatCredentialsTTL } from "@/modules/settings/relays/relayHelpers";
import RelayModal, {
  instanceRelaysLabel,
  RelayModalTab,
  RELAYS_DOCS_LINK,
} from "@/modules/settings/relays/RelayModal";

type EditTarget = { relay: Relay | null; tab: RelayModalTab };

export default function RelaysTab() {
  const { permission } = usePermissions();
  const { mutate } = useSWRConfig();
  const isLocked = useIsFeatureLocked("CUSTOM_RELAYS");
  const { data: relays, isLoading } = useFetchApi<Relay[]>("/relays");
  const [target, setTarget] = useState<EditTarget | null>(null);

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort-relays",
    [{ id: "name", desc: false }],
  );

  const open = (relay: Relay | null, tab: RelayModalTab = "general") =>
    setTarget({ relay, tab });

  const canCreate = permission.settings.update && !isLocked;
  const hasRelays = !!relays && relays.length > 0;

  const columns = useRelayColumns(open);

  return (
    <Tabs.Content value={"relays"} className={"w-full"}>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/settings"}
            label={"Settings"}
            icon={<SettingsIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings?tab=relays"}
            label={"Relays"}
            icon={<RadioTowerIcon size={14} />}
            active
          />
        </Breadcrumbs>
        <div className={"flex items-start justify-between -mt-1"}>
          <div>
            <h1>Relays</h1>
            <Paragraph className={"block max-w-3xl"}>
              When peers cannot connect directly, their traffic goes through a
              relay. Run your own relays to keep relayed traffic on your
              infrastructure or closer to your peers.{" "}
              <InlineLink href={RELAYS_DOCS_LINK} target={"_blank"}>
                Learn more
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </Paragraph>
          </div>
        </div>
        <LockedFeatureInfoCard
          feature={"CUSTOM_RELAYS"}
          featureText={"Custom relays"}
        />
        {hasRelays && (
          <Callout className={"mt-6 max-w-3xl"} data-testid="relays-coverage">
            Peers that match no relay below keep using the{" "}
            {instanceRelaysLabel()}. Peer traffic is end-to-end encrypted on
            every relay.
          </Callout>
        )}
      </div>

      <RelayModal
        open={!!target}
        onClose={() => setTarget(null)}
        relay={target?.relay}
        initialTab={target?.tab}
      />

      <LockedFeatureOverlay feature={"CUSTOM_RELAYS"} opacity={60}>
        <DataTable
          isLoading={isLoading}
          text={"Relays"}
          sorting={sorting}
          setSorting={setSorting}
          columns={columns}
          data={relays}
          columnVisibility={{ search: false }}
          onRowClick={(row) => open(row.original)}
          searchPlaceholder={"Search by name or address..."}
          getStartedCard={
            <GetStartedTest
              icon={
                <SquareIcon
                  icon={
                    <RadioTowerIcon size={20} className={"text-nb-gray-200"} />
                  }
                  color={"gray"}
                  size={"large"}
                />
              }
              title={"Add your own relay"}
              description={`Your peers use the ${instanceRelaysLabel()} today. Add a relay you operate and choose which groups or locations use it.`}
              button={
                <Button
                  variant={"primary"}
                  onClick={() => open(null)}
                  disabled={!canCreate}
                  data-testid="add-relay-empty"
                >
                  <PlusCircle size={16} />
                  Add Relay
                </Button>
              }
            />
          }
          rightSide={() =>
            hasRelays && (
              <Button
                variant={"primary"}
                className={"ml-auto"}
                onClick={() => open(null)}
                disabled={!canCreate}
                data-testid="add-relay"
              >
                <PlusCircle size={16} />
                Add Relay
              </Button>
            )
          }
        >
          {(table) => (
            <>
              <DataTableRowsPerPage table={table} disabled={!hasRelays} />
              <DataTableRefreshButton
                isDisabled={!hasRelays}
                onClick={() => mutate("/relays")}
              />
            </>
          )}
        </DataTable>
      </LockedFeatureOverlay>
    </Tabs.Content>
  );
}

function useRelayColumns(
  open: (relay: Relay, tab?: RelayModalTab) => void,
): ColumnDef<Relay>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableHeader column={column}>Name</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => <RelayNameCell relay={row.original} />,
    },
    {
      id: "distribution",
      header: ({ column }) => (
        <DataTableHeader column={column}>Distribution</DataTableHeader>
      ),
      cell: ({ row }) => <RelayDistributionCell relay={row.original} />,
    },
    {
      id: "fallback",
      accessorFn: (r) => r.instance_fallback,
      header: ({ column }) => (
        <DataTableHeader column={column}>Fallback</DataTableHeader>
      ),
      cell: ({ row }) => <RelayFallbackCell relay={row.original} />,
    },
    {
      id: "credentials_ttl",
      accessorKey: "credentials_ttl",
      header: ({ column }) => (
        <DataTableHeader column={column}>Rotation</DataTableHeader>
      ),
      cell: ({ row }) => (
        <span className={"text-nb-gray-300 text-sm whitespace-nowrap"}>
          {formatCredentialsTTL(row.original.credentials_ttl)}
        </span>
      ),
    },
    {
      id: "enabled",
      accessorKey: "enabled",
      header: ({ column }) => (
        <DataTableHeader column={column}>Active</DataTableHeader>
      ),
      cell: ({ row }) => <RelayActiveCell relay={row.original} />,
    },
    {
      id: "search",
      accessorFn: (r) => r.addresses.join(" "),
    },
    {
      id: "actions",
      accessorKey: "id",
      header: "",
      cell: ({ row }) => <RelayActionCell relay={row.original} open={open} />,
    },
  ];
}

function RelayNameCell({ relay }: Readonly<{ relay: Relay }>) {
  const [first, ...rest] = relay.addresses;
  return (
    <div className={"flex items-center gap-3"}>
      <SquareIcon
        icon={<RadioTowerIcon size={14} className={"text-nb-gray-200"} />}
        color={"gray"}
      />
      <div className={"flex flex-col gap-0.5"}>
        <span className={"font-medium text-nb-gray-100"}>{relay.name}</span>
        <span className={"text-xs text-nb-gray-400 font-mono"}>
          {first}
          {rest.length > 0 && (
            <FullTooltip
              content={
                <div className={"text-xs font-mono flex flex-col gap-1"}>
                  {rest.map((a) => (
                    <span key={a}>{a}</span>
                  ))}
                </div>
              }
            >
              <span className={"ml-1.5 text-nb-gray-300"}>+{rest.length}</span>
            </FullTooltip>
          )}
        </span>
      </div>
    </div>
  );
}

function RelayDistributionCell({ relay }: Readonly<{ relay: Relay }>) {
  const { groups } = useGroups();
  const { countries } = useCountries();
  const relayGroups = relay.distribution.groups
    .map((id) => groups?.find((g) => g.id === id))
    .filter(Boolean) as Group[];
  const locations = relay.distribution.locations;
  const countryName = (code: string) =>
    countries?.find((c) => c.country_code === code)?.country_name ?? code;

  return (
    <div className={"flex items-center gap-2"}>
      {relayGroups.length > 0 && (
        <MultipleGroups
          groups={relayGroups}
          label={"Distribution Groups"}
          description={"Peers in these groups receive this relay"}
        />
      )}
      {locations.length > 0 && (
        <FullTooltip
          content={
            <div className={"flex flex-col gap-2 text-xs"}>
              {locations.map((l) => (
                <div key={l.country_code} className={"flex items-center gap-2"}>
                  <RoundedFlag country={l.country_code} size={14} />
                  {countryName(l.country_code)}
                </div>
              ))}
            </div>
          }
        >
          <Badge variant={"gray-ghost"} useHover={true}>
            <div className={"flex -space-x-1.5"}>
              {locations.slice(0, 3).map((l) => (
                <RoundedFlag
                  key={l.country_code}
                  country={l.country_code}
                  size={14}
                />
              ))}
            </div>
            <span className={"ml-1"}>
              {locations.length === 1
                ? countryName(locations[0].country_code)
                : `${locations.length} Countries`}
            </span>
          </Badge>
        </FullTooltip>
      )}
    </div>
  );
}

function RelayFallbackCell({ relay }: Readonly<{ relay: Relay }>) {
  return relay.instance_fallback ? (
    <FullTooltip
      content={
        <div className={"text-xs max-w-xs"}>
          If this relay is unreachable, peers use the {instanceRelaysLabel()}.
        </div>
      }
    >
      <Badge variant={"gray-ghost"}>
        <LifeBuoyIcon size={12} />
        Allowed
      </Badge>
    </FullTooltip>
  ) : (
    <FullTooltip
      content={
        <div className={"text-xs max-w-xs"}>
          Relayed traffic of matched peers stays on your relays, even when they
          are unreachable.
        </div>
      }
    >
      <Badge variant={"netbird"}>
        <CloudOffIcon size={12} />
        Disabled
      </Badge>
    </FullTooltip>
  );
}

function RelayActiveCell({ relay }: Readonly<{ relay: Relay }>) {
  const { permission } = usePermissions();
  const { mutate } = useSWRConfig();
  const request = useApiCall<Relay>("/relays/" + relay.id);

  const toggle = (enabled: boolean) =>
    notify({
      title: relay.name,
      description: `Relay was ${enabled ? "enabled" : "disabled"}.`,
      promise: request.put({ ...relay, enabled }).then(() => mutate("/relays")),
      loadingMessage: "Updating relay...",
    });

  return (
    <ToggleSwitch
      checked={relay.enabled}
      onCheckedChange={toggle}
      disabled={!permission.settings.update}
      size={"small"}
    />
  );
}

function RelayActionCell({
  relay,
  open,
}: Readonly<{
  relay: Relay;
  open: (relay: Relay, tab?: RelayModalTab) => void;
}>) {
  const { confirm } = useDialog();
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();
  const deleteRequest = useApiCall<Relay>("/relays/" + relay.id);

  const handleDelete = async () => {
    const choice = await confirm({
      title: `Delete '${relay.name}'?`,
      description: relay.instance_fallback
        ? `Peers using this relay switch to the ${instanceRelaysLabel()} or other matching relays.`
        : "Peers that only match this relay switch to the " +
          instanceRelaysLabel() +
          ". Relayed traffic may leave your infrastructure.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;

    notify({
      title: "Delete Relay",
      description: `Relay '${relay.name}' was deleted.`,
      promise: deleteRequest.del().then(() => mutate("/relays")),
      loadingMessage: "Deleting relay...",
    });
  };

  return (
    <div className={"flex justify-end"}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={"secondary"}
            className={"p-2"}
            data-testid="relay-actions"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={"end"} onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem
            onClick={() => open(relay)}
            disabled={!permission.settings.update}
          >
            <PencilIcon size={14} className={"mr-2"} />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => open(relay, "deploy")}>
            <RocketIcon size={14} className={"mr-2"} />
            Deploy Instructions
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDelete}
            disabled={!permission.settings.update}
            className={"text-red-500 focus:text-red-500"}
            data-testid="delete-relay"
          >
            <Trash2 size={14} className={"mr-2"} />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
