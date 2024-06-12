import Badge from "@components/Badge";
import FullTooltip from "@components/FullTooltip";
import { ScrollArea } from "@components/ScrollArea";
import { tryGetProcessNameFromPath } from "@utils/helpers";
import { TerminalIcon } from "lucide-react";
import * as React from "react";
import AppleIcon from "@/assets/icons/AppleIcon";
import WindowsIcon from "@/assets/icons/WindowsIcon";
import { ProcessCheck } from "@/interfaces/PostureCheck";

type Props = {
  check?: ProcessCheck;
  children?: React.ReactNode;
};
export const ProcessTooltip = ({ check, children }: Props) => {
  return check ? (
    <FullTooltip
      className={"w-full min-w-0"}
      interactive={true}
      contentClassName={"p-0"}
      content={
        <div
          className={
            "text-neutral-300 text-sm max-w-xs flex flex-col gap-1 min-w-0"
          }
        >
          <div className={"px-4 pt-3"}>
            <span>
              <span className={"text-green-500 font-semibold"}>Allow only</span>{" "}
              peers which are running the following processes
            </span>
          </div>

          <ScrollArea
            className={
              "max-h-[275px] overflow-y-auto flex flex-col px-4 min-w-0"
            }
          >
            <div className={"flex flex-col gap-3 mt-1 text-xs mb-3.5 min-w-0"}>
              {check.processes.map((p, index) => {
                return (
                  <div className={"flex-col flex gap-1 min-w-0"} key={index}>
                    {p?.linux_path && (
                      <Badge
                        variant={"gray"}
                        useHover={false}
                        className={"justify-start font-medium text-xs min-w-0"}
                      >
                        <span className={"mr-1.5"}>
                          <TerminalIcon size={12} />
                        </span>
                        <span
                          className={"truncate inline-block "}
                          title={p?.linux_path}
                        >
                          {tryGetProcessNameFromPath(p?.linux_path) ||
                            "Unknown path"}
                        </span>
                      </Badge>
                    )}

                    {p?.mac_path && (
                      <Badge
                        variant={"gray"}
                        useHover={false}
                        className={"justify-start font-medium text-xs min-w-0"}
                      >
                        <span className={"mr-1.5"}>
                          <AppleIcon size={12} />
                        </span>
                        <span
                          className={"truncate inline-block "}
                          title={p?.mac_path}
                        >
                          {tryGetProcessNameFromPath(p?.mac_path) ||
                            "Unknown path"}
                        </span>
                      </Badge>
                    )}

                    {p?.windows_path && (
                      <Badge
                        variant={"gray"}
                        useHover={false}
                        className={"justify-start font-medium text-xs min-w-0"}
                      >
                        <span className={"mr-1.5"}>
                          <WindowsIcon size={12} />
                        </span>
                        <span
                          className={"truncate inline-block"}
                          title={p?.windows_path}
                        >
                          {tryGetProcessNameFromPath(p?.windows_path) ||
                            "Unknown path"}
                        </span>
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      }
    >
      {children}
    </FullTooltip>
  ) : (
    children
  );
};
