import * as React from "react";
import { useState } from "react";
import { AlertCircleIcon, DownloadIcon } from "lucide-react";
import Button from "@components/Button";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { SegmentedTabs } from "@components/SegmentedTabs";
import { notify } from "@components/Notification";
import { cn } from "@utils/helpers";
import {
  downloadConfigFile,
  ExportFormat,
  useNetcodeApi,
} from "@/modules/control-center/netcode/useNetcodeApi";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Resource kinds the backend can filter an export down to
const RESOURCES = [
  "groups",
  "policies",
  "peers",
  "users",
  "routes",
  "setupKeys",
  "postureChecks",
  "settings",
  "dns",
  "network",
];

export const ExportConfigModal = ({ open, onOpenChange }: Props) => {
  const { exportConfig } = useNetcodeApi();
  const [format, setFormat] = useState<ExportFormat>("yaml");
  const [resource, setResource] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const content = await exportConfig({
        format,
        pretty: true,
        resource: resource || undefined,
      });
      const stamp = new Date().toISOString().slice(0, 10);
      downloadConfigFile(
        content,
        `netbird-${resource || "configuration"}-${stamp}.${format}`,
      );
      notify({
        title: "Export Configuration",
        description: "The configuration file was downloaded.",
      });
      onOpenChange(false);
    } catch (error) {
      notify({
        title: "Export Configuration",
        description:
          (error as { message?: string })?.message ?? "The export failed.",
        icon: <AlertCircleIcon size={16} />,
        backgroundColor: "bg-red-500",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidthClass={"max-w-lg"}>
        <ModalHeader
          icon={<DownloadIcon size={18} className={"text-netbird"} />}
          title={"Export Configuration"}
          description={
            "Download the current account configuration as a file you can version, edit and import again."
          }
        />
        <div className={"px-8 pt-2 pb-8 flex flex-col gap-4"}>
          <div className={"flex flex-col gap-2"}>
            <span className={"text-xs font-medium text-nb-gray-200"}>
              Format
            </span>
            <SegmentedTabs
              value={format}
              onChange={(v: string) => setFormat(v as ExportFormat)}
            >
              <SegmentedTabs.List
                className={"bg-nb-gray-930 p-1 rounded-lg text-sm"}
              >
                <SegmentedTabs.Trigger
                  value={"yaml"}
                  className={"text-xs px-3 py-[0.45rem]"}
                >
                  YAML
                </SegmentedTabs.Trigger>
                <SegmentedTabs.Trigger
                  value={"json"}
                  className={"text-xs px-3 py-[0.45rem]"}
                >
                  JSON
                </SegmentedTabs.Trigger>
              </SegmentedTabs.List>
            </SegmentedTabs>
          </div>

          <div className={"flex flex-col gap-2"}>
            <span className={"text-xs font-medium text-nb-gray-200"}>
              Scope
            </span>
            <div className={"flex flex-wrap gap-1.5"}>
              <button
                className={cn(
                  "px-2.5 py-1 rounded-md border text-xs transition-colors",
                  resource === ""
                    ? "border-netbird/40 bg-netbird/10 text-netbird"
                    : "border-nb-gray-900 bg-nb-gray-930/60 text-nb-gray-300 hover:bg-nb-gray-920",
                )}
                onClick={() => setResource("")}
              >
                Full configuration
              </button>
              {RESOURCES.map((item) => (
                <button
                  key={item}
                  className={cn(
                    "px-2.5 py-1 rounded-md border text-xs transition-colors",
                    resource === item
                      ? "border-netbird/40 bg-netbird/10 text-netbird"
                      : "border-nb-gray-900 bg-nb-gray-930/60 text-nb-gray-300 hover:bg-nb-gray-920",
                  )}
                  onClick={() => setResource(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
        <ModalFooter className={"items-center"}>
          <div className={"flex gap-3 w-full justify-end"}>
            <ModalClose asChild={true}>
              <Button variant={"secondary"} disabled={isExporting}>
                Cancel
              </Button>
            </ModalClose>
            <Button
              variant={"primary"}
              disabled={isExporting}
              onClick={() => void handleExport()}
            >
              <DownloadIcon size={16} />
              {isExporting ? "Exporting..." : "Download"}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
