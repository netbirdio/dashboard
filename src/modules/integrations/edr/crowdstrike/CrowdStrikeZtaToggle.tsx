import FancyToggleSwitch from "@components/FancyToggleSwitch";
import InlineLink from "@components/InlineLink";
import { ExternalLinkIcon, GaugeIcon } from "lucide-react";
import * as React from "react";

type Props = {
  value: boolean;
  onChange: (value: boolean) => void;
};
export const CrowdStrikeZtaToggle = ({ value, onChange }: Props) => {
  return (
    <FancyToggleSwitch
      value={value}
      onChange={onChange}
      label={
        <>
          <GaugeIcon size={15} />
          Use Zero Trust Assessment Score
        </>
      }
      helpText={
        <div>
          The{" "}
          <InlineLink
            href={
              "https://www.crowdstrike.com/resources/white-papers/falcon-zero-trust-risk-score/"
            }
            target={"_blank"}
          >
            ZTA score
            <ExternalLinkIcon
              size={12}
              className={"shrink-0 relative -top-[1px] mr-[1px]"}
            />
          </InlineLink>{" "}
          is a parameter that allows you to set the minimum ZTA score for the
          peer to be approved
        </div>
      }
    />
  );
};
