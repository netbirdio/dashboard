export type ICMPv6Type = keyof typeof ICMPv6Types;

export const ICMPv6Types = {
  1: {
    name: "Destination Unreachable",
    codes: {
      0: "No route to destination",
      1: "Administratively prohibited",
      2: "Beyond scope of source address",
      3: "Address unreachable",
      4: "Port unreachable",
      5: "Source address failed ingress/egress policy",
      6: "Reject route to destination",
    },
  },
  2: {
    name: "Packet Too Big",
    codes: {
      0: "No Code",
    },
  },
  3: {
    name: "Time Exceeded",
    codes: {
      0: "Hop limit exceeded in transit",
      1: "Fragment reassembly time exceeded",
    },
  },
  4: {
    name: "Parameter Problem",
    codes: {
      0: "Erroneous header field encountered",
      1: "Unrecognized Next Header type encountered",
      2: "Unrecognized IPv6 option encountered",
    },
  },
  128: {
    name: "Echo Request",
    codes: {
      0: "No Code",
    },
  },
  129: {
    name: "Echo Reply",
    codes: {
      0: "No Code",
    },
  },
  130: {
    name: "Multicast Listener Query",
    codes: { 0: "No Code" },
  },
  131: {
    name: "Multicast Listener Report",
    codes: { 0: "No Code" },
  },
  132: {
    name: "Multicast Listener Done",
    codes: { 0: "No Code" },
  },
  133: {
    name: "Router Solicitation",
    codes: { 0: "No Code" },
  },
  134: {
    name: "Router Advertisement",
    codes: { 0: "No Code" },
  },
  135: {
    name: "Neighbor Solicitation",
    codes: { 0: "No Code" },
  },
  136: {
    name: "Neighbor Advertisement",
    codes: { 0: "No Code" },
  },
  137: {
    name: "Redirect Message",
    codes: { 0: "No Code" },
  },
} as const;

export function getICMPv6TypeName(type: number): string {
  const entry = ICMPv6Types[type as ICMPv6Type];
  if (!entry) return `Type ${type}`;
  return entry.name;
}

export function getICMPv6CodeDescription(type: number, code: number): string {
  const entry = ICMPv6Types[type as ICMPv6Type];
  if (!entry) return `Code ${code}`;
  const codeName =
    entry.codes[code as keyof (typeof ICMPv6Types)[ICMPv6Type]["codes"]];
  return codeName || `Code ${code}`;
}
