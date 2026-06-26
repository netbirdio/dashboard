import Badge from "@components/Badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@components/Tooltip";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

type Props = {
  loginExpired: boolean;
};
export default function LoginExpiredBadge({ loginExpired }: Props) {
  const t = useTranslations("peers");

  return loginExpired ? (
    <Tooltip delayDuration={1}>
      <TooltipTrigger>
        <Badge variant={"red"} className={"px-2"}>
          <AlertTriangle size={12} />
          {t("loginRequired")}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className={"text-neutral-300 text-xs leading-1.5"}>
          {t("loginExpiredTooltip")}
        </div>
      </TooltipContent>
    </Tooltip>
  ) : null;
}
