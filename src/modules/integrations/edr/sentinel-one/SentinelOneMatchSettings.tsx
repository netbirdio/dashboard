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
import { useTranslations } from "@/i18n/LocaleProvider";
import { SentinelOneMatchAttributes } from "@/interfaces/EDR";

type Props = {
  value: SentinelOneMatchAttributes;
  dispatch: React.Dispatch<any>;
};
export const SentinelOneMatchSettings = ({
  value: matchAttributes,
  dispatch: dispatchMatchAttributes,
}: Props) => {
  const t = useTranslations();
  return (
    <>
      <div className={cn("flex justify-between mt-6 gap-5")}>
        <div className={"w-full"}>
          <Label>
            <TriangleAlert size={14} />
            {t("integrations.edrAllowedActiveThreats")}
          </Label>
          <HelpText>
            {t("integrations.edrAllowedActiveThreatsHelp")}
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
          customSuffix={t("integrations.edrThreats")}
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
              {t("integrations.edrDiskEncryption")}
            </>
          }
          helpText={t("integrations.edrDiskEncryptionHelp")}
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
              {t("integrations.edrFirewall")}
            </>
          }
          helpText={t("integrations.edrFirewallHelp")}
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
              {t("integrations.edrBlockInfected")}
            </>
          }
          helpText={t("integrations.edrBlockInfectedHelp")}
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
              {t("integrations.edrNetworkConnectivity")}
            </>
          }
          helpText={t("integrations.edrNetworkConnectivityHelp")}
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
              {t("integrations.edrActiveStatus")}
            </>
          }
          helpText={t("integrations.edrActiveStatusHelp")}
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
              {t("integrations.edrLatestAgentVersion")}
            </>
          }
          helpText={t("integrations.edrLatestAgentVersionHelp")}
        />
      </div>
    </>
  );
};
