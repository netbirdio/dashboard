import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { validator } from "@utils/helpers";
import cidr from "ip-cidr";
import { GlobeIcon, NetworkIcon, WorkflowIcon } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
};
export const ResourceSingleAddressInput = ({ value, onChange }: Props) => {
  const hasChars = useMemo(() => {
    return !!value.match(/[a-z*]/i);
  }, [value]);

  const isCIDRBlock = useMemo(() => {
    return !!value.match(/\//);
  }, [value]);

  const PrefixIcon = useMemo(() => {
    if (hasChars) return <GlobeIcon size={14} />;
    if (isCIDRBlock) return <NetworkIcon size={14} />;
    return <WorkflowIcon size={14} />;
  }, [isCIDRBlock, hasChars]);

  const error = useMemo(() => {
    if (value === "") return "";

    // Case 1: If it has characters (potential domain) but is not a CIDR block
    if (hasChars && !isCIDRBlock) {
      if (!validator.isValidDomain(value)) {
        return "Please enter a valid domain, e.g. intra.example.com or *.example.com";
      }
      return ""; // Valid domain
    }

    // Case 2: If it's not a valid domain, check if it's a valid CIDR
    if (!cidr.isValidAddress(value)) {
      return "Please enter a valid IP or CIDR, e.g., 192.168.1.0/24";
    }

    return ""; // Valid CIDR
  }, [value, hasChars, isCIDRBlock]);

  return (
    <>
      <div>
        <Label>Address</Label>
        <HelpText>
          Enter a single IP address, CIDR block or domain name
        </HelpText>
        <Input
          customPrefix={PrefixIcon}
          error={error}
          placeholder={"Address (IP, CIDR or Domain)"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </>
  );
};
