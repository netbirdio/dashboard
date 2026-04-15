"use client";

import Button from "@components/Button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import Separator from "@components/Separator";
import { validator } from "@utils/helpers";
import { Address4, Address6 } from "ip-address";
import { ClockIcon, ExternalLinkIcon, GlobeIcon } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import {
  DNS_RECORDS_DOCS_LINK,
  DNSRecord,
  DNSRecordType,
  DNSZone,
} from "@/interfaces/DNS";
import { useDNSZones } from "@/modules/dns/zones/DNSZonesProvider";

type Props = {
  children?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zone: DNSZone;
  record?: DNSRecord;
};

export default function DNSRecordModal({
  children,
  open,
  onOpenChange,
  zone,
  record,
}: Readonly<Props>) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
      {children && <ModalTrigger asChild>{children}</ModalTrigger>}
      {open && (
        <DNSRecordModalContent
          onSuccess={() => onOpenChange(false)}
          onSuccessAdded={() => {
            setTimeout(() => {
              const row = document.querySelector<HTMLElement>(
                `[data-row-id="${zone.id}"]`,
              );
              if (row?.getAttribute("data-accordion") === "closed") {
                row?.click();
              }
              row?.scrollIntoView({ behavior: "smooth" });
            }, 200);
            onOpenChange(false);
          }}
          zone={zone}
          record={record}
        />
      )}
    </Modal>
  );
}

type ModalProps = {
  onSuccess?: () => void;
  onSuccessAdded?: () => void;
  zone: DNSZone;
  record?: DNSRecord;
};

export function DNSRecordModalContent({
  onSuccess,
  onSuccessAdded,
  zone,
  record,
}: Readonly<ModalProps>) {
  const { addRecord, updateRecord } = useDNSZones();
  const { t } = useI18n();

  const getInitialDomain = () => {
    if (!record) return "";
    if (record.name === zone.domain) return "";
    return record.name.replace(`.${zone.domain}`, "");
  };

  const [domain, setDomain] = useState(record?.name ? getInitialDomain() : "");
  const [ttl, setTtl] = useState(record ? record.ttl.toString() : "300");
  const [type, setType] = useState<DNSRecordType>(record?.type ?? "A");
  const [recordValue, setRecordValue] = useState(record?.content ?? "");
  const getTTLText = (seconds: number) => {
    if (seconds < 60) return t("zones.time.sec", { count: seconds });
    if (seconds < 3600) {
      const minutes = seconds / 60;
      return minutes === 1
        ? t("zones.time.min.one")
        : t("zones.time.min.other", { count: minutes });
    }
    if (seconds < 86400) {
      const hours = seconds / 3600;
      return hours === 1
        ? t("zones.time.hour.one")
        : t("zones.time.hour.other", { count: hours });
    }
    const days = seconds / 86400;
    return days === 1
      ? t("zones.time.day.one")
      : t("zones.time.day.other", { count: days });
  };

  const domainError = useMemo(() => {
    if (domain == "") return "";
    if (domain === "*") return "";
    const valid = validator.isValidDomain(domain, {
      allowWildcard: true,
      allowOnlyTld: true,
    });
    if (!valid) {
      return t("zones.recordDomainError");
    }
  }, [domain, t]);

  const ipv4Error = useMemo(() => {
    if (recordValue === "" || type !== "A") return "";
    const valid = Address4.isValid(recordValue);
    if (!valid) {
      return t("zones.ipv4Error");
    }
  }, [recordValue, type, t]);

  const ipv6Error = useMemo(() => {
    if (recordValue === "" || type !== "AAAA") return "";
    const valid = Address6.isValid(recordValue);
    if (!valid) {
      return t("zones.ipv6Error");
    }
  }, [recordValue, type, t]);

  const cnameError = useMemo(() => {
    if (recordValue === "" || type !== "CNAME") return "";
    const valid = validator.isValidDomain(recordValue, {
      allowWildcard: false,
      allowOnlyTld: false,
    });
    if (!valid) {
      return t("zones.cnameError");
    }
  }, [recordValue, type, t]);

  const handleAddRecord = async () => {
    const name = domain !== "" ? `${domain}.${zone.domain}` : zone.domain;

    if (record) {
      updateRecord(zone, {
        id: record.id,
        name,
        type,
        content: recordValue,
        ttl: parseInt(ttl),
      }).then(onSuccess);
    } else {
      addRecord(zone, {
        name,
        type,
        content: recordValue,
        ttl: parseInt(ttl),
      }).then(onSuccessAdded);
    }
  };

  const canUpdateOrCreate =
    !cnameError &&
    !ipv6Error &&
    !ipv4Error &&
    !domainError &&
    recordValue !== "";

  return (
    <ModalContent maxWidthClass={"max-w-xl"}>
      <ModalHeader
        title={
          record
            ? t("zones.recordModalUpdateTitle")
            : t("zones.recordModalAddTitle")
        }
        description={
          record
            ? t("zones.recordModalUpdateDescription", { zone: zone.domain })
            : t("zones.recordModalAddDescription", { zone: zone.domain })
        }
        icon={<GlobeIcon size={16} />}
      />
      <Separator />
      <div className={"px-8 py-6 flex flex-col gap-6"}>
        <div className={"flex items-center justify-between gap-10"}>
          <div>
            <Label>{t("zones.recordType")}</Label>
            <HelpText className={"max-w-sm"}>
              {t("zones.recordTypeHelp")}
            </HelpText>
          </div>
          <div className={"min-w-[130px]"}>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as DNSRecordType);
                setRecordValue("");
              }}
            >
              <SelectTrigger
                className="w-full pl-4"
                data-cy={"dns-record-type-select"}
              >
                <SelectValue placeholder={t("zones.selectType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="AAAA">AAAA</SelectItem>
                <SelectItem value="CNAME">CNAME</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className={"w-full mb-3"}>
          <Label>{t("zones.hostname")}</Label>
          <HelpText>{t("zones.hostnameHelp")}</HelpText>
          <div className={"flex w-full"}>
            <Input
              autoFocus={true}
              placeholder={t("zones.hostnamePlaceholder")}
              errorTooltip={true}
              errorTooltipPosition={"bottom"}
              error={domainError}
              value={domain}
              className={"rounded-r-none"}
              maxWidthClass={"w-full"}
              onChange={(e) => setDomain(e.target.value)}
            />
            <div
              className={
                "bg-nb-gray-900 rounded-r-md border text-nb-gray-300 border-l-0 text-sm border-nb-gray-700 flex items-center justify-center whitespace-nowrap px-4 opacity-80"
              }
            >
              .{zone.domain}
            </div>
          </div>
        </div>

        <div className={"flex gap-4 items-start mb-3"}>
          {type === "A" && (
            <div className={"flex-1"}>
              <Label>{t("zones.ipv4Address")}</Label>
              <Input
                className={"mt-1.5 font-mono text-[0.82rem]"}
                placeholder={t("zones.ipv4Placeholder")}
                errorTooltip={false}
                errorTooltipPosition={"top"}
                error={ipv4Error}
                value={recordValue}
                maxWidthClass={"w-full"}
                onChange={(e) => setRecordValue(e.target.value)}
              />
            </div>
          )}

          {type === "AAAA" && (
            <div className={"flex-1"}>
              <Label>{t("zones.ipv6Address")}</Label>
              <Input
                className={"mt-1.5 font-mono text-[0.82rem]"}
                placeholder={t("zones.ipv6Placeholder")}
                errorTooltip={false}
                errorTooltipPosition={"top"}
                error={ipv6Error}
                value={recordValue}
                maxWidthClass={"w-full"}
                onChange={(e) => setRecordValue(e.target.value)}
              />
            </div>
          )}

          {type === "CNAME" && (
            <div className={"flex-1"}>
              <Label>{t("zones.targetDomain")}</Label>
              <Input
                className={"mt-1.5"}
                placeholder={t("zones.targetDomainPlaceholder")}
                errorTooltip={false}
                errorTooltipPosition={"top"}
                error={cnameError}
                value={recordValue}
                maxWidthClass={"w-full"}
                onChange={(e) => setRecordValue(e.target.value)}
              />
            </div>
          )}

          <div className={"min-w-[200px]"}>
            <Label>{t("zones.ttl")}</Label>
            <div className={"mt-2.5"}>
              <Select value={ttl} onValueChange={(v) => setTtl(v)}>
                <SelectTrigger
                  className="w-full"
                  data-cy={"dns-record-ttl-select"}
                >
                  <div className={"flex items-center gap-2"}>
                    <ClockIcon size={14} className={"text-nb-gray-300"} />
                    <SelectValue placeholder={t("zones.selectTtl")} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60">{getTTLText(60)}</SelectItem>
                  <SelectItem value="120">{getTTLText(120)}</SelectItem>
                  <SelectItem value="300">{getTTLText(300)}</SelectItem>
                  <SelectItem value="600">{getTTLText(600)}</SelectItem>
                  <SelectItem value="900">{getTTLText(900)}</SelectItem>
                  <SelectItem value="1800">{getTTLText(1800)}</SelectItem>
                  <SelectItem value="3600">{getTTLText(3600)}</SelectItem>
                  <SelectItem value="7200">{getTTLText(7200)}</SelectItem>
                  <SelectItem value="43200">{getTTLText(43200)}</SelectItem>
                  <SelectItem value="86400">{getTTLText(86400)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            {t("common.learnMorePrefix")}
            <InlineLink href={DNS_RECORDS_DOCS_LINK} target={"_blank"}>
              {t("zones.recordsLearnMore")}
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>

        <div className={"flex gap-3 w-full justify-end"}>
          <>
            <ModalClose asChild={true}>
              <Button variant={"secondary"}>{t("actions.cancel")}</Button>
            </ModalClose>
            <Button
              variant={"primary"}
              onClick={handleAddRecord}
              disabled={!canUpdateOrCreate}
            >
              {record ? t("actions.saveChanges") : t("zones.addRecord")}
            </Button>
          </>
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
