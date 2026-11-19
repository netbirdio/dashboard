import FullTooltip from "@components/FullTooltip";
import * as React from "react";
import { useTranslations } from "@/i18n/LocaleProvider";

type Props = {
  disabled?: boolean;
  children?: React.ReactNode;
  hasPermission?: boolean;
  side?: "top" | "right" | "bottom" | "left";
};
export const RDPTooltip = ({
  disabled,
  children,
  hasPermission,
  side = "top",
}: Props) => {
  const t = useTranslations();
  return (
    <FullTooltip
      className={"w-full"}
      side={side}
      content={
        <div className={"max-w-xs text-xs flex flex-col gap-2"}>
          {hasPermission ? (
            <div>{t("remoteAccess.rdpOffline")}</div>
          ) : (
            <div>{t("remoteAccess.rdpNoPermission")}</div>
          )}
        </div>
      }
      disabled={disabled}
    >
      {children}
    </FullTooltip>
  );
};
