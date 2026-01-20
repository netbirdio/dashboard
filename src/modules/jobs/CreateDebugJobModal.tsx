import {
  AlarmClock,
  BugPlay,
  FileText,
  PlusCircle,
  Shield,
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
import Separator from "@/components/Separator";
import { Workload } from "@/interfaces/Job";
import { useApiCall } from "@/utils/api";

type Props = {
  peerID: string;
  onSuccess: () => void;
};

export function CreateDebugJobModalContent({ peerID, onSuccess }: Props) {
  const jobRequest = useApiCall<Workload>(`/peers/${peerID}/jobs`, true);
  const { mutate } = useSWRConfig();

  const [bundleForTimeEnabled, setBundleForTimeEnabled] = useState(false);
  const [bundleForTime, setBundleForTime] = useState<string>("");
  const [logFileCount, setLogFileCount] = useState<string>("10");
  const [anonymize, setAnonymize] = useState<boolean>(false);

  const isValid = useMemo(() => {
    let validBundleFor = true;
    let validLogFileCount = true;

    const logFileCountNumber = Number(logFileCount);
    const bundleForTimeNumber = Number(bundleForTime);

    if (bundleForTime) {
      validBundleFor = bundleForTimeNumber >= 1 && bundleForTimeNumber <= 5;
    }

    validLogFileCount = logFileCountNumber >= 1 && logFileCountNumber <= 1000;

    return validLogFileCount && validBundleFor;
  }, [bundleForTime, logFileCount]);

  const createDebugJob = async () => {
    notify({
      title: "Create Debug Job",
      description: "Debug job triggered successfully.",
      loadingMessage: "Creating job...",
      promise: jobRequest
        .post({
          workload: {
            type: "bundle",
            parameters: {
              anonymize,
              bundle_for: bundleForTimeEnabled,
              bundle_for_time: bundleForTimeEnabled
                ? Number(bundleForTime)
                : undefined,
              log_file_count: logFileCount ? Number(logFileCount) : 10,
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
        title="Debug Bundle"
        description="Generate a debug bundle on this peer with logs and diagnostics. Useful for troubleshooting without CLI access."
        color="netbird"
      />

      <Separator />
      <div className={"px-8 py-6 flex flex-col gap-4"}>
        {/* Log File Count */}
        <div className="flex justify-between gap-6">
          <div className={"max-w-[300px]"}>
            <Label>Log File Count</Label>
            <HelpText>
              Sets the limit for how many individual log files will be included
              in the debug bundle.
            </HelpText>
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
            customSuffix="File(s)"
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
                Enable Bundle Duration
              </>
            }
            helpText="When enabled, allows you to specify a time period for log collection before generating the debug bundle."
          />

          {bundleForTimeEnabled && (
            <div className="flex justify-between gap-6 mt-6 mb-3">
              <div className={"max-w-[300px]"}>
                <Label>Duration</Label>
                <HelpText>
                  Time period for which logs should be collected before creating
                  the debug bundle.
                </HelpText>
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
                customSuffix="Minute(s)"
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
              Anonymize Log Data
            </>
          }
          helpText="Remove sensitive information (IP addresses, domains etc.) before creating the debug bundle."
        />
      </div>

      <ModalFooter className="items-center">
        <div className="flex gap-3 w-full justify-end">
          <ModalClose asChild>
            <Button variant="secondary">Cancel</Button>
          </ModalClose>
          <Button
            variant="primary"
            disabled={!isValid}
            onClick={createDebugJob}
          >
            <PlusCircle size={16} />
            Create Debug Bundle
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
