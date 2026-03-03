import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { validator } from "@utils/helpers";
import cidr from "ip-cidr";
import { GlobeIcon, NetworkIcon, WorkflowIcon } from "lucide-react";
import * as React from "react";
import { useEffect, useMemo } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  onError?: (error: string) => void;
  description?: React.ReactNode;
  placeholder?: string;
  autoFocus?: boolean;
};
export const ResourceSingleAddressInput = ({
  value,
  onChange,
  label = "Address",
  className = "",
  onError,
  description = "Enter a single IP address, CIDR block or domain name",
  placeholder = "Address (IP, CIDR or Domain)",
  autoFocus,
}: Props) => {
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
      if (
        !validator.isValidDomain(value) ||
        !value.includes(".") ||
        value.endsWith(".")
      ) {
        return "Please enter a valid domain, e.g. service.internal, example.com or *.example.com";
      }
      return ""; // Valid domain
    }

    // Case 2: If it's not a valid domain, check if it's a valid CIDR
    if (!cidr.isValidAddress(value)) {
      return "Please enter a valid IP or CIDR, e.g., 10.0.0.21, 192.168.1.0/24";
    }

    return ""; // Valid CIDR
  }, [value, hasChars, isCIDRBlock]);

  useEffect(() => {
    onError?.(error);
  }, [error]);

  return (
    <div className={className}>
      <Label>{label}</Label>
      <HelpText>{description}</HelpText>
      <Input
        autoFocus={autoFocus}
        customPrefix={PrefixIcon}
        error={error}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};
