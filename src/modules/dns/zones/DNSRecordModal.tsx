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
import {
	DNS_RECORDS_DOCS_LINK,
	DNSRecord,
	DNSRecordType,
	DNSZone,
} from "@/interfaces/DNS";
import { useDNSZones } from "@/modules/dns/zones/DNSZonesProvider";
import { useTranslations } from "next-intl";

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
			return tCommon("validDomainError");
		}
	}, [domain]);

	const ipv4Error = useMemo(() => {
		if (recordValue === "" || type !== "A") return "";
		const valid = Address4.isValid(recordValue);
		if (!valid) {
			return t("validIPv4Error");
		}
	}, [recordValue, type]);

	const ipv6Error = useMemo(() => {
		if (recordValue === "" || type !== "AAAA") return "";
		const valid = Address6.isValid(recordValue);
		if (!valid) {
			return t("validIPv6Error");
		}
	}, [recordValue, type]);

	const cnameError = useMemo(() => {
		if (recordValue === "" || type !== "CNAME") return "";
		const valid = validator.isValidDomain(recordValue, {
			allowWildcard: false,
			allowOnlyTld: false,
		});
		if (!valid) {
			return t("validCnameError");
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

	const t = useTranslations("dns");
	const tCommon = useTranslations("common");

	return (
		<ModalContent maxWidthClass={"max-w-xl"}>
			<ModalHeader
				title={record ? t("updateDNSRecord") : t("addDNSRecord")}
				description={
					record
						? t("updateRecordDesc", { zone: zone.domain })
						: t("addRecordDesc", { zone: zone.domain })
				}
				icon={<GlobeIcon size={16} />}
			/>
			<Separator />
			<div className={"px-8 py-6 flex flex-col gap-6"}>
				<div className={"flex items-center justify-between gap-10"}>
					<div>
						<Label>{t("recordType")}</Label>
						<HelpText className={"max-w-sm"}>{t("recordTypeHelp")}</HelpText>
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
								data-testid={"dns-record-type-select"}
							>
								<SelectValue placeholder={t("selectType")} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="A">A</SelectItem>
								<SelectItem value="AAAA">{t("recordTypeAAAA")}</SelectItem>
								<SelectItem value="CNAME">{t("recordTypeCNAME")}</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
				<div className={"w-full mb-3"}>
					<Label>{t("hostname")}</Label>
					<HelpText>{t("hostnameHelp")}</HelpText>
					<div className={"flex w-full"}>
						<Input
							autoFocus={true}
							placeholder={t("hostnamePlaceholder")}
							errorTooltip={true}
							errorTooltipPosition={"bottom"}
							error={domainError}
							value={domain}
							className={"rounded-r-none"}
							maxWidthClass={"w-full"}
							onChange={(e) => setDomain(e.target.value)}
							data-testid="dns-record-hostname-input"
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
							<Label>{t("ipv4Address")}</Label>
							<Input
								className={"mt-1.5 font-mono text-[0.82rem]"}
								placeholder={t("ipv4Placeholder")}
								errorTooltip={false}
								errorTooltipPosition={"top"}
								error={ipv4Error}
								value={recordValue}
								maxWidthClass={"w-full"}
								onChange={(e) => setRecordValue(e.target.value)}
								data-testid="dns-record-content-input"
							/>
						</div>
					)}

					{type === "AAAA" && (
						<div className={"flex-1"}>
							<Label>{t("ipv6Address")}</Label>
							<Input
								className={"mt-1.5 font-mono text-[0.82rem]"}
								placeholder={t("ipv6Placeholder")}
								errorTooltip={false}
								errorTooltipPosition={"top"}
								error={ipv6Error}
								value={recordValue}
								maxWidthClass={"w-full"}
								onChange={(e) => setRecordValue(e.target.value)}
								data-testid="dns-record-content-input"
							/>
						</div>
					)}

					{type === "CNAME" && (
						<div className={"flex-1"}>
							<Label>{t("targetDomain")}</Label>
							<Input
								className={"mt-1.5"}
								placeholder={t("cnamePlaceholder")}
								errorTooltip={false}
								errorTooltipPosition={"top"}
								error={cnameError}
								value={recordValue}
								maxWidthClass={"w-full"}
								onChange={(e) => setRecordValue(e.target.value)}
								data-testid="dns-record-content-input"
							/>
						</div>
					)}

					<div className={"min-w-[200px]"}>
						<Label>{t("ttl")}</Label>
						<div className={"mt-2.5"}>
							<Select value={ttl} onValueChange={(v) => setTtl(v)}>
								<SelectTrigger
									className="w-full"
									data-testid={"dns-record-ttl-select"}
								>
									<div className={"flex items-center gap-2"}>
										<ClockIcon size={14} className={"text-nb-gray-300"} />
										<SelectValue placeholder={t("selectTTL")} />
									</div>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="60">{getTTLLabel(60, t)}</SelectItem>
									<SelectItem value="120">{getTTLLabel(120, t)}</SelectItem>
									<SelectItem value="300">{getTTLLabel(300, t)}</SelectItem>
									<SelectItem value="600">{getTTLLabel(600, t)}</SelectItem>
									<SelectItem value="900">{getTTLLabel(900, t)}</SelectItem>
									<SelectItem value="1800">{getTTLLabel(1800, t)}</SelectItem>
									<SelectItem value="3600">{getTTLLabel(3600, t)}</SelectItem>
									<SelectItem value="7200">{getTTLLabel(7200, t)}</SelectItem>
									<SelectItem value="43200">{getTTLLabel(43200, t)}</SelectItem>
									<SelectItem value="86400">{getTTLLabel(86400, t)}</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>
			</div>

			<ModalFooter className={"items-center"}>
				<div className={"w-full"}>
					<Paragraph className={"text-sm mt-auto"}>
						{t("learnMoreAbout")}
						<InlineLink href={DNS_RECORDS_DOCS_LINK} target={"_blank"}>
							{t("dnsRecords")}
							<ExternalLinkIcon size={12} />
						</InlineLink>
					</Paragraph>
				</div>

				<div className={"flex gap-3 w-full justify-end"}>
					<>
						<ModalClose asChild={true}>
							<Button variant={"secondary"}>{tCommon("cancel")}</Button>
						</ModalClose>
						<Button
							variant={"primary"}
							onClick={handleAddRecord}
							disabled={!canUpdateOrCreate}
							data-testid="submit-dns-record"
						>
							{record ? t("saveChanges") : t("addDNSRecord")}
						</Button>
					</>
				</div>
			</ModalFooter>
		</ModalContent>
	);
}

export const getTTLLabel = (seconds: number, t?: (key: string, values?: any) => string): string => {
	const s = t ? t("sec") : "Sec.";
	const m = t ? t("min") : "Min.";
	const h = t ? t("hour") : "Hour";
	const hs = t ? t("hours") : "Hours";
	const d = t ? t("day") : "Day";
	const ds = t ? t("days") : "Days";
	if (seconds < 60) return `${seconds} ${s}`;
	if (seconds < 3600) {
		const minutes = seconds / 60;
		return `${minutes} ${m}`;
	}
	if (seconds < 86400) {
		const hours = seconds / 3600;
		return `${hours} ${hs}`;
	}
	const days = seconds / 86400;
	return `${days} ${ds}`;
};
