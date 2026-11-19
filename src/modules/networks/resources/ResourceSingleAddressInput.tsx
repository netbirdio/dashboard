import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { validator } from "@utils/helpers";
import { isValidIP } from "@utils/ip";
import { GlobeIcon, NetworkIcon, WorkflowIcon } from "lucide-react";
import * as React from "react";
import { useEffect, useMemo } from "react";
import { useTranslations } from "@/i18n/LocaleProvider";

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
  label,
  className = "",
  onError,
  description,
  placeholder,
  autoFocus,
}: Props) => {
  const t = useTranslations();
  const resolvedLabel = label ?? t("common.address");
  const resolvedDescription =
    description ?? t("networks.singleAddressFallback");
  const resolvedPlaceholder =
    placeholder ?? t("networks.singleAddressPlaceholder");
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
      if (!validator.isValidDomain(value) || value.endsWith(".")) {
        return t("networks.invalidDomain");
      }
      return ""; // Valid domain
    }

    // Case 2: If it's not a valid domain, check if it's a valid CIDR
    if (!isValidIP(value)) {
      return t("networks.invalidIpOrCidr");
    }

    return ""; // Valid CIDR
  }, [value, hasChars, isCIDRBlock, t]);

  useEffect(() => {
    onError?.(error);
  }, [error]);

  return (
    <div className={className}>
      <Label>{resolvedLabel}</Label>
      <HelpText>{resolvedDescription}</HelpText>
      <Input
        autoFocus={autoFocus}
        data-testid="resource-address-input"
        customPrefix={PrefixIcon}
        error={error}
        placeholder={resolvedPlaceholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};
