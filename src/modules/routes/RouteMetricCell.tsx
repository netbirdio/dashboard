import { useTranslations } from "next-intl";
import FullTooltip from "@components/FullTooltip";
import { ArrowUpDown, InfoIcon } from "lucide-react";

type Props = {
  metric?: number;
  useHoverStyle?: boolean;
};
export default function RouteMetricCell({
  metric,
  useHoverStyle = true,
}: Readonly<Props>) {
  const t = useTranslations("common");
  return (
    <FullTooltip
      hoverButton={useHoverStyle}
      isAction={true}
      content={
        <div className={"text-xs max-w-xs flex gap-2 items-center"}>
          <div>{t("metricPriority")}</div>
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
