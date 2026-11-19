import FullTooltip from "@components/FullTooltip";
import * as React from "react";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Peer } from "@/interfaces/Peer";
import {PowerOffIcon} from "lucide-react";

type Props = {
    peer: Peer;
};
export const EphemeralPeerIndicator = ({ peer }: Props) => {
    const t = useTranslations();
    if (!peer.ephemeral) {
        return null;
    }

    const tooltipContent = t("peer.ephemeralTooltip");

    return (
        <FullTooltip content={<div className={"text-xs max-w-xs"}>{tooltipContent}</div>}>
            <PowerOffIcon size={12} className={"shrink-0 text-yellow-400"} />
        </FullTooltip>
    );
};
