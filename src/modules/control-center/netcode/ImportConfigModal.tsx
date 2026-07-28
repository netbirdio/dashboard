import * as React from "react";
import { useCallback, useRef, useState } from "react";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  FileUpIcon,
  UploadIcon,
} from "lucide-react";
import Button from "@components/Button";
import { Input } from "@components/Input";
import { Textarea } from "@components/Textarea";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { ScrollArea } from "@components/ScrollArea";
import { notify } from "@components/Notification";
import { cn } from "@utils/helpers";
import {
  NetCodeValidationError,
  NetCodeValidationResult,
} from "@/interfaces/NetCode";
import { useNetcodeApi } from "@/modules/control-center/netcode/useNetcodeApi";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the created changeset id once the import succeeded. */
  onImported?: (changesetId: string) => void;
};

const MAX_SIZE = 10 * 1024 * 1024;

const ErrorList = ({
  entries,
  tone,
}: {
  entries: NetCodeValidationError[];
  tone: "error" | "warning";
}) => (
  <ul className={"flex flex-col gap-1"}>
    {entries.map((entry, index) => (
      <li key={index} className={"flex items-start gap-2 text-xs"}>
        <span
          className={cn(
            "font-mono text-[0.65rem] px-1 py-0.5 rounded shrink-0",
            tone === "error"
              ? "bg-red-900/40 text-red-300"
              : "bg-amber-900/40 text-amber-300",
          )}
        >
          {entry.path || "spec"}
        </span>
        <span
          className={tone === "error" ? "text-red-300" : "text-amber-300"}
        >
          {entry.message}
        </span>
      </li>
    ))}
  </ul>
);

export const ImportConfigModal = ({
  open,
  onOpenChange,
  onImported,
}: Props) => {
  const { validateConfig, importConfig } = useNetcodeApi();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [validation, setValidation] = useState<NetCodeValidationResult | null>(
    null,
  );
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const reset = () => {
    setName("");
    setContent("");
    setFileName("");
    setValidation(null);
  };

  const runValidate = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setIsValidating(true);
      try {
        setValidation(await validateConfig(text));
      } catch (error) {
        setValidation({
          valid: false,
          errors: [
            {
              path: "api",
              message:
                (error as { message?: string })?.message ??
                "Validation request failed.",
              severity: "error",
            },
          ],
          warnings: null,
        });
      } finally {
        setIsValidating(false);
      }
    },
    [validateConfig],
  );

  const loadFile = useCallback(
    (file: File) => {
      if (!/\.(ya?ml|json)$/i.test(file.name)) {
        notify({
          title: "Import Configuration",
          description: `${file.name} is not a YAML or JSON file.`,
          icon: <AlertCircleIcon size={16} />,
          backgroundColor: "bg-red-500",
        });
        return;
      }
      if (file.size > MAX_SIZE) {
        notify({
          title: "Import Configuration",
          description: "The file exceeds the 10 MB import limit.",
          icon: <AlertCircleIcon size={16} />,
          backgroundColor: "bg-red-500",
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = String(event.target?.result ?? "");
        setContent(text);
        setFileName(file.name);
        if (!name) setName(file.name.replace(/\.(ya?ml|json)$/i, ""));
        void runValidate(text);
      };
      reader.readAsText(file);
    },
    [name, runValidate],
  );

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const result = await importConfig(content, name.trim() || undefined);
      notify({
        title: "Import Configuration",
        description: `Changeset created with ${
          result.summary?.added?.total ?? 0
        } addition(s), ${result.summary?.modified?.total ?? 0} modification(s), ${
          result.summary?.deleted?.total ?? 0
        } deletion(s).`,
      });
      onImported?.(result.changesetId);
      reset();
      onOpenChange(false);
    } catch (error) {
      notify({
        title: "Import Configuration",
        description:
          (error as { message?: string })?.message ?? "The import failed.",
        icon: <AlertCircleIcon size={16} />,
        backgroundColor: "bg-red-500",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const errors = validation?.errors ?? [];
  const warnings = validation?.warnings ?? [];
  const hasErrors = !!validation && !validation.valid;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <ModalContent maxWidthClass={"max-w-3xl"}>
        <ModalHeader
          icon={<UploadIcon size={18} className={"text-netbird"} />}
          title={"Import Configuration"}
          description={
            "Stage a YAML or JSON configuration as a changeset you can review and deploy."
          }
        />
        <div className={"px-8 pt-2 pb-8 flex flex-col gap-3"}>
          <Input
            placeholder={"Changeset name (optional)"}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div
            className={cn(
              "rounded-md border-2 border-dashed px-4 py-6 text-center transition-colors",
              isDragging
                ? "border-netbird bg-netbird/5"
                : content
                ? "border-green-500/40 border-solid bg-green-950/10"
                : "border-nb-gray-900 bg-nb-gray-930/40",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = Array.from(e.dataTransfer.files)[0];
              if (file) loadFile(file);
            }}
          >
            <FileUpIcon
              size={20}
              className={"mx-auto mb-2 text-nb-gray-400"}
            />
            <div className={"text-xs text-nb-gray-300"}>
              {fileName
                ? `Loaded ${fileName}`
                : "Drop a .yaml, .yml or .json file here"}
            </div>
            <div className={"mt-2 flex items-center justify-center gap-2"}>
              <Button
                variant={"secondary"}
                size={"xs"}
                onClick={() => fileInputRef.current?.click()}
              >
                Browse Files
              </Button>
              {content && (
                <Button variant={"secondary"} size={"xs"} onClick={reset}>
                  Clear
                </Button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type={"file"}
              accept={".yaml,.yml,.json"}
              className={"hidden"}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) loadFile(file);
                e.target.value = "";
              }}
            />
          </div>

          <Textarea
            rows={10}
            placeholder={"…or paste the configuration here"}
            value={content}
            className={"font-mono text-xs"}
            onChange={(e) => {
              setContent(e.target.value);
              setValidation(null);
            }}
          />

          <div className={"flex items-center gap-2"}>
            <Button
              variant={"secondary"}
              size={"xs"}
              disabled={!content.trim() || isValidating}
              onClick={() => void runValidate(content)}
            >
              {isValidating ? "Validating..." : "Validate"}
            </Button>
            {validation && (
              <span
                className={cn(
                  "flex items-center gap-1.5 text-xs",
                  hasErrors ? "text-red-400" : "text-green-400",
                )}
              >
                {hasErrors ? (
                  <AlertCircleIcon size={13} />
                ) : (
                  <CheckCircle2Icon size={13} />
                )}
                {hasErrors ? "Validation failed" : "Validation successful"}
              </span>
            )}
          </div>

          {(errors.length > 0 || warnings.length > 0) && (
            <ScrollArea className={"max-h-[180px]"}>
              <div
                className={
                  "rounded-md border border-nb-gray-910 bg-nb-gray-930/40 px-3.5 py-2.5 flex flex-col gap-2 w-0 min-w-full"
                }
              >
                {errors.length > 0 && (
                  <ErrorList entries={errors} tone={"error"} />
                )}
                {warnings.length > 0 && (
                  <ErrorList entries={warnings} tone={"warning"} />
                )}
              </div>
            </ScrollArea>
          )}
        </div>
        <ModalFooter className={"items-center"}>
          <div className={"flex gap-3 w-full justify-end"}>
            <ModalClose asChild={true}>
              <Button variant={"secondary"} disabled={isImporting}>
                Cancel
              </Button>
            </ModalClose>
            <Button
              variant={"primary"}
              disabled={!content.trim() || hasErrors || isImporting}
              onClick={() => void handleImport()}
            >
              <UploadIcon size={16} />
              {isImporting ? "Importing..." : "Import as Changeset"}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
