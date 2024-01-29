import DescriptionWithTooltip from "@components/ui/DescriptionWithTooltip";
import { ChevronDown, ChevronRightIcon } from "lucide-react";
import { GroupedRoute } from "@/interfaces/Route";
import ActiveInactiveRow from "@/modules/common-table-rows/ActiveInactiveRow";

type Props = {
  groupedRoute: GroupedRoute;
};
export default function GroupedRouteNameCell({ groupedRoute }: Props) {
  return (
    <div className={"flex gap-6 items-center min-w-[270px] max-w-[270px]"}>
      <ChevronRightIcon
        size={20}
        className={
          "group-data-[accordion=opened]/accordion:hidden text-nb-gray-400 shrink-0"
        }
      />
      <ChevronDown
        size={20}
        className={
          "group-data-[accordion=closed]/accordion:hidden text-nb-gray-400 shrink-0"
        }
      />
      <ActiveInactiveRow
        active={groupedRoute.enabled}
        inactiveDot={"gray"}
        text={groupedRoute.network_id}
      >
        <DescriptionWithTooltip
          className={"mt-1"}
          text={groupedRoute.description}
        />
      </ActiveInactiveRow>
    </div>
  );
}
