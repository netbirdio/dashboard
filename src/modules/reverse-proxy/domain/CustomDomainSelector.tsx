import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import { SmallBadge } from "@components/ui/SmallBadge";
import TruncatedText from "@components/ui/TruncatedText";
import { isNetBirdCloud } from "@utils/netbird";
import { ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useMemo } from "react";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { ReverseProxyDomainType } from "@/interfaces/ReverseProxy";

interface DomainSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
}

export function CustomDomainSelector({
  value,
  onChange,
  disabled = false,
  className,
  "data-testid": dataTestId,
}: DomainSelectorProps) {
  const t = useTranslations();
  const router = useRouter();
  const { domains, isSelfHostedCluster } = useReverseProxies();

  const options: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [];

    // Add free domains (connected proxy clusters, e.g., .eu.proxy.netbird.io)
    domains
      ?.filter((d) => d.type === ReverseProxyDomainType.FREE)
      .forEach((domain) => {
        const isAccountCluster = isSelfHostedCluster(
          domain?.target_cluster ?? domain?.domain,
        );
        opts.push({
          value: domain.domain,
          label: `.${domain.domain}`,
          renderItem: () => (
            <div className="flex items-center gap-2 w-full text-sm justify-between">
              <div className="flex items-center gap-2">
                <TruncatedText text={`.${domain.domain}`} maxWidth={"260px"} />
              </div>
              {isAccountCluster ? (
                <SmallBadge
                  text={t("common.account")}
                  variant="sky"
                  size="md"
                />
              ) : isNetBirdCloud() ? (
                <SmallBadge
                  text={t("reverseProxy.free")}
                  variant="green"
                  size="md"
                />
              ) : (
                <SmallBadge
                  text={t("reverseProxy.shared")}
                  variant="green"
                  size="md"
                />
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
              <SmallBadge
                text={t("reverseProxy.custom")}
                variant="sky"
                size="md"
              />
            </div>
          ),
        });
      });

    // Add "Add Custom Domain" option
    opts.push({
      value: "add_custom",
      label: t("reverseProxy.addCustomDomain"),
      renderItem: () => (
        <div className="flex items-center justify-between gap-2 text-netbird text-sm w-full">
          <div className={"flex items-center gap-2"}>
            <span>{t("reverseProxy.addCustomDomain")}</span>
          </div>
          <ArrowUpRight size={16} />
        </div>
      ),
    });

    return opts;
  }, [domains, isSelfHostedCluster, t]);

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
      popoverWidth={380}
      showSearch={true}
      searchPlaceholder={t("reverseProxy.searchDomains")}
      disabled={disabled}
      placeholder={t("reverseProxy.selectDomain")}
      className={className}
      data-testid={dataTestId}
    />
  );
}
