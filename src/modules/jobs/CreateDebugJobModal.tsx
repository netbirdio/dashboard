import FancyToggleSwitch from "@/components/FancyToggleSwitch";
import { ModalClose, ModalContent, ModalFooter } from "@/components/modal/Modal";
import ModalHeader from "@/components/modal/ModalHeader";
import { BugPlay, PlusCircle } from "lucide-react";
import { Label } from "@/components/Label";
import { Input } from "@/components/Input";
import Button from "@/components/Button";
import { useState, useMemo } from "react";
import HelpText from "@/components/HelpText";
import { useApiCall } from "@/utils/api";
import { useSWRConfig } from "swr";
import { notify } from "@/components/Notification";

type Props = {
  peerID: string;
  onSuccess: () => void;
};

export function CreateDebugJobModalContent({ peerID, onSuccess }: Props) {
  const jobRequest = useApiCall(`/peers/${peerID}/jobs`, true);
  const { mutate } = useSWRConfig();

  const [bundleForTime, setBundleForTime] = useState<number>(5);
  const [logFileCount, setLogFileCount] = useState<number>(10);
  const [anonymize, setAnonymize] = useState<boolean>(true);

  const isValid = useMemo(() => {
    return bundleForTime > 0 && logFileCount > 0;
  }, [bundleForTime, logFileCount]);

  const createDebugJob = async () => {
    notify({
      title: "Create Debug Job",
      description: "Debug job triggered successfully.",
      loadingMessage: "Creating job...",
      promise: jobRequest
        .post({
          Type: "bundle",
          Parameters: {
            anonymize,
            bundle_for: true,
            bundle_for_time: bundleForTime,
            log_file_count: logFileCount,
          },
        })
        .then((job) => {
          mutate(`/peers/${peerID}/jobs`);
          onSuccess();
          return job;
        }),
    });
  };  return (
    <ModalContent maxWidthClass="max-w-lg">
      <ModalHeader
        icon={<BugPlay size={20} />}
        title="Create Debug Job"
        description="Generate a debug bundle on this peer with logs and diagnostics. Useful for troubleshooting without CLI access."
        color="netbird"
      />

      <div className="pb-6">
        <div className="px-8 flex flex-col gap-6">
          <div>
            <Label>Bundle Duration (minutes)</Label>
            <HelpText>
              Defines how long logs will be collected for the debug bundle.
            </HelpText>
            <Input
              type="number"
              min={1}
              max={60}
              value={bundleForTime}
              onChange={(e) => setBundleForTime(Number(e.target.value))}
            />
          </div>

          <div>
            <Label>Log File Count</Label>
            <HelpText>
              Maximum number of log files to include in the bundle.
            </HelpText>
            <Input
              type="number"
              min={1}
              max={50}
              value={logFileCount}
              onChange={(e) => setLogFileCount(Number(e.target.value))}
            />
          </div>

          <FancyToggleSwitch
            value={anonymize}
            onChange={setAnonymize}
            label="Anonymize Data"
            helpText="Remove sensitive information (IP addresses, peer IDs) from the bundle."
          />
        </div>
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

