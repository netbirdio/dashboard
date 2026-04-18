import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { validator } from "@utils/helpers";
import cidr from "ip-cidr";
import { GlobeIcon, NetworkIcon, WorkflowIcon } from "lucide-react";
import * as React from "react";
import { useEffect, useMemo } from "react";
import { useI18n } from "@/i18n/I18nProvider";

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
  const { t } = useI18n();
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
        return t("networkResources.addressDomainError");
      }
      return ""; // Valid domain
    }

    // Case 2: If it's not a valid domain, check if it's a valid CIDR
    if (!cidr.isValidAddress(value)) {
      return t("networkResources.addressIpOrCidrError");
    }

    return ""; // Valid CIDR
  }, [value, hasChars, isCIDRBlock, t]);

  useEffect(() => {
    onError?.(error);
  }, [error]);

  return (
    <div className={className}>
      <Label>{label ?? t("networkResources.addressLabel")}</Label>
      <HelpText>{description ?? t("networkResources.addressHelp")}</HelpText>
      <Input
        autoFocus={autoFocus}
        customPrefix={PrefixIcon}
        error={error}
        placeholder={placeholder ?? t("networkResources.addressPlaceholder")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};
