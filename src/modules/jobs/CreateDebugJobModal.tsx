import {
  AlarmClock,
  BugPlay,
  FileText,
  PlusCircle,
  Shield,
  UploadCloud,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import Button from "@/components/Button";
import FancyToggleSwitch from "@/components/FancyToggleSwitch";
import HelpText from "@/components/HelpText";
import { Input } from "@/components/Input";
import { Label } from "@/components/Label";
import {
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@/components/modal/Modal";
import ModalHeader from "@/components/modal/ModalHeader";
import { notify } from "@/components/Notification";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/Select";
import Separator from "@/components/Separator";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Workload } from "@/interfaces/Job";
import { useApiCall } from "@/utils/api";

type Props = {
  peerID: string;
  onSuccess: () => void;
};

export function CreateDebugJobModalContent({ peerID, onSuccess }: Props) {
  const t = useTranslations();
  const jobRequest = useApiCall<Workload>(`/peers/${peerID}/jobs`, true);
  const { mutate } = useSWRConfig();

  const [bundleForTimeEnabled, setBundleForTimeEnabled] = useState(false);
  const [bundleForTime, setBundleForTime] = useState<string>("");
  const [logFileCount, setLogFileCount] = useState<string>("10");
  const [anonymize, setAnonymize] = useState<boolean>(false);
  const [anonymizeLevel, setAnonymizeLevel] = useState<"default" | "strict">(
    "default",
  );
  const [uploadUrl, setUploadUrl] = useState<string>("");

  const isValid = useMemo(() => {
    let validBundleFor = true;
    let validLogFileCount = true;
    let validUploadUrl = true;

    const logFileCountNumber = Number(logFileCount);
    const bundleForTimeNumber = Number(bundleForTime);

    if (bundleForTime) {
      validBundleFor = bundleForTimeNumber >= 1 && bundleForTimeNumber <= 5;
    }

    validLogFileCount = logFileCountNumber >= 1 && logFileCountNumber <= 1000;

    const trimmedUploadUrl = uploadUrl.trim();
    if (trimmedUploadUrl) {
      try {
        const parsed = new URL(trimmedUploadUrl);
        validUploadUrl = parsed.protocol === "https:" && parsed.host !== "";
      } catch {
        validUploadUrl = false;
      }
    }

    return validLogFileCount && validBundleFor && validUploadUrl;
  }, [bundleForTime, logFileCount, uploadUrl]);

  const createDebugJob = async () => {
    notify({
      title: t("jobs.createDebugJob"),
      description: t("jobs.debugJobTriggered"),
      loadingMessage: t("jobs.creatingJob"),
      promise: jobRequest
        .post({
          workload: {
            type: "bundle",
            parameters: {
              anonymize,
              anonymize_level: anonymize ? anonymizeLevel : undefined,
              bundle_for: bundleForTimeEnabled,
              bundle_for_time: bundleForTimeEnabled
                ? Number(bundleForTime)
                : undefined,
              log_file_count: logFileCount ? Number(logFileCount) : 10,
              upload_url: uploadUrl.trim() ? uploadUrl.trim() : undefined,
            },
          },
        })
        .then((job) => {
          mutate(`/peers/${peerID}/jobs`);
          onSuccess();
          return job;
        }),
    });
  };
  return (
    <ModalContent maxWidthClass="max-w-xl">
      <ModalHeader
        icon={<BugPlay size={20} />}
        title={t("jobs.debugBundle")}
        description={t("jobs.debugBundleDescription")}
        color="netbird"
      />

      <Separator />
      <div className={"px-8 py-6 flex flex-col gap-4"}>
        {/* Log File Count */}
        <div className="flex justify-between gap-6">
          <div className={"max-w-[300px]"}>
            <Label>{t("jobs.logFileCount")}</Label>
            <HelpText>{t("jobs.logFileCountHelp")}</HelpText>
          </div>

          <Input
            type="number"
            min={1}
            placeholder={"10"}
            max={50}
            value={logFileCount}
            onChange={(e) => setLogFileCount(e.target.value)}
            maxWidthClass="w-[220px]"
            customPrefix={<FileText size={16} className="text-nb-gray-300" />}
            customSuffix={t("jobs.filesSuffix")}
          />
        </div>
        {/* Bundle Duration */}
        <div>
          <FancyToggleSwitch
            value={bundleForTimeEnabled}
            onChange={(enabled) => {
              setBundleForTimeEnabled(enabled);
              if (!enabled) {
                setBundleForTime("");
              } else {
                setBundleForTime("2");
              }
            }}
            label={
              <>
                <AlarmClock size={15} />
                {t("jobs.enableBundleDuration")}
              </>
            }
            helpText={t("jobs.bundleDurationHelp")}
          />

          {bundleForTimeEnabled && (
            <div className="flex justify-between gap-6 mt-6 mb-3">
              <div className={"max-w-[300px]"}>
                <Label>{t("jobs.duration")}</Label>
                <HelpText>{t("jobs.durationHelp")}</HelpText>
              </div>

              <Input
                type="number"
                min={1}
                max={60}
                value={bundleForTime}
                onChange={(e) => setBundleForTime(e.target.value)}
                maxWidthClass="w-[220px]"
                placeholder={"2"}
                customPrefix={
                  <AlarmClock size={16} className="text-nb-gray-300" />
                }
                customSuffix={t("jobs.minutesSuffix")}
              />
            </div>
          )}
        </div>

        {/* Anonymize Data */}
        <FancyToggleSwitch
          value={anonymize}
          onChange={setAnonymize}
          label={
            <>
              <Shield size={15} />
              {t("jobs.anonymizeLogData")}
            </>
          }
          helpText={t("jobs.anonymizeHelp")}
        />

        {/* Anonymization Level */}
        {anonymize && (
          <div className="flex justify-between gap-6">
            <div className={"max-w-[300px]"}>
              <Label>{t("jobs.anonymizationLevel")}</Label>
              <HelpText>{t("jobs.anonymizationLevelHelp")}</HelpText>
            </div>

            <Select
              value={anonymizeLevel}
              onValueChange={(v) => setAnonymizeLevel(v as "default" | "strict")}
            >
              <SelectTrigger className="w-[220px]">
                <div className="flex items-center gap-3">
                  <Shield size={15} className="text-nb-gray-300 shrink-0" />
                  <SelectValue placeholder={t("jobs.selectLevel")} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">{t("jobs.levelDefault")}</SelectItem>
                <SelectItem value="strict">{t("jobs.levelStrict")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Upload URL */}
        <div className="flex justify-between gap-6">
          <div className={"max-w-[300px]"}>
            <Label>{t("jobs.uploadUrl")}</Label>
            <HelpText>{t("jobs.uploadUrlHelp")}</HelpText>
          </div>

          <Input
            type="text"
            placeholder={"https://upload.debug.netbird.io"}
            value={uploadUrl}
            onChange={(e) => setUploadUrl(e.target.value)}
            maxWidthClass="w-[220px]"
            customPrefix={<UploadCloud size={16} className="text-nb-gray-300" />}
          />
        </div>
      </div>

      <ModalFooter className="items-center">
        <div className="flex gap-3 w-full justify-end">
          <ModalClose asChild>
            <Button variant="secondary">{t("common.cancel")}</Button>
          </ModalClose>
          <Button
            variant="primary"
            disabled={!isValid}
            onClick={createDebugJob}
          >
            <PlusCircle size={16} />
            {t("jobs.createDebugBundle")}
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
