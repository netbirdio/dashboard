import { IconRepeat } from "@tabler/icons-react";
import { Repeat1 } from "lucide-react";
import { useTranslations } from "@/i18n/LocaleProvider";

type Props = {
  current: number;
  limit: number;
  reusable: boolean;
};
export default function SetupKeyUsageCell({ current, limit, reusable }: Props) {
  const t = useTranslations();
  return reusable ? (
    <div className={"flex items-center text-[13px] text-nb-gray-300 gap-2"}>
      <IconRepeat size={14} className={"text-green-400"} />
      <span>
        <span className={"font-medium text-nb-gray-200"}> {current} </span> of{" "}
        {limit == 0 ? <>{t("setupKeys.unlimited")}</> : limit}{" " + t("common.peers")}
      </span>
    </div>
  ) : (
    <div className={"flex items-center text-[13px] text-nb-gray-300 gap-2"}>
      <Repeat1 size={14} />{" " + t("setupKeys.oneOff")}
    </div>
  );
}
