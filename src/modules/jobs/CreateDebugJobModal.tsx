import FancyToggleSwitch from "@/components/FancyToggleSwitch";
import { ModalClose, ModalContent, ModalFooter } from "@/components/modal/Modal";
import ModalHeader from "@/components/modal/ModalHeader";
import { AlarmClock, BugPlay, FileText, PlusCircle, Shield } from "lucide-react";
import { Label } from "@/components/Label";
import { Input } from "@/components/Input";
import Button from "@/components/Button";
import { useState, useMemo } from "react";
import HelpText from "@/components/HelpText";
import { useApiCall } from "@/utils/api";
import { useSWRConfig } from "swr";
import { notify } from "@/components/Notification";
import Separator from "@/components/Separator";
import { Workload } from "@/interfaces/Job";

type Props = {
  peerID: string;
  onSuccess: () => void;
};

export function CreateDebugJobModalContent({ peerID, onSuccess }: Props) {
  const jobRequest = useApiCall<Workload>(`/peers/${peerID}/jobs`, true);
  const { mutate } = useSWRConfig();

  const [bundleForTime, setBundleForTime] = useState<number | null>(null);
  const [logFileCount, setLogFileCount] = useState<number>(10);
  const [anonymize, setAnonymize] = useState<boolean>(false);

  const isValid = useMemo(() => {
    let validBundleFor = true;
    let validLogFileCount = true

    if (bundleForTime) {
      validBundleFor = bundleForTime >= 1 && bundleForTime <= 5
    }
    validLogFileCount = logFileCount >= 1 && logFileCount <= 1000

    return validLogFileCount && validBundleFor
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
              bundle_for: !!bundleForTime,
              bundle_for_time: bundleForTime,
              log_file_count: logFileCount,
            },
          },
        })
        .then((job) => {
          mutate(`/peers/${peerID}/jobs`);
          onSuccess();
          return job;
        }),
    });
  }; return (
    <ModalContent maxWidthClass="max-w-xl">
      <ModalHeader
        icon={<BugPlay size={20} />}
        title="Create Debug Job"
        description="Generate a debug bundle on this peer with logs and diagnostics. Useful for troubleshooting without CLI access."
        color="netbird"
      />

      <Separator />
      <div className={"px-8 py-6 flex flex-col gap-8"}>
        {/* Log File Count */}
        <div className="flex justify-between">
          <div>
            <Label>Log File Count</Label>
            <HelpText>
              Maximum number of log files to include in the bundle.
            </HelpText>
          </div>

          <Input
            type="number"
            min={1}
            max={50}
            value={logFileCount}
            onChange={(e) => setLogFileCount(Number(e.target.value))}
            maxWidthClass="max-w-[200px]"
            customPrefix={<FileText size={16} className="text-nb-gray-300" />}
            customSuffix="File(s)"
          />
        </div>
        {/* Bundle Duration */}
        <div>
          <FancyToggleSwitch
            value={!!bundleForTime}
            onChange={(enabled) => {
              if (enabled) {
                return setBundleForTime(2);
              }
              setBundleForTime(null);
            }}
            label={
              <>
                <AlarmClock size={15} />
                Bundle Duration
              </>
            }
            helpText="Enable logs collection for a duration (minutes)."
          />

          {bundleForTime && (
            <div className="mt-3 flex justify-between">
              <div>
                <Label>Duration</Label>
                <HelpText>
                  Defines how long logs will be collected for the debug bundle.
                </HelpText>
              </div>

              <Input
                type="number"
                min={1}
                max={60}
                value={bundleForTime}
                onChange={(e) => setBundleForTime(Number(e.target.value))}
                maxWidthClass="max-w-[200px]"
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
              Anonymize Data
            </>
          }
          helpText="Remove sensitive information (IP addresses, peer IDs) from the bundle."
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
            Create Job
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
}

