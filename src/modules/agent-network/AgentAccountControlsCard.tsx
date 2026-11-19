"use client";

import Button from "@components/Button";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { useHasChanges } from "@hooks/useHasChanges";
import { cn } from "@utils/helpers";
import { Clock, FileText, ScrollText } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useTranslations } from "@/i18n/LocaleProvider";
import { useAgentNetworkText } from "@/modules/agent-network/agentNetworkText";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";

// Retention options for access-log rows. "0" keeps them indefinitely. Usage
// records are retained independently and aren't affected by this.
const RETENTION_OPTIONS = [
  { value: "7", days: 7 },
  { value: "14", days: 14 },
  { value: "30", days: 30 },
  { value: "60", days: 60 },
  { value: "90", days: 90 },
  { value: "0", days: 0 },
];

export default function AgentAccountControlsCard() {
  const translate = useTranslations();
  const { tr } = useAgentNetworkText();
  const { settings, settingsLoading, updateAgentNetworkSettings } =
    useAIProviders();

  const [enableLogCollection, setEnableLogCollection] = useState<boolean>(
    settings?.enableLogCollection ?? false,
  );
  const [enablePromptCollection, setEnablePromptCollection] = useState<boolean>(
    settings?.enablePromptCollection ?? false,
  );
  const [retentionDays, setRetentionDays] = useState<string>(
    String(settings?.accessLogRetentionDays ?? 30),
  );

  useEffect(() => {
    if (!settings) return;
    setEnableLogCollection(settings.enableLogCollection);
    setEnablePromptCollection(settings.enablePromptCollection);
    setRetentionDays(String(settings.accessLogRetentionDays));
  }, [settings]);

  const { hasChanges, updateRef } = useHasChanges([
    enableLogCollection,
    enablePromptCollection,
    retentionDays,
  ]);

  const onSave = async () => {
    const saved = await updateAgentNetworkSettings({
      enableLogCollection,
      enablePromptCollection,
      // PII redaction is managed at the policy guardrail level; preserve the
      // stored account value here.
      redactPii: settings?.redactPii ?? false,
      accessLogRetentionDays: Number(retentionDays),
    });
    // Only clear the dirty state on a confirmed save, so a failed update keeps
    // the unsaved-changes indicator.
    if (saved) {
      updateRef([enableLogCollection, enablePromptCollection, retentionDays]);
    }
  };

  if (settingsLoading && !settings) {
    return (
      <div className={"p-default py-6 max-w-2xl"}>
        <SkeletonTable />
      </div>
    );
  }

  return (
    <div className={"p-default py-6 max-w-2xl"}>
      <div className={"flex items-start justify-between"}>
        <h1>{translate("common.logCollection")}</h1>

        <Button
          variant={"primary"}
          disabled={!hasChanges}
          onClick={onSave}
          data-testid={"save-account-controls"}
        >
          {translate("common.saveChanges")}
        </Button>
      </div>

      <div className={"flex flex-col gap-6 w-full mt-8 mb-3"}>
        <div className={"flex flex-col"}>
          <FancyToggleSwitch
            value={enableLogCollection}
            onChange={setEnableLogCollection}
            data-testid={"enable-log-collection"}
            label={
              <>
                <ScrollText size={15} />
                {tr("agentNetwork.enableLogCollection")}
              </>
            }
            helpText={
              <>{tr("agentNetwork.enableLogCollectionHelp")}</>
            }
          />

          <div
            className={cn(
              "border border-nb-gray-900 border-t-0 rounded-b-md px-[1.28rem] pt-3 pb-5 flex flex-col gap-4 mx-[0.25rem]",
              enableLogCollection
                ? "bg-nb-gray-930/80"
                : "opacity-50 pointer-events-none",
            )}
          >
            <div className={"flex justify-between gap-10 mt-2"}>
              <div className={"w-full"}>
                <Label>{tr("agentNetwork.retentionPeriod")}</Label>
                <HelpText className={"mt-1"}>
                  {tr("agentNetwork.retentionPeriodHelp")}
                </HelpText>
              </div>
              <div className={"w-40 shrink-0"}>
                <Select
                  value={retentionDays}
                  onValueChange={setRetentionDays}
                  disabled={!enableLogCollection}
                >
                  <SelectTrigger
                    className={"w-full"}
                    data-testid={"access-log-retention"}
                  >
                    <div className={"flex items-center gap-3"}>
                      <Clock size={15} className={"text-nb-gray-300"} />
                      <SelectValue
                        placeholder={tr("agentNetwork.selectRetention")}
                      />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {RETENTION_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.days === 0
                          ? tr("agentNetwork.retentionIndefinite")
                          : tr("agentNetwork.retentionDays", { count: o.days })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <FancyToggleSwitch
          value={enablePromptCollection}
          onChange={setEnablePromptCollection}
          data-testid={"enable-prompt-collection"}
          label={
            <>
              <FileText size={15} />
              {tr("agentNetwork.enablePromptCollection")}
            </>
          }
          helpText={
            <>{tr("agentNetwork.enablePromptCollectionHelp")}</>
          }
        />
      </div>
    </div>
  );
}
