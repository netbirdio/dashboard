import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/Tooltip";
import dayjs from "dayjs";
import { History } from "lucide-react";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  date: Date;
  text?: string;
  prefix?: string;
};
export default function LastTimeRow({
  date,
  text = "Last seen on",
  prefix,
}: Props) {
  const neverUsed = dayjs(date).isBefore(dayjs().subtract(2000, "years"));

  return !neverUsed ? (
    <TooltipProvider>
      <Tooltip delayDuration={1}>
        <TooltipTrigger>
          <div
            className={
              "flex items-center whitespace-nowrap gap-2 dark:text-neutral-300 text-neutral-500 hover:text-neutral-100 transition-all hover:bg-nb-gray-800/60 py-2 px-3 rounded-md cursor-default"
            }
          >
            <>
              <History size={14} />
              {prefix && <>{prefix} </>}
              {dayjs().to(date)}
            </>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className={"text-neutral-300 flex flex-col gap-1"}>
            <span className={"text-xs"}>{text}</span>
            <span className={"text-neutral-200"}>
              {dayjs(date).format("D MMMM, YYYY [at] h:mm A")}
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    <EmptyRow />
  );
}
