import { SelectDropdown } from "@components/select/SelectDropdown";
import * as React from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  // hasIPv6 enables the IPv6 option; peers without an IPv6 address
  // cannot be reached over IPv6.
  hasIPv6: boolean;
};

// IPVersionSelect picks the IP version used to connect to the peer.
export function IPVersionSelect({ value, onChange, hasIPv6 }: Props) {
  return (
    <SelectDropdown
      value={value}
      onChange={onChange}
      options={[
        { value: "4", label: "IPv4" },
        { value: "6", label: "IPv6", disabled: !hasIPv6 },
      ]}
    />
  );
}
