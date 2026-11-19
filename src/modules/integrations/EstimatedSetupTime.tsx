import { Clock4 } from "lucide-react";
import * as React from "react";
import { useTranslations } from "@/i18n/LocaleProvider";

type Props = {
  minutes?: number;
};
export const EstimatedSetupTime = ({ minutes = 5 }: Props) => {
  const t = useTranslations();
  return (
    <div
      className={
        "text-center z-0 mt-2.5 text-xs text-nb-gray-300 flex items-center justify-center gap-2 font-normal"
      }
    >
      <Clock4 size={12} />
      <div>
        {t("integrations.edrEstimatedSetupTime")}
        <span className={"font-medium"}>
          {" "}
          {t("integrations.edrSetupDuration", { duration: minutes })}
        </span>
      </div>
    </div>
  );
};
