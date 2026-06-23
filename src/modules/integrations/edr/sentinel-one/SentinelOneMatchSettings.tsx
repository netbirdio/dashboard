import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { cn } from "@utils/helpers";
import {
  BrickWallShieldIcon,
  BugOffIcon,
  ChevronsLeftRightEllipsis,
  HardDrive,
  PowerIcon,
  RefreshCcw,
  TriangleAlert,
} from "lucide-react";
import * as React from "react";
import { SentinelOneMatchAttributes } from "@/interfaces/EDR";

type Props = {
  value: SentinelOneMatchAttributes;
  dispatch: React.Dispatch<any>;
};
export const SentinelOneMatchSettings = ({
  value: matchAttributes,
  dispatch: dispatchMatchAttributes,
}: Props) => {
  return (
    <>
      <div className={cn("flex justify-between mt-6 gap-5")}>
        <div className={"w-full"}>
          <Label>
            <TriangleAlert size={14} />
            Allowed Active Threats
          </Label>
          <HelpText>
            Maximum allowed number of active threats on a device.
          </HelpText>
        </div>
        <Input
          placeholder={"0"}
          min={0}
          max={999}
          className={"w-full min-w-[130px]"}
          value={matchAttributes.active_threats}
          type={"number"}
          onChange={(e) =>
            dispatchMatchAttributes({
              type: "SET_ACTIVE_THREATS",
              payload: Number(e.target.value),
            })
          }
          customSuffix={"Threats"}
        />
      </div>
      <div className={"mt-5 grid grid-cols-1 gap-6 mb-3"}>
        <FancyToggleSwitch
          value={matchAttributes.encrypted_applications ?? false}
          variant={"blank"}
          onChange={(val) =>
            dispatchMatchAttributes({
              type: "SET_ENCRYPTED_APPLICATIONS",
              payload: val,
            })
          }
          label={
            <>
              <HardDrive size={14} />
              Disk Encryption
            </>
          }
          helpText={"Devices must have disk encryption enabled."}
        />
        <FancyToggleSwitch
          value={matchAttributes.firewall_enabled ?? false}
          variant={"blank"}
          onChange={(val) =>
            dispatchMatchAttributes({
              type: "SET_FIREWALL_ENABLED",
              payload: val,
            })
          }
          label={
            <>
              <BrickWallShieldIcon size={14} />
              Firewall
            </>
          }
          helpText={"Devices must have their firewall enabled."}
        />
        <FancyToggleSwitch
          value={matchAttributes.infected === false}
          variant={"blank"}
          onChange={(val) =>
            dispatchMatchAttributes({
              type: "SET_INFECTED",
              payload: val,
            })
          }
          label={
            <>
              <BugOffIcon size={14} />
              Block Infected Devices
            </>
          }
          helpText={"Prevent access for devices with active infections."}
        />
        <FancyToggleSwitch
          value={matchAttributes.network_status === "connected"}
          variant={"blank"}
          onChange={(val) =>
            dispatchMatchAttributes({
              type: "SET_NETWORK_STATUS",
              payload: val,
            })
          }
          label={
            <>
              <ChevronsLeftRightEllipsis size={14} />
              Network Connectivity
            </>
          }
          helpText={"Require active network connection to SentinelOne."}
        />
        <FancyToggleSwitch
          value={matchAttributes.is_active ?? false}
          variant={"blank"}
          onChange={(val) =>
            dispatchMatchAttributes({
              type: "SET_IS_ACTIVE",
              payload: val,
            })
          }
          label={
            <>
              <PowerIcon size={14} />
              Active Status
            </>
          }
          helpText={"SentinelOne agent must be active and reporting."}
        />
        <FancyToggleSwitch
          value={matchAttributes.is_up_to_date ?? false}
          variant={"blank"}
          onChange={(val) =>
            dispatchMatchAttributes({
              type: "SET_IS_UP_TO_DATE",
              payload: val,
            })
          }
          label={
            <>
              <RefreshCcw size={14} />
              Latest Agent Version
            </>
          }
          helpText={
            "SentinelOne agent should be running on the latest version."
          }
        />
      </div>
    </>
  );
};
