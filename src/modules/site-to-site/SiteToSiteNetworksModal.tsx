import Badge from "@components/Badge";
import Button from "@components/Button";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import { SelectDropdown } from "@components/select/SelectDropdown";
import Separator from "@components/Separator";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { isValidCIDR } from "@utils/ip";
import {
  ExternalLinkIcon,
  FolderDown,
  FolderInput,
  NetworkIcon,
  PlusCircle,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import RoundedFlag from "@/assets/countries/RoundedFlag";
import LongArrowLeftIcon from "@/assets/icons/LongArrowLeftIcon";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Network, NetworkResource } from "@/interfaces/Network";
import {
  defaultSiteResource,
  hasAddressResource,
  resourcesOfNetwork,
} from "@/modules/site-to-site/siteToSite";

const NEW_NETWORK = "__new__";

type Side = {
  networkId: string;
  name: string;
  range: string;
};

const emptySide: Side = { networkId: "", name: "", range: "" };

export type SiteToSiteSelection = {
  source: Network;
  destination: Network;
  sourceResource: NetworkResource;
  destinationResource: NetworkResource;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  networks?: Network[];
  resources?: NetworkResource[];
  countriesOf: (network: Network) => string[];
  onContinue: (selection: SiteToSiteSelection) => void;
};

/**
 * The first step of a site-to-site connection: pick or create the two
 * networks, each with an IP range a policy can start from.
 */
export const SiteToSiteNetworksModal = ({
  open,
  onOpenChange,
  networks,
  resources,
  countriesOf,
  onContinue,
}: Props) => {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      {open && (
        <SiteToSiteNetworksContent
          networks={networks}
          resources={resources}
          countriesOf={countriesOf}
          onContinue={onContinue}
        />
      )}
    </Modal>
  );
};

const SiteToSiteNetworksContent = ({
  networks,
  resources,
  countriesOf,
  onContinue,
}: Omit<Props, "open" | "onOpenChange">) => {
  const { permission } = usePermissions();
  const [source, setSource] = useState<Side>(emptySide);
  const [destination, setDestination] = useState<Side>(emptySide);
  const [isSaving, setIsSaving] = useState(false);

  const createNetwork = useApiCall<Network>("/networks").post;
  const createResource = useApiCall<NetworkResource>("/networks").post;

  const sortedNetworks = useMemo(
    () => [...(networks ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [networks],
  );

  const sideError = (side: Side, other: Side) => {
    if (!side.networkId) return "Select a network";
    if (side.networkId === NEW_NETWORK) {
      const name = side.name.trim();
      if (!name) return "Enter a name";
      if (networks?.some((n) => n.name.toLowerCase() === name.toLowerCase()))
        return "A network with this name already exists";
      if (!isValidCIDR(side.range)) return "Enter an IP range";
      return "";
    }
    if (side.networkId === other.networkId)
      return "Select two different networks";
    const network = networks?.find((n) => n.id === side.networkId);
    if (!hasAddressResource(network, resources) && !isValidCIDR(side.range))
      return "Enter an IP range";
    return "";
  };

  const canContinue =
    !sideError(source, destination) &&
    !sideError(destination, source) &&
    !!permission.networks.create &&
    !!permission.policies.create;

  // Creates what the side needs and returns the network with the resource a
  // policy starts from on that side.
  const prepareSide = async (side: Side, kind: "source" | "destination") => {
    let network = networks?.find((n) => n.id === side.networkId);
    if (side.networkId === NEW_NETWORK) {
      network = await createNetwork({ name: side.name.trim(), description: "" });
    }
    if (!network) throw new Error("network not found");

    const existing = defaultSiteResource(network, resources, kind);
    if (existing && side.networkId !== NEW_NETWORK) {
      return { network, resource: existing };
    }

    // Resource names are unique per account and sites often share a range,
    // so the network's name keeps this one apart.
    const range = side.range.trim();
    const resource = await createResource(
      {
        name: `${network.name} ${range}`,
        description: "",
        address: range,
        groups: [],
        enabled: true,
      },
      `/${network.id}/resources`,
    );
    return { network, resource };
  };

  const submit = async () => {
    if (!canContinue || isSaving) return;
    setIsSaving(true);
    const promise = (async () => {
      const a = await prepareSide(source, "source");
      const b = await prepareSide(destination, "destination");
      onContinue({
        source: a.network,
        destination: b.network,
        sourceResource: a.resource,
        destinationResource: b.resource,
      });
    })().finally(() => setIsSaving(false));

    notify({
      title: "Site-to-Site Connection",
      description: "Networks are ready to connect.",
      loadingMessage: "Preparing networks...",
      promise,
      preventSuccessToast: true,
    });
  };

  const bothSelected = !!source.networkId && !!destination.networkId;

  return (
    <ModalContent maxWidthClass={"max-w-3xl"} showClose={true}>
      <ModalHeader
        icon={<NetworkRoutesIcon className={"fill-netbird"} />}
        title={"Add Site-to-Site Connection"}
        description={
          "Let resources in one network reach resources in another network."
        }
        color={"netbird"}
      />
      <Separator />

      <div className={"px-8 py-6 flex gap-6 items-start"}>
        <NetworkSide
          label={"Source Network"}
          icon={<FolderDown size={15} />}
          side={source}
          onChange={setSource}
          networks={sortedNetworks}
          resources={resources}
          countriesOf={countriesOf}
          excludeId={destination.networkId}
          testId={"source-network"}
        />
        <Badge
          variant={bothSelected ? "blueDark" : "gray"}
          className={"px-4 py-1 mt-[30px] shrink-0"}
          useHover={false}
        >
          <LongArrowLeftIcon
            size={40}
            autoHeight={true}
            className={cn(
              bothSelected ? "fill-sky-500" : "fill-gray-500",
              "rotate-180",
            )}
          />
        </Badge>
        <NetworkSide
          label={"Destination Network"}
          icon={<FolderInput size={15} />}
          side={destination}
          onChange={setDestination}
          networks={sortedNetworks}
          resources={resources}
          countriesOf={countriesOf}
          excludeId={source.networkId}
          testId={"destination-network"}
        />
      </div>

      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            Learn more about
            <InlineLink
              href={"https://docs.netbird.io/manage/networks"}
              target={"_blank"}
            >
              Networks
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          <ModalClose asChild={true}>
            <Button variant={"secondary"}>Cancel</Button>
          </ModalClose>
          <Button
            variant={"primary"}
            onClick={() => void submit()}
            disabled={!canContinue || isSaving}
            data-testid={"site-to-site-continue"}
          >
            Continue
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
};

type NetworkSideProps = {
  label: string;
  icon: React.ReactNode;
  side: Side;
  onChange: (side: Side) => void;
  networks: Network[];
  resources?: NetworkResource[];
  countriesOf: (network: Network) => string[];
  excludeId: string;
  testId: string;
};

const NetworkSide = ({
  label,
  icon,
  side,
  onChange,
  networks,
  resources,
  countriesOf,
  excludeId,
  testId,
}: NetworkSideProps) => {
  const network = networks.find((n) => n.id === side.networkId);
  const isNew = side.networkId === NEW_NETWORK;
  const ranges = resourcesOfNetwork(network, resources).filter(
    (r) => r.type !== "domain",
  );
  const needsRange = isNew || (!!network && ranges.length === 0);
  const countries = network ? countriesOf(network) : [];
  const rangeError =
    side.range && !isValidCIDR(side.range)
      ? "Please enter a valid CIDR, e.g., 10.0.0.0/24"
      : "";

  return (
    <div className={"w-full flex flex-col gap-4"} data-testid={testId}>
      <div>
        <Label className={"mb-2"}>
          {icon}
          {label}
        </Label>
        <SelectDropdown
          value={side.networkId}
          onChange={(v) => onChange({ ...side, networkId: v })}
          placeholder={"Select a network..."}
          showSearch={networks.length > 5}
          options={[
            ...networks
              .filter((n) => n.id !== excludeId)
              .map((n) => ({ value: n.id, label: n.name })),
            { value: NEW_NETWORK, label: "New network", icon: PlusCircle },
          ]}
        />
      </div>

      {countries.length > 0 && (
        <div className={"flex items-center gap-1.5"}>
          {countries.map((c) => (
            <RoundedFlag key={c} country={c} size={14} />
          ))}
        </div>
      )}

      {isNew && (
        <div>
          <Label>Network Name</Label>
          <Input
            placeholder={"e.g., Berlin Office"}
            value={side.name}
            onChange={(e) => onChange({ ...side, name: e.target.value })}
          />
        </div>
      )}

      {!isNew && ranges.length > 0 && (
        <div>
          <HelpText className={"mb-2"}>IP ranges in this network</HelpText>
          <div className={"flex flex-wrap gap-2"}>
            {ranges.slice(0, 4).map((r) => (
              <Badge key={r.id} variant={"gray-ghost"} useHover={false}>
                <NetworkIcon size={12} className={"shrink-0"} />
                {r.address}
              </Badge>
            ))}
            {ranges.length > 4 && (
              <span className={"text-xs text-nb-gray-400 self-center"}>
                +{ranges.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {needsRange && (
        <div>
          <Label>IP Range</Label>
          {!isNew && (
            <HelpText>This network has no IP range yet. Add one.</HelpText>
          )}
          <Input
            customPrefix={<NetworkIcon size={14} />}
            placeholder={"e.g., 10.10.0.0/16"}
            value={side.range}
            error={rangeError}
            onChange={(e) => onChange({ ...side, range: e.target.value })}
          />
        </div>
      )}
    </div>
  );
};
