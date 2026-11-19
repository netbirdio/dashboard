import Badge from "@components/Badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@components/Tooltip";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "@/i18n/LocaleProvider";

type Props = {
  loginExpired: boolean;
};
export default function LoginExpiredBadge({ loginExpired }: Props) {
  const t = useTranslations();
  return loginExpired ? (
    <Tooltip delayDuration={1}>
      <TooltipTrigger>
        <Badge variant={"red"} className={"px-2"}>
          <AlertTriangle size={12} />
          {t("components.loginRequired")}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className={"text-nb-gray-300 dark:text-neutral-300 text-xs"}>
          {t("components.loginExpiredHelp")}
        </div>
      </TooltipContent>
    </Tooltip>
  ) : null;
}
