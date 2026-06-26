import FullTooltip from "@components/FullTooltip";
import { IconArrowRight } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import { HelpCircle } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import PeerIcon from "@/assets/icons/PeerIcon";
import { Intent } from "@/modules/onboarding/Onboarding";

type Props = {
	onSelect: (intent: Intent) => void;
	useCases?: string;
	isBusiness?: boolean;
};

export const OnboardingIntent = ({ onSelect, useCases, isBusiness }: Props) => {
	const t = useTranslations("onboarding");
	/**
	 * Recommend Networks if users ticks any of these use cases
	 */
	const isNetworksRecommended = useMemo(() => {
		if (!useCases) return false;
		const intents = [
			"Zero Trust Security",
			"Employee Remote Access",
			"Business VPN",
			"Site-to-Site Connectivity",
			"IoT (Internet of Things)",
			"MSP (Managed Service Provider)",
		];
		for (const intent of intents) {
			if (useCases.toLowerCase().includes(intent.toLowerCase())) {
				return true;
			}
		}
		return false;
	}, [useCases]);

	/**
	 * Recommend P2P if users ticks any of these use cases
	 */
	const isP2PRecommended = useMemo(() => {
		if (!useCases) return false;
		const intents = [
			"Homelab Automation",
			"Home Remote Access",
			"File Access",
			"Gaming",
		];
		for (const intent of intents) {
			if (useCases.toLowerCase().includes(intent.toLowerCase())) {
				return true;
			}
		}
		return false;
	}, [useCases]);

	return (
		<div className={"relative flex flex-col h-full justify-between"}>
			<div>
				<h1 className={"text-xl text-center"}>{t("title")}</h1>
				<div
					className={
						"text-sm text-nb-gray-300 font-light mt-2 block text-center sm:px-4"
					}
				>
					{t("description")}
				</div>
				<div
					className={cn(
						"grid grid-cols-1 mt-8",
						"border border-nb-gray-900 rounded-lg flex items-start flex-col relative bg-nb-gray-930/60 transition-all ",
					)}
				>
					<IntentCard
						title={t("p2pTitle")}
						description={
							isBusiness
								? t("p2pDescription_business")
								: t("p2pDescription_personal")
						}
						recommended={isP2PRecommended}
						icon={<PeerIcon size={18} className={"fill-netbird"} />}
						onClick={() => onSelect(Intent.P2P)}
					/>
					<IntentCard
						title={t("remoteAccessTitle")}
						description={
							isBusiness
								? t("remoteAccessDescription_business")
								: t("remoteAccessDescription_personal")
						}
						recommended={isNetworksRecommended}
						icon={<NetworkRoutesIcon size={18} className={"fill-netbird"} />}
						onClick={() => onSelect(Intent.NETWORKS)}
					/>
				</div>
			</div>
		</div>
	);
};

type IntentCardProps = {
	title: string;
	description: string;
	icon: React.ReactNode;
	onClick: () => void;
	recommended?: boolean;
};

const IntentCard = ({
	title,
	description,
	icon,
	onClick,
	recommended,
}: IntentCardProps) => {
	const t = useTranslations("onboarding");
	return (
		<button
			className={
				"px-6 py-6 flex items-start flex-col relative hover:bg-nb-gray-920 transition-all group first:border-b border-nb-gray-900"
			}
			onClick={onClick}
		>
			<div className={"flex gap-6"}>
				<div
					className={cn(
						"h-10 w-10 flex items-center justify-center rounded-md shrink-0 mt-2",
						"bg-nb-gray-900 border border-nb-gray-800 ",
					)}
				>
					{icon}
				</div>
				<div className={"flex gap-4 items-center"}>
					<div className={"text-left"}>
						<h2
							className={
								"text-base font-medium mb-.5 group-hover:text-netbird transition-all inline-flex gap-x-2 gap-y-1 flex-wrap"
							}
						>
							{title}
								{recommended && (
									<FullTooltip
										content={
											<div className={"text-xs max-w-xs"}>
												{t("recommendedTooltip", { title })}
											</div>
										}
									>
										<span
											className={cn(
												"relative",
												"inline-flex text-[0.7rem] font-light bg-netbird/10 border border-netbird-400/30 text-netbird-400 rounded-full px-2 py-1 pb-0.5 leading-none",
												"hover:bg-netbird/20 cursor-help transition-all self-center",
											)}
										>
											{t("recommended")}
											<HelpCircle size={10} className={"ml-1"} />
										</span>
									</FullTooltip>
								)}
						</h2>
						<p className={"!text-nb-gray-300 text-[.85rem]"}>{description}</p>
					</div>
					<div
						className={"h-full items-center text-nb-gray-400 hidden sm:flex"}
					>
						<IconArrowRight
							size={24}
							className={"shrink-0 group-hover:text-netbird"}
						/>
					</div>
				</div>
			</div>
		</button>
	);
};
