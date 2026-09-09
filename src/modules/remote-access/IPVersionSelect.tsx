import { SelectDropdown } from "@components/select/SelectDropdown";
import * as React from "react";

// IPVersion is the IP version used to reach a peer. Only these two values are
// meaningful, so the select and everything it feeds are typed on them rather
// than on a bare string.
export type IPVersion = "4" | "6";

type Props = {
  value: IPVersion;
  onChange: (value: IPVersion) => void;
  // hasIPv6 enables the IPv6 option; peers without an IPv6 address
  // cannot be reached over IPv6.
  hasIPv6: boolean;
};

// IPVersionSelect picks the IP version used to connect to the peer.
export function IPVersionSelect({ value, onChange, hasIPv6 }: Props) {
  return (
    <SelectDropdown
      value={value}
      // SelectDropdown is typed on plain strings; the options below are the
      // only two it can emit, and anything else narrows to "4".
      onChange={(v) => onChange(v === "6" ? "6" : "4")}
      options={[
        { value: "4", label: "IPv4" },
        { value: "6", label: "IPv6", disabled: !hasIPv6 },
      ]}
    />
  );
}
