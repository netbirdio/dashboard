import FullTooltip from "@components/FullTooltip";
import * as React from "react";
import { Peer } from "@/interfaces/Peer";
import {PowerOffIcon} from "lucide-react";

type Props = {
    peer: Peer;
};
export const EphemeralPeerIndicator = ({ peer }: Props) => {
    if (!peer.ephemeral) {
        return null;
    }

    const tooltipContent = "This peer is an ephemeral peer. If it is disconnected for more than 10 minutes it will be removed.";

    return (
        <FullTooltip content={<div className={"text-xs max-w-xs"}>{tooltipContent}</div>}>
            <PowerOffIcon size={12} className={"shrink-0 text-yellow-400"} />
        </FullTooltip>
    );
};
