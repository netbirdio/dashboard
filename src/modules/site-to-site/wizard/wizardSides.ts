import { Address4, Address6 } from "ip-address";
import { Network, NetworkResource } from "@/interfaces/Network";
import { resourcesOfNetwork } from "@/modules/site-to-site/siteToSite";
import { isValidCIDR, parseCIDR } from "@/utils/ip";

export const NEW_NETWORK = "__new__";

/** What the user entered for one side of the connection. */
export type WizardSide = {
  networkId: string;
  name: string;
  rangeName: string;
  range: string;
};

export const emptySide: WizardSide = {
  networkId: "",
  name: "",
  rangeName: "",
  range: "",
};

export type SideInfo = {
  side: WizardSide;
  isNew: boolean;
  network?: Network;
  name: string;
  // The network's IP ranges a policy can start from.
  ranges: NetworkResource[];
  needsRange: boolean;
  nameError: string;
  rangeError: string;
  valid: boolean;
};

const isSingleHost = (cidr: Address4 | Address6) =>
  cidr.subnetMask === (cidr instanceof Address4 ? 32 : 128);

const overlaps = (a: string, b: string) => {
  const x = parseCIDR(a);
  const y = parseCIDR(b);
  if (!x || !y || x.constructor !== y.constructor) return false;
  try {
    return (
      x.isInSubnet(y as Address4 & Address6) ||
      y.isInSubnet(x as Address4 & Address6)
    );
  } catch {
    return false;
  }
};

/**
 * Why the range can't be used, or "" when it can. Hosts in the two
 * networks must be told apart, so the range may not overlap the other side's.
 */
export const rangeProblem = (
  range: string,
  other?: { name: string; address: string },
) => {
  const value = range.trim();
  if (!value) return "";
  const cidr = isValidCIDR(value) ? parseCIDR(value) : null;
  if (!cidr) return "Enter a CIDR block such as 10.30.0.0/24.";
  if (isSingleHost(cidr))
    return "That is a single host. Enter the range the hosts use, such as 10.30.0.0/24.";
  if (other?.address && overlaps(value, other.address))
    return `${value} overlaps ${other.name} (${other.address}). Hosts couldn't tell the two networks apart.`;
  return "";
};

/** Resolves a side against the account and checks it, given the other side. */
export const sideInfo = (
  side: WizardSide,
  networks: Network[] | undefined,
  resources: NetworkResource[] | undefined,
  other?: SideInfo,
): SideInfo => {
  const isNew = side.networkId === NEW_NETWORK;
  const network = isNew
    ? undefined
    : networks?.find((n) => n.id === side.networkId);
  const name = network?.name ?? side.name.trim();
  const ranges = resourcesOfNetwork(network, resources).filter(
    (r) => r.type === "subnet" && r.enabled,
  );
  const chosen = isNew || !!network;
  const needsRange = chosen && ranges.length === 0;

  const taken =
    isNew &&
    !!name &&
    (networks?.some((n) => n.name.toLowerCase() === name.toLowerCase()) ||
      (other?.isNew && other.name.toLowerCase() === name.toLowerCase()));
  const nameError = taken ? "A network with this name already exists." : "";

  const otherRange = other?.ranges[0]
    ? { name: other.ranges[0].name, address: other.ranges[0].address }
    : other?.needsRange && other.side.range.trim()
    ? {
        name: other.side.rangeName.trim() || other.name,
        address: other.side.range.trim(),
      }
    : undefined;
  const rangeError = needsRange ? rangeProblem(side.range, otherRange) : "";
  const rangeOk =
    !needsRange ||
    (!!side.rangeName.trim() && !!side.range.trim() && !rangeError);
  const networkOk = isNew ? !!name && !nameError : !!network;

  return {
    side,
    isNew,
    network,
    name,
    ranges,
    needsRange,
    nameError,
    rangeError,
    valid: networkOk && rangeOk,
  };
};

/** The name a site-to-site policy is proposed with. */
export const siteToSitePolicyName = (
  source?: { resource?: NetworkResource; network?: Network },
  destination?: { resource?: NetworkResource; network?: Network },
) => {
  if (!source?.resource || !destination?.resource) return "";
  const side = (s: { resource?: NetworkResource; network?: Network }) =>
    s.network ? `${s.resource!.name} (${s.network.name})` : s.resource!.name;
  return `${side(source)} to ${side(destination)}`;
};
