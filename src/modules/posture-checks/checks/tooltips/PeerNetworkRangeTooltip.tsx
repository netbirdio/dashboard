import Badge from "@components/Badge";
import FullTooltip from "@components/FullTooltip";
import { ScrollArea } from "@components/ScrollArea";
import { NetworkIcon } from "lucide-react";
import * as React from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { PeerNetworkRangeCheck } from "@/interfaces/PostureCheck";

type Props = {
  check?: PeerNetworkRangeCheck;
  children?: React.ReactNode;
};
export const PeerNetworkRangeTooltip = ({ check, children }: Props) => {
  const { t } = useI18n();

  return check ? (
    <FullTooltip
      className={"w-full"}
      interactive={true}
      contentClassName={"p-0"}
      content={
        <div
          className={"text-neutral-300 text-sm max-w-xs flex flex-col gap-1"}
        >
          <div className={"px-4 pt-3"}>
            {check.action == "allow" ? (
              <span>
                <span className={"text-green-500 font-semibold"}>
                  {t("postureChecks.allowOnly")}
                </span>{" "}
                {t("postureChecks.peerRangeTooltipAllowed")}
              </span>
            ) : (
              <span>
                <span className={"text-red-500 font-semibold"}>
                  {t("postureChecks.block")}
                </span>{" "}
                {t("postureChecks.peerRangeTooltipBlocked")}
              </span>
            )}
          </div>

          <ScrollArea
            className={"max-h-[275px] overflow-y-auto flex flex-col px-4"}
          >
            <div className={"flex flex-col gap-1.5 mt-1 text-xs mb-3.5"}>
              {check.ranges.map((ipRange, index) => {
                return (
                  <Badge
                    variant={"gray"}
                    useHover={false}
                    key={index}
                    className={
                      "justify-start font-medium font-mono text-[11px]"
                    }
                  >
                    <NetworkIcon size={10} />
                    {ipRange}
                  </Badge>
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
