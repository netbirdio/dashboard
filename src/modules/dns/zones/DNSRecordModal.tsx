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

  const getInitialDomain = () => {
    if (!record) return "";
    if (record.name === zone.domain) return "";
    return record.name.replace(`.${zone.domain}`, "");
  };

  const [domain, setDomain] = useState(record?.name ? getInitialDomain() : "");
  const [ttl, setTtl] = useState(record ? record.ttl.toString() : "300");
  const [type, setType] = useState<DNSRecordType>(record?.type ?? "A");
  const [recordValue, setRecordValue] = useState(record?.content ?? "");

  const domainError = useMemo(() => {
    if (domain == "") return "";
    if (domain === "*") return "";
    const valid = validator.isValidDomain(domain, {
      allowWildcard: true,
      allowOnlyTld: true,
    });
    if (!valid) {
      return "Please enter a valid domain, e.g. example.com or intra.example.com";
    }
  }, [domain]);

  const ipv4Error = useMemo(() => {
    if (recordValue === "" || type !== "A") return "";
    const valid = Address4.isValid(recordValue);
    if (!valid) {
      return "Please enter a valid IPv4 address, e.g. 192.168.1.1";
    }
  }, [recordValue, type]);

  const ipv6Error = useMemo(() => {
    if (recordValue === "" || type !== "AAAA") return "";
    const valid = Address6.isValid(recordValue);
    if (!valid) {
      return "Please enter a valid IPv6 address, e.g. 2001:0db8:85a3::8a2e:0370:7334";
    }
  }, [recordValue, type]);

  const cnameError = useMemo(() => {
    if (recordValue === "" || type !== "CNAME") return "";
    const valid = validator.isValidDomain(recordValue, {
      allowWildcard: false,
      allowOnlyTld: false,
    });
    if (!valid) {
      return "Please enter a valid domain, e.g. example.com or server.example.com";
    }
  }, [recordValue, type]);

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
        title={record ? "Update DNS Record" : "Add DNS Record"}
        description={
          record
            ? `Update record of '${zone.domain}' zone`
            : `Add new record to the '${zone.domain}' zone`
        }
        icon={<GlobeIcon size={16} />}
      />
      <Separator />
      <div className={"px-8 py-6 flex flex-col gap-6"}>
        <div className={"flex items-center justify-between gap-10"}>
          <div>
            <Label>Record Type</Label>
            <HelpText className={"max-w-sm"}>
              Select the type of record you want to add
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
                <SelectValue placeholder="Select type..." />
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
          <Label>Hostname</Label>
          <HelpText>
            Enter a subdomain, wildcard or leave empty to use the primary
            domain.
          </HelpText>
          <div className={"flex w-full"}>
            <Input
              autoFocus={true}
              placeholder={"E.g., dev, * or leave empty for primary domain"}
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
              <Label>IPv4 Address</Label>
              <Input
                className={"mt-1.5 font-mono text-[0.82rem]"}
                placeholder={"192.168.1.1"}
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
              <Label>IPv6 Address</Label>
              <Input
                className={"mt-1.5 font-mono text-[0.82rem]"}
                placeholder={"2001:0db8:85a3::8a2e:0370:7334"}
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
              <Label>Target Domain</Label>
              <Input
                className={"mt-1.5"}
                placeholder={"e.g., example.com or intra.example.com"}
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
            <Label>TTL (Time to Live)</Label>
            <div className={"mt-2.5"}>
              <Select value={ttl} onValueChange={(v) => setTtl(v)}>
                <SelectTrigger
                  className="w-full"
                  data-cy={"dns-record-ttl-select"}
                >
                  <div className={"flex items-center gap-2"}>
                    <ClockIcon size={14} className={"text-nb-gray-300"} />
                    <SelectValue placeholder="Select TTL..." />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60">{getTTLLabel(60)}</SelectItem>
                  <SelectItem value="120">{getTTLLabel(120)}</SelectItem>
                  <SelectItem value="300">{getTTLLabel(300)}</SelectItem>
                  <SelectItem value="600">{getTTLLabel(600)}</SelectItem>
                  <SelectItem value="900">{getTTLLabel(900)}</SelectItem>
                  <SelectItem value="1800">{getTTLLabel(1800)}</SelectItem>
                  <SelectItem value="3600">{getTTLLabel(3600)}</SelectItem>
                  <SelectItem value="7200">{getTTLLabel(7200)}</SelectItem>
                  <SelectItem value="43200">{getTTLLabel(43200)}</SelectItem>
                  <SelectItem value="86400">{getTTLLabel(86400)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            Learn more about
            <InlineLink href={DNS_RECORDS_DOCS_LINK} target={"_blank"}>
              DNS Records
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>

        <div className={"flex gap-3 w-full justify-end"}>
          <>
            <ModalClose asChild={true}>
              <Button variant={"secondary"}>Cancel</Button>
            </ModalClose>
            <Button
              variant={"primary"}
              onClick={handleAddRecord}
              disabled={!canUpdateOrCreate}
            >
              {record ? "Save Changes" : "Add Record"}
            </Button>
          </>
        </div>
      </ModalFooter>
    </ModalContent>
  );
}

export const getTTLLabel = (seconds: number): string => {
  if (seconds < 60) return `${seconds} Sec.`;
  if (seconds < 3600) {
    const minutes = seconds / 60;
    return minutes === 1 ? "1 Min." : `${minutes} Min.`;
  }
  if (seconds < 86400) {
    const hours = seconds / 3600;
    return hours === 1 ? "1 Hour" : `${hours} Hours`;
  }
  const days = seconds / 86400;
  return days === 1 ? "1 Day" : `${days} Days`;
};
