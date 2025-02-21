import FancyToggleSwitch from "@components/FancyToggleSwitch";
import FullTooltip from "@components/FullTooltip";
import { VenetianMask } from "lucide-react";
import * as React from "react";

type Props = {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};
export const RoutingPeerMasqueradeSwitch = ({
  disabled = false,
  value,
  onChange,
}: Props) => {
  return (
    <RoutingPeerMasqueradeTooltip show={disabled}>
      <FancyToggleSwitch
        value={value}
        onChange={onChange}
        disabled={disabled}
        label={
          <>
            <VenetianMask size={15} />
            Masquerade
          </>
        }
        helpText={
          "Allow access to your private networks without configuring routes on your local routers or other devices."
        }
      />
    </RoutingPeerMasqueradeTooltip>
  );
};

type RoutingPeerMasqueradeTooltipProps = {
  show?: boolean;
  children: React.ReactNode;
};

export const RoutingPeerMasqueradeTooltip = ({
  show = false,
  children,
}: RoutingPeerMasqueradeTooltipProps) => {
  return (
    <FullTooltip
      content={
        <div className={"text-xs"}>
          Masquerade needs to be enabled for non-Linux routing peers.
        </div>
      }
      delayDuration={250}
      skipDelayDuration={350}
      disabled={!show}
      className={"cursor-help"}
    >
      {children}
    </FullTooltip>
  );
};
