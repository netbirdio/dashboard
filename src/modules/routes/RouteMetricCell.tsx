import FullTooltip from "@components/FullTooltip";
import { ArrowUpDown, InfoIcon } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  metric?: number;
  useHoverStyle?: boolean;
};
export default function RouteMetricCell({
  metric,
  useHoverStyle = true,
}: Readonly<Props>) {
  const { t } = useI18n();
  return (
    <FullTooltip
      hoverButton={useHoverStyle}
      isAction={true}
      content={
        <div className={"text-xs max-w-xs flex gap-2 items-center"}>
          <div>{t("routeMetric.priorityHelp")}</div>
        </div>
      }
    >
      <div className={"flex gap-2 items-center dark:text-nb-gray-300"}>
        <ArrowUpDown size={14} className={""} />
        {metric}
        <InfoIcon size={14} className={"text-nb-gray-500"} />
      </div>
    </FullTooltip>
  );
}
