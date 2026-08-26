export type ICMPType = keyof typeof ICMPTypes;
export type ICMPCode<T extends ICMPType = ICMPType> =
  keyof (typeof ICMPTypes)[T]["codes"];

// ICMP Types and their associated Codes
export const ICMPTypes = {
  // Type 0 - Echo Reply
  0: {
    name: "Echo Reply",
    codes: {
      0: "No Code",
    },
  },

  // Type 1 - Unassigned (Reserved)
  1: {
    name: "Unassigned",
    codes: {},
  },

  // Type 2 - Unassigned (Reserved)
  2: {
    name: "Unassigned",
    codes: {},
  },

  // Type 3 - Destination Unreachable
  3: {
    name: "Unreachable",
    codes: {
      0: "Net Unreachable",
      1: "Host Unreachable",
      2: "Protocol Unreachable",
      3: "Port Unreachable",
      4: "Fragmentation Needed and Don't Fragment was Set",
      5: "Source Route Failed",
      6: "Destination Network Unknown",
      7: "Destination Host Unknown",
      8: "Source Host Isolated",
      9: "Communication with Destination Network is Administratively Prohibited",
      10: "Communication with Destination Host is Administratively Prohibited",
      11: "Destination Network Unreachable for Type of Service",
      12: "Destination Host Unreachable for Type of Service",
      13: "Communication Administratively Prohibited",
      14: "Host Precedence Violation",
      15: "Precedence cutoff in effect",
    },
  },

  // Type 4 - Source Quench
  4: {
    name: "Source Quench",
    codes: {
      0: "No Code",
    },
  },

  // Type 5 - Redirect
  5: {
    name: "Redirect",
    codes: {
      0: "Redirect Datagram for the Network (or subnet)",
      1: "Redirect Datagram for the Host",
      2: "Redirect Datagram for the Type of Service and Network",
      3: "Redirect Datagram for the Type of Service and Host",
    },
  },

  // Type 6 - Alternate Host Address (Deprecated)
  6: {
    name: "Alternate Host Address",
    codes: {
      0: "Alternate Address for Host",
    },
  },

  // Type 7 - Unassigned
  7: {
    name: "Unassigned",
    codes: {},
  },

  // Type 8 - Echo
  8: {
    name: "Echo",
    codes: {
      0: "No Code",
    },
  },

  // Type 9 - Router Advertisement
  9: {
    name: "Router Advertisement",
    codes: {
      0: "Normal router advertisement",
      16: "Does not route common traffic",
    },
  },

  // Type 10 - Router Solicitation
  10: {
    name: "Router Solicitation",
    codes: {
      0: "No Code",
    },
  },

  // Type 11 - Time Exceeded
  11: {
    name: "Time Exceeded",
    codes: {
      0: "Time to Live exceeded in Transit",
      1: "Fragment Reassembly Time Exceeded",
    },
  },

  // Type 12 - Parameter Problem
  12: {
    name: "Parameter Problem",
    codes: {
      0: "Pointer indicates the error",
      1: "Missing a Required Option",
      2: "Bad Length",
    },
  },

  // Type 13 - Timestamp
  13: {
    name: "Timestamp",
    codes: {
      0: "No Code",
    },
  },

  // Type 14 - Timestamp Reply
  14: {
    name: "Timestamp Reply",
    codes: {
      0: "No Code",
    },
  },

  // Type 15 - Information Request (Deprecated)
  15: {
    name: "Information Request",
    codes: {
      0: "No Code",
    },
  },

  // Type 16 - Information Reply (Deprecated)
  16: {
    name: "Information Reply",
    codes: {
      0: "No Code",
    },
  },

  // Type 17 - Address Mask Request (Deprecated)
  17: {
    name: "Address Mask Request",
    codes: {
      0: "No Code",
    },
  },

  // Type 18 - Address Mask Reply (Deprecated)
  18: {
    name: "Address Mask Reply",
    codes: {
      0: "No Code",
    },
  },

  // Type 19 - Reserved
  19: {
    name: "Reserved (for Security)",
    codes: {},
  },

  // Types 20-29 - Reserved
  ...Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => i + 20).map((i) => [
      i,
      {
        name: "Reserved",
        codes: {},
      },
    ]),
  ),

  // Type 30 - Traceroute (Deprecated)
  30: {
    name: "Traceroute",
    codes: {
      0: "No Code",
    },
  },

  // Type 31 - Datagram Conversion Error (Deprecated)
  31: {
    name: "Datagram Conversion Error",
    codes: {
      0: "No Code",
    },
  },

  // Type 32 - Mobile Host Redirect (Deprecated)
  32: {
    name: "Mobile Host Redirect",
    codes: {
      0: "No Code",
    },
  },

  // Type 33 - IPv6 Where-Are-You (Deprecated)
  33: {
    name: "IPv6 Where-Are-You",
    codes: {
      0: "No Code",
    },
  },

  // Type 34 - IPv6 I-Am-Here (Deprecated)
  34: {
    name: "IPv6 I-Am-Here",
    codes: {
      0: "No Code",
    },
  },

  // Type 35 - Mobile Registration Request (Deprecated)
  35: {
    name: "Mobile Registration Request",
    codes: {
      0: "No Code",
    },
  },

  // Type 36 - Mobile Registration Reply (Deprecated)
  36: {
    name: "Mobile Registration Reply",
    codes: {
      0: "No Code",
    },
  },

  // Type 37 - Domain Name Request (Deprecated)
  37: {
    name: "Domain Name Request",
    codes: {
      0: "No Code",
    },
  },

  // Type 38 - Domain Name Reply (Deprecated)
  38: {
    name: "Domain Name Reply",
    codes: {
      0: "No Code",
    },
  },

  // Type 39 - SKIP (Deprecated)
  39: {
    name: "SKIP",
    codes: {
      0: "No Code",
    },
  },

  // Type 40 - Photuris
  40: {
    name: "Photuris",
    codes: {
      0: "Reserved",
      1: "Unknown security index",
      2: "Valid security index, but invalid SPI",
      3: "Valid security index and SPI, but authentication failed",
      4: "Valid security index and SPI, but decryption failed",
    },
  },

  // Type 41 - ICMP messages utilized by experimental mobility protocols
  41: {
    name: "ICMP messages utilized by experimental mobility protocols",
    codes: {
      0: "No Code",
    },
  },

  // Types 42-252 - Unassigned
  ...Object.fromEntries(
    Array.from({ length: 211 }, (_, i) => i + 42).map((i) => [
      i,
      {
        name: "Unassigned",
        codes: {},
      },
    ]),
  ),

  // Type 253 - RFC3692-style Experiment 1
  253: {
    name: "RFC3692-style Experiment 1",
    codes: {
      0: "No Code",
    },
  },

  // Type 254 - RFC3692-style Experiment 2
  254: {
    name: "RFC3692-style Experiment 2",
    codes: {
      0: "No Code",
    },
  },

  // Type 255 - Reserved
  255: {
    name: "Reserved",
    codes: {},
  },
} as const;

export function getICMPTypeName(type: ICMPType): string {
  try {
    return ICMPTypes[type].name;
  } catch (e) {
    return "Unknown Type";
  }
}

export function getICMPCodeDescription(type: ICMPType, code: number): string {
  try {
    return (
      ICMPTypes[type].codes[
        code as keyof (typeof ICMPTypes)[typeof type]["codes"]
      ] || "Unknown Code"
    );
  } catch (e) {
    return "Unknown Code";
  }
}
