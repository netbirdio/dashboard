import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import { SmallBadge } from "@components/ui/SmallBadge";
import { ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useMemo } from "react";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { ReverseProxyDomainType } from "@/interfaces/ReverseProxy";
import { isNetBirdHosted } from "@utils/netbird";

interface DomainSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function CustomDomainSelector({
  value,
  onChange,
  disabled = false,
  className,
}: DomainSelectorProps) {
  const router = useRouter();
  const { domains } = useReverseProxies();
  const { t } = useI18n();

  const options: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [];

    // Add free domains (connected proxy clusters, e.g., .eu.proxy.netbird.io)
    domains
      ?.filter((d) => d.type === ReverseProxyDomainType.FREE)
      .forEach((domain) => {
        opts.push({
          value: domain.domain,
          label: `.${domain.domain}`,
          renderItem: () => (
            <div className="flex items-center gap-2 w-full text-sm justify-between">
              <div className="flex items-center gap-2">
                <span>.{domain.domain}</span>
              </div>
              {isNetBirdHosted() ? (
                <SmallBadge text={t("reverseProxy.freeBadge")} variant="green" size="md" />
              ) : (
                <SmallBadge text={t("reverseProxy.clusterBadge")} variant="green" size="md" />
              )}
            </div>
          ),
        });
      });

    // Add validated custom domains
    domains
      ?.filter((d) => d.validated && d.type === ReverseProxyDomainType.CUSTOM)
      .forEach((domain) => {
        opts.push({
          value: domain.domain,
          label: `.${domain.domain}`,
          renderItem: () => (
            <div className="flex items-center gap-2 w-full text-sm justify-between">
              <span>.{domain.domain}</span>
              <SmallBadge text={t("reverseProxy.customBadge")} variant="sky" size="md" />
            </div>
          ),
        });
      });

    // Add "Add Custom Domain" option
    opts.push({
      value: "add_custom",
      label: t("reverseProxy.customDomainSelectorAdd"),
      renderItem: () => (
        <div className="flex items-center justify-between gap-2 text-netbird text-sm w-full">
          <div className={"flex items-center gap-2"}>
            <span>{t("reverseProxy.customDomainSelectorAdd")}</span>
          </div>
          <ArrowUpRight size={16} />
        </div>
      ),
    });

    return opts;
  }, [domains, t]);

  const handleChange = (selectedValue: string) => {
    if (selectedValue === "add_custom") {
      router.push("/reverse-proxy/custom-domains");
      return;
    }
    onChange(selectedValue);
  };

  return (
    <SelectDropdown
      value={value}
      onChange={handleChange}
      options={options}
      popoverWidth={335}
      showSearch={true}
      searchPlaceholder={t("reverseProxy.searchDomains")}
      disabled={disabled}
      placeholder={t("reverseProxy.selectDomain")}
      className={className}
    />
  );
}
