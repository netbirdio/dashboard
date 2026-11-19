import Button from "@components/Button";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalTrigger,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import Paragraph from "@components/Paragraph";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import Separator from "@components/Separator";
import { validator } from "@utils/helpers";
import { ExternalLinkIcon, Power, ScanSearch } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useTranslations } from "@/i18n/LocaleProvider";
import { DNS_ZONE_DOCS_LINK, DNSZone } from "@/interfaces/DNS";
import { useDNSZones } from "@/modules/dns/zones/DNSZonesProvider";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import { Group } from "@/interfaces/Group";
import DNSZoneIcon from "@/assets/icons/DNSZoneIcon";

type Props = {
  children?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (zone: DNSZone) => void;
  onSuccessAdded?: (zone: DNSZone) => void;
  initialDistributionGroups?: Group[];
  zone?: DNSZone;
};

export default function DNSZoneModal({
  children,
  open,
  onOpenChange,
  onSuccess,
  onSuccessAdded,
  initialDistributionGroups,
  zone,
}: Readonly<Props>) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
      {children && <ModalTrigger asChild>{children}</ModalTrigger>}
      {open && (
        <DNSZoneModalContent
          onSuccess={(z) => {
            onOpenChange(false);
            onSuccess?.(z);
          }}
          onSuccessAdded={(z) => {
            onOpenChange(false);
            onSuccessAdded?.(z);
          }}
          zone={zone}
          initialDistributionGroups={initialDistributionGroups}
        />
      )}
    </Modal>
  );
}

type ModalProps = {
  onSuccess?: (zone: DNSZone) => void;
  onSuccessAdded?: (zone: DNSZone) => void;
  initialDistributionGroups?: Group[];
  zone?: DNSZone;
};

export function DNSZoneModalContent({
  onSuccess,
  onSuccessAdded,
  zone,
  initialDistributionGroups,
}: Readonly<ModalProps>) {
  const t = useTranslations();
  const { createZone, updateZone } = useDNSZones();
  const [domain, setDomain] = useState(zone?.domain ?? "");
  const [enabled, setEnabled] = useState<boolean>(zone?.enabled ?? true);
  const [searchDomainsEnabled, setSearchDomainsEnabled] = useState(
    zone?.enable_search_domain ?? false,
  );
  const [groups, setGroups, { save: saveGroups }] = useGroupHelper({
    initial: initialDistributionGroups ?? zone?.distribution_groups ?? [],
  });

  const domainError = useMemo(() => {
    if (domain == "") return "";
    const valid = validator.isValidDomain(domain, {
      allowWildcard: false,
      allowOnlyTld: true,
      preventLeadingAndTrailingDots: true,
    });
    if (!valid) {
      return t("dns.invalidZoneDomain");
    }
  }, [domain]);

  const handleOnSubmit = async () => {
    return saveGroups().then((distributionGroups) => {
      const groupIds = distributionGroups.map((group) => group.id as string);

      if (zone) {
        updateZone({
          id: zone.id,
          domain,
          name: domain,
          distribution_groups: groupIds,
          enabled,
          enable_search_domain: searchDomainsEnabled,
        } as DNSZone).then(onSuccess);
      } else {
        createZone({
          domain,
          name: domain,
          distribution_groups: groupIds,
          enabled,
          enable_search_domain: searchDomainsEnabled,
        } as DNSZone).then(onSuccessAdded);
      }
    });
  };

  const canUpdateOrCreate = !domainError && groups?.length > 0 && domain !== "";

  return (
    <ModalContent flow="dns_zone" maxWidthClass={"max-w-2xl"}>
      <ModalHeader
        icon={<DNSZoneIcon size={20} className={"fill-current"} />}
        title={zone ? t("dns.updateDNSZone") : t("dns.addDNSZone")}
        description={t("dns.updateZoneDescription")}
        color={"netbird"}
      />

      <Separator />

      <div className={"px-8 pt-6 pb-7 flex-col flex gap-6"}>
        <div>
          <Label>{t("common.domain")}</Label>
          <HelpText>
            {t("dns.domainHelp")}
          </HelpText>
          <Input
            disabled={!!zone}
            readOnly={!!zone}
            placeholder={t("dns.domainPlaceholder")}
            errorTooltip={false}
            errorTooltipPosition={"top"}
            error={domainError}
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            data-testid="dns-zone-domain-input"
          />
        </div>
        <div className={"mb-2"}>
          <Label>{t("dns.distributionGroups")}</Label>
          <HelpText>
            {t("dns.zoneGroupsHelp")}
          </HelpText>
          <PeerGroupSelector
            onChange={setGroups}
            values={groups}
            showResources={false}
            showResourceCounter={false}
            data-testid="dns-zone-groups-selector"
          />
        </div>

        <FancyToggleSwitch
          value={searchDomainsEnabled}
          onChange={setSearchDomainsEnabled}
          data-testid="dns-zone-search-domains"
          label={
            <>
              <ScanSearch size={15} />
              {t("dns.enableSearchDomains")}
            </>
          }
          helpText={t("dns.zoneSearchDomainExample")}
        />

        <FancyToggleSwitch
          value={enabled}
          onChange={setEnabled}
          data-testid="dns-zone-enabled"
          label={
            <>
              <Power size={15} />
              {t("dns.enableDNSZone")}
            </>
          }
          helpText={t("dns.enableZoneHelp")}
        />
      </div>

      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            {t.rich("dns.learnMoreAbout", {
              topic: t("dns.dnsZones"),
              link: (chunks) => (
                <InlineLink href={DNS_ZONE_DOCS_LINK} target={"_blank"}>
                  {chunks}
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              ),
            })}
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          <ModalClose asChild={true}>
            <Button variant={"secondary"}>{t("common.cancel")}</Button>
          </ModalClose>
          <Button
            variant={"primary"}
            onClick={handleOnSubmit}
            disabled={!canUpdateOrCreate}
            data-testid="submit-dns-zone"
          >
            {zone ? t("common.saveChanges") : t("dns.addZone")}
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
