import Button from "@components/Button";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { ModalClose, ModalFooter } from "@components/modal/Modal";
import Paragraph from "@components/Paragraph";
import { cn, validator } from "@utils/helpers";
import { isEmpty, uniqueId } from "lodash";
import {
  ExternalLinkIcon,
  MinusCircleIcon,
  PlusCircle,
  ServerCogIcon,
  TerminalIcon,
} from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import AppleIcon from "@/assets/icons/AppleIcon";
import { useI18n } from "@/i18n/I18nProvider";
import WindowsIcon from "@/assets/icons/WindowsIcon";
import { Process, ProcessCheck } from "@/interfaces/PostureCheck";
import { PostureCheckCard } from "@/modules/posture-checks/ui/PostureCheckCard";

type Props = {
  value?: ProcessCheck;
  onChange: (value: ProcessCheck | undefined) => void;
  disabled?: boolean;
};

export const PostureCheckProcess = ({ value, onChange, disabled }: Props) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <PostureCheckCard
      open={open}
      setOpen={setOpen}
      key={open ? 1 : 0}
      active={value?.processes && value?.processes?.length > 0}
      title={t("postureChecks.processTitle")}
      description={t("postureChecks.processDescription")}
      icon={<ServerCogIcon size={18} />}
      iconClass={"bg-gradient-to-tr from-nb-gray-500 to-nb-gray-300"}
      modalWidthClass={"max-w-xl"}
      onReset={() => onChange(undefined)}
    >
      <CheckContent
        value={value}
        onChange={(v) => {
          onChange(v);
          setOpen(false);
        }}
        disabled={disabled}
      />
    </PostureCheckCard>
  );
};

const CheckContent = ({ value, onChange, disabled }: Props) => {
  const { t } = useI18n();
  const [processes, setProcesses] = useState<Process[]>(
    value?.processes
      ? value.processes.map((p) => {
          return {
            id: uniqueId("process"),
            linux_path: p?.linux_path || "",
            mac_path: p?.mac_path || "",
            windows_path: p?.windows_path || "",
          };
        })
      : [
          {
            id: uniqueId("process"),
            linux_path: "",
            mac_path: "",
            windows_path: "",
          },
        ],
  );

  const handleProcessChange = (
    id: string,
    linux_path: string,
    mac_path: string,
    windows_path: string,
  ) => {
    const newProcesses = processes.map((p) =>
      p.id === id ? { ...p, linux_path, mac_path, windows_path } : p,
    );
    setProcesses(newProcesses);
  };

  const removeProcess = (id: string) => {
    const newProcesses = processes.filter((p) => p.id !== id);
    setProcesses(newProcesses);
  };

  const addProcess = () => {
    setProcesses([
      ...processes,
      {
        id: uniqueId("process"),
        linux_path: "",
        mac_path: "",
        windows_path: "",
      },
    ]);
  };

  const pathErrors = useMemo(() => {
    if (processes && processes.length > 0) {
      return processes.map((p) => {
        return {
          id: p.id,
          errorMacPath: p?.mac_path
            ? validator.isValidUnixFilePath(p?.mac_path || "")
              ? ""
              : t("postureChecks.macPathError")
            : "",
          errorLinuxPath: p?.linux_path
            ? validator.isValidUnixFilePath(p?.linux_path || "")
              ? ""
              : t("postureChecks.unixPathError")
            : "",
          errorWindowsPath: p?.windows_path
            ? validator.isValidWindowsFilePath(p?.windows_path || "")
              ? ""
              : t("postureChecks.windowsPathError")
            : "",
        };
      });
    } else {
      return [];
    }
  }, [processes, t]);

  const hasErrorsOrIsEmpty = useMemo(() => {
    if (processes.length === 0) return true;
    const hasOnlyEmptyPaths = processes.some(
      (p) => p.linux_path === "" && p.mac_path === "" && p.windows_path === "",
    );
    const hasPathErrors = pathErrors.some(
      (e) =>
        e.errorLinuxPath !== "" ||
        e.errorMacPath !== "" ||
        e.errorWindowsPath !== "",
    );
    return hasOnlyEmptyPaths || hasPathErrors;
  }, [processes, pathErrors]);

  return (
    <>
      <div className={"flex flex-col px-8 gap-2 pb-6"}>
        <div className={"flex justify-between items-start gap-10 mt-2"}>
          <div>
            <Label>{t("postureChecks.processesLabel")}</Label>
            <HelpText className={""}>
              {t("postureChecks.processesHelp")}
            </HelpText>
          </div>
        </div>
        {processes.length > 0 && (
          <div className={"mb-2 flex flex-col gap-4 w-full "}>
            {processes.map((p) => {
              return (
                <div key={p.id} className={"flex gap-2 items-center"}>
                  <div className={"w-full flex flex-col gap-1.5"}>
                    <Input
                      customPrefix={<TerminalIcon size={16} />}
                      placeholder={"/usr/local/bin/netbird"}
                      value={p.linux_path}
                      error={
                        pathErrors.find((e) => e.id === p.id)?.errorLinuxPath
                      }
                      errorTooltip={true}
                      errorTooltipPosition={"top-right"}
                      className={"w-full"}
                      onChange={(e) =>
                        handleProcessChange(
                          p.id,
                          e.target.value,
                          p?.mac_path || "",
                          p?.windows_path || "",
                        )
                      }
                      disabled={disabled}
                    />
                    <Input
                      customPrefix={
                        <AppleIcon
                          size={16}
                          className={cn(
                            pathErrors.find((e) => e.id === p.id)
                              ?.errorMacPath && "fill-red-500",
                          )}
                        />
                      }
                      placeholder={
                        "/Applications/NetBird.app/Contents/MacOS/netbird"
                      }
                      value={p.mac_path}
                      error={
                        pathErrors.find((e) => e.id === p.id)?.errorMacPath
                      }
                      errorTooltip={true}
                      errorTooltipPosition={"top-right"}
                      className={"w-full"}
                      onChange={(e) =>
                        handleProcessChange(
                          p.id,
                          p?.linux_path || "",
                          e.target.value,
                          p?.windows_path || "",
                        )
                      }
                      disabled={disabled}
                    />
                    <Input
                      customPrefix={
                        <WindowsIcon
                          size={16}
                          className={cn(
                            pathErrors.find((e) => e.id === p.id)
                              ?.errorWindowsPath && "fill-red-500",
                          )}
                        />
                      }
                      placeholder={`C:\\ProgramData\\NetBird\\netbird.exe`}
                      value={p.windows_path}
                      errorTooltip={true}
                      errorTooltipPosition={"top-right"}
                      error={
                        pathErrors.find((e) => e.id === p.id)?.errorWindowsPath
                      }
                      className={"w-full"}
                      onChange={(e) =>
                        handleProcessChange(
                          p.id,
                          p?.linux_path || "",
                          p?.mac_path || "",
                          e.target.value,
                        )
                      }
                      disabled={disabled}
                    />
                  </div>

                  <Button
                    className={"h-[42px]"}
                    variant={"default-outline"}
                    onClick={() => removeProcess(p.id)}
                    disabled={disabled}
                  >
                    <MinusCircleIcon size={15} />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        <Button
          variant={"dotted"}
          size={"sm"}
          onClick={addProcess}
          className={"mt-1"}
          disabled={disabled}
        >
          <PlusCircle size={16} />
          {t("postureChecks.addProcess")}
        </Button>
      </div>
      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            {t("common.learnMorePrefix")}
            <InlineLink
              href={
                "https://docs.netbird.io/how-to/manage-posture-checks#process-check"
              }
              target={"_blank"}
            >
              {t("postureChecks.processCheck")}
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          <ModalClose asChild={true}>
            <Button variant={"secondary"}>{t("actions.cancel")}</Button>
          </ModalClose>
          <Button
            variant={"primary"}
            disabled={hasErrorsOrIsEmpty || disabled}
            onClick={() => {
              if (isEmpty(processes)) {
                onChange(undefined);
              } else {
                onChange({
                  processes: processes.filter(
                    (p) =>
                      p.linux_path !== "" ||
                      p.mac_path !== "" ||
                      p.windows_path !== "",
                  ),
                });
              }
            }}
          >
            {t("groupsSettings.save")}
          </Button>
        </div>
      </ModalFooter>
    </>
  );
};
