import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/Tooltip";
import dayjs from "dayjs";
import { History } from "lucide-react";
import { formatDateTooltip, formatRelativeDate } from "@/i18n/date-time";
import { useDashboardLocale } from "@/i18n/LocaleProvider";
import type { MessageId } from "@/i18n/translate";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  date: Date;
  text?: string;
  textId?: MessageId;
  prefix?: string;
};
export default function LastTimeRow({
  date,
  text,
  textId = "tables.lastSeenOn",
  prefix,
}: Props) {
  const { locale, t } = useDashboardLocale();
  const timestamp = dayjs(date);
  const neverUsed =
    !timestamp.isValid() || timestamp.isBefore(dayjs().subtract(2000, "years"));

  return !neverUsed ? (
    <TooltipProvider>
      <Tooltip delayDuration={1}>
        <TooltipTrigger>
          <div
            className={
              "flex items-center whitespace-nowrap gap-2 text-nb-gray-300 dark:text-neutral-300 hover:text-nb-gray-100 dark:hover:text-neutral-100 transition-all hover:bg-nb-gray-800/60 py-2 px-3 rounded-md cursor-default"
            }
          >
            <>
              <History size={14} />
              {prefix && <>{prefix} </>}
              {formatRelativeDate(timestamp.toDate(), locale)}
            </>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className={"text-nb-gray-300 dark:text-neutral-300 flex flex-col gap-1"}>
            <span className={"text-xs"}>{text ?? t(textId)}</span>
            <span className={"text-nb-gray-200 dark:text-neutral-200"}>
              {formatDateTooltip(timestamp.toDate(), locale)}
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    <EmptyRow />
  );
}
