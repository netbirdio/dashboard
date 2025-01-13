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
  return (
    <FullTooltip
      hoverButton={useHoverStyle}
      isAction={true}
      content={
        <div className={"text-xs max-w-xs flex gap-2 items-center"}>
          <div>Lower metrics have higher priority.</div>
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
