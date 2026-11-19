import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { cn } from "@utils/helpers";
import { Bug, FileWarning, HardDrive, ShieldAlert, Wifi } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useTranslations } from "@/i18n/LocaleProvider";
import { FleetDMMatchAttributes } from "@/interfaces/EDR";

type Props = {
  value: FleetDMMatchAttributes;
  dispatch: React.Dispatch<any>;
};
export const FleetDMMatchSettings = ({
  value: matchAttributes,
  dispatch: dispatchMatchAttributes,
}: Props) => {
  const t = useTranslations();
  const [requiredPoliciesText, setRequiredPoliciesText] = useState(
    (matchAttributes.required_policies ?? []).join(", "),
  );

  return (
    <>
      <div className={cn("flex justify-between mt-6 gap-5")}>
        <div className={"w-full"}>
          <Label>
            <ShieldAlert size={14} />
            {t("integrations.edrMaxFailingPolicies")}
          </Label>
          <HelpText>
            {t("integrations.edrMaxFailingPoliciesHelp")}
          </HelpText>
        </div>
        <Input
          placeholder={t("integrations.edrNotSet")}
          min={0}
          max={999}
          className={"w-full min-w-[160px]"}
          value={matchAttributes.failing_policies_count_max ?? ""}
          type={"number"}
          onChange={(e) =>
            dispatchMatchAttributes({
              type: "SET_FAILING_POLICIES_COUNT_MAX",
              payload:
                e.target.value === "" ? undefined : Number(e.target.value),
            })
          }
          customSuffix={t("integrations.edrPolicies")}
        />
      </div>

      <div className={cn("flex justify-between mt-4 gap-5")}>
        <div className={"w-full"}>
          <Label>
            <Bug size={14} />
            {t("integrations.edrMaxVulnerableSoftware")}
          </Label>
          <HelpText>
            {t("integrations.edrMaxVulnerableSoftwareHelp")}
          </HelpText>
        </div>
        <Input
          placeholder={t("integrations.edrNotSet")}
          min={0}
          max={999}
          className={"w-full min-w-[160px]"}
          value={matchAttributes.vulnerable_software_count_max ?? ""}
          type={"number"}
          onChange={(e) =>
            dispatchMatchAttributes({
              type: "SET_VULNERABLE_SOFTWARE_COUNT_MAX",
              payload:
                e.target.value === "" ? undefined : Number(e.target.value),
            })
          }
          customSuffix={t("integrations.edrSoftware")}
        />
      </div>

      <div className={cn("flex justify-between mt-4 gap-5")}>
        <div className={"w-full"}>
          <Label>
            <FileWarning size={14} />
            {t("integrations.edrRequiredPolicyIds")}
          </Label>
          <HelpText>
            {t("integrations.edrRequiredPolicyIdsHelp")}
          </HelpText>
        </div>
        <Input
          placeholder={"e.g. 1, 5, 12"}
          className={"w-full min-w-[160px]"}
          value={requiredPoliciesText}
          type={"text"}
          onChange={(e) => {
            setRequiredPoliciesText(e.target.value);
            dispatchMatchAttributes({
              type: "SET_REQUIRED_POLICIES",
              payload: e.target.value,
            });
          }}
        />
      </div>

      <div className={"mt-5 grid grid-cols-1 gap-6 mb-3"}>
        <FancyToggleSwitch
          value={matchAttributes.disk_encryption_enabled ?? false}
          variant={"blank"}
          onChange={(val) =>
            dispatchMatchAttributes({
              type: "SET_DISK_ENCRYPTION",
              payload: val,
            })
          }
          label={
            <>
              <HardDrive size={14} />
              {t("integrations.edrDiskEncryption")}
            </>
          }
          helpText={t("integrations.edrFleetDiskEncryptionHelp")}
          textWrapperClassName={"max-w-lg"}
        />
        <FancyToggleSwitch
          value={matchAttributes.status_online ?? false}
          variant={"blank"}
          onChange={(val) =>
            dispatchMatchAttributes({
              type: "SET_STATUS_ONLINE",
              payload: val,
            })
          }
          label={
            <>
              <Wifi size={14} />
              {t("integrations.edrOnlineStatus")}
            </>
          }
          helpText={t("integrations.edrOnlineStatusHelp")}
        />
      </div>
    </>
  );
};
