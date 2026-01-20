import FullTooltip from "@components/FullTooltip";
import {IconArrowRight} from "@tabler/icons-react";
import {cn} from "@utils/helpers";
import {HelpCircle} from "lucide-react";
import * as React from "react";
import {useMemo} from "react";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import PeerIcon from "@/assets/icons/PeerIcon";
import {Intent} from "@/modules/onboarding/Onboarding";

type Props =   {
    onSelect: (intent: Intent) => void,
    useCases?: string,
    isBusiness?: boolean
};

export const OnboardingIntent = ({onSelect, useCases, isBusiness}: Props) => {
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
                <h1 className={"text-xl text-center"}>Get started with NetBird</h1>
                <div
                    className={
                        "text-sm text-nb-gray-300 font-light mt-2 block text-center sm:px-4"
                    }
                >
                    NetBird provides the flexibility of both a peer-to-peer overlay network and a remote network access
                    solution.
                    Choose what fits your needs, you can always combine both.
                </div>
                <div
                    className={cn(
                        "grid grid-cols-1 mt-8",
                        "border border-nb-gray-900 rounded-lg flex items-start flex-col relative bg-nb-gray-930/60 transition-all ",
                    )}
                >
                    <IntentCard
                        title={"Peer-to-Peer Network"}
                        description={
                        isBusiness ? "Install NetBird on two or more devices to create secure, direct WireGuard connections, like laptop to server or server to database. Add at least two machines to get started." :"Install NetBird on two or more devices in your homelab, such as your laptop, NAS, or Raspberry Pi, to create secure, direct WireGuard connections."
                        }
                        recommended={isP2PRecommended}
                        icon={<PeerIcon size={18} className={"fill-netbird"}/>}
                        onClick={() => onSelect(Intent.P2P)}
                    />
                    <IntentCard
                        title={"Remote Network Access"}
                        description={
                        isBusiness ? "Enable employee remote access to VMs, Kubernetes clusters, and cloud or on-prem resources without installing NetBird on every machine." : "Securely access your homelab remotely from anywhere without installing NetBird on every device."
                        }
                        recommended={isNetworksRecommended}
                        icon={<NetworkRoutesIcon size={18} className={"fill-netbird"}/>}
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
                                            Based on your previous choices, we recommend starting with{" "}
                                            {title}. You can always combine both options later.
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
                    Recommended
                    <HelpCircle size={10} className={"ml-1"}/>
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
