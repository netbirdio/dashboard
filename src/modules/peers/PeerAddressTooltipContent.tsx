import CopyToClipboardText from "@components/CopyToClipboardText";
import { ListItem } from "@components/ListItem";
import { FlagIcon, GlobeIcon, MapPin, NetworkIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useMemo } from "react";
import Skeleton from "react-loading-skeleton";
import { useCountries } from "@/contexts/CountryProvider";
import { Peer } from "@/interfaces/Peer";

type Props = {
	peer: Peer;
};
export const PeerAddressTooltipContent = ({ peer }: Props) => {
	const t = useTranslations("peers");
	const { isLoading, getRegionByPeer } = useCountries();

	const countryText = useMemo(() => {
		return getRegionByPeer(peer);
	}, [getRegionByPeer, peer]);

	return (
		<div
			className={"text-xs flex flex-col"}
			onClick={(e) => {
				e.stopPropagation();
				e.preventDefault();
			}}
		>
			<ListItem
				icon={<MapPin size={14} />}
				label={t("netbirdIp")}
				value={
					<CopyToClipboardText
						iconAlignment={"right"}
						message={t("netbirdIpCopied")}
						alwaysShowIcon={true}
					>
						{peer.ip}
					</CopyToClipboardText>
				}
			/>
			{peer.ipv6 && (
				<ListItem
					icon={<MapPin size={14} />}
					label={t("netbirdIpv6")}
					value={
						<CopyToClipboardText
							iconAlignment={"right"}
							message={t("netbirdIpv6Copied")}
							alwaysShowIcon={true}
						>
							{peer.ipv6}
						</CopyToClipboardText>
					}
				/>
			)}
			<ListItem
				icon={<NetworkIcon size={14} />}
				label={t("publicIp")}
				value={
					<CopyToClipboardText
						iconAlignment={"right"}
						message={t("publicIpCopied")}
						alwaysShowIcon={true}
					>
						{peer.connection_ip}
					</CopyToClipboardText>
				}
			/>
			<ListItem
				icon={<GlobeIcon size={14} />}
				label={t("domain")}
				className={
					peer?.extra_dns_labels && peer.extra_dns_labels.length > 0
						? "items-start"
						: ""
				}
				value={
					<div className={"text-right flex flex-col gap-[6px]"}>
						<CopyToClipboardText
							iconAlignment={"right"}
							message={t("dnsLabelCopied")}
							className={"text-right justify-end"}
							alwaysShowIcon={true}
						>
							{peer.dns_label}
						</CopyToClipboardText>

						{peer?.extra_dns_labels?.map((label) => (
							<CopyToClipboardText
								key={label}
								className={"text-right justify-end"}
								iconAlignment={"right"}
								message={t("dnsLabelCopied")}
								alwaysShowIcon={true}
							>
								{label}
							</CopyToClipboardText>
						))}
					</div>
				}
			/>
			<ListItem
				icon={<FlagIcon size={14} />}
				label={t("region")}
				value={
					isLoading && !countryText ? (
						<Skeleton width={100} />
					) : (
						<CopyToClipboardText
							iconAlignment={"right"}
							message={t("regionCopied")}
							alwaysShowIcon={true}
						>
							{countryText}
						</CopyToClipboardText>
					)
				}
			/>
		</div>
	);
};
