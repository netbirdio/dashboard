import { SelectOption } from "@components/select/SelectDropdown";
import { IconMathEqualGreater } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import * as React from "react";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  version?: string;
  versionText?: string;
  versionList?: SelectOption[];
  icon: (props: { size: number }) => React.ReactElement;
  os: string;
};
export const PostureCheckOperatingSystemInfo = ({
  version,
  icon,
  versionText = "Version",
  versionList,
  os,
}: Props) => {
  const { t } = useI18n();
  const operatingSystemName = versionList?.find(
    (item) => item.value === version,
  )?.label;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 pl-1 pr-4 py-1 text-xs justify-start",
      )}
    >
      <div
        className={cn(
          "w-5 h-5 flex items-center justify-center brightness-[150%]",
        )}
      >
        {icon({ size: 14 })}
      </div>
      <div className={"flex items-center"}>
        <span
          className={cn(
            version ? "text-green-500" : "text-red-500",
            "mr-1 font-semibold",
          )}
        >
          {version ? t("postureChecks.allow") : t("postureChecks.block")}{" "}
        </span>

        {version ? (
          version == "0" ? (
            os
          ) : (
            <div className={"flex items-center gap-1"}>
              {os}{" "}
              {operatingSystemName
                ? t("postureChecks.versionLabel")
                : versionText}
              <span
                className={"text-netbird flex items-center gap-1 font-semibold"}
              >
                <IconMathEqualGreater size={14} />
                {operatingSystemName || version}
              </span>
            </div>
          )
        ) : (
          os
        )}
      </div>
    </div>
  );
};
