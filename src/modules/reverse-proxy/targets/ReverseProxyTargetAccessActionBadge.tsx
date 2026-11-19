import Badge from "@components/Badge";
import FullTooltip from "@components/FullTooltip";
import { HelpCircle, LockOpen, ShieldX } from "lucide-react";
import { useTranslations } from "@/i18n/LocaleProvider";
import {
  TargetAccessAction,
  type TargetAccessAction as TargetAccessActionValue,
} from "@/interfaces/ReverseProxy";

type Props = {
  action?: TargetAccessActionValue | string;
};

export default function ReverseProxyTargetAccessActionBadge({
  action,
}: Readonly<Props>) {
  const t = useTranslations();
  if (!action || action === TargetAccessAction.INHERIT) return null;

  const blocked = action === TargetAccessAction.BLOCK;
  const bypass = action === TargetAccessAction.BYPASS;
  const label = bypass
    ? t("reverseProxy.bypassAuthentication")
    : blocked
    ? t("reverseProxy.blockAccess")
    : t("reverseProxy.targetUnsupportedAccessSetting", { value: action });
  const Icon = bypass ? LockOpen : blocked ? ShieldX : HelpCircle;

  return (
    <FullTooltip
      interactive={false}
      alignOffset={0}
      content={<span className={"text-xs"}>{label}</span>}
    >
      <Badge
        variant={"gray"}
        size={"xs"}
        className={"h-6 w-6 shrink-0 p-0"}
        role={"img"}
        aria-label={label}
        tabIndex={0}
        data-testid={"target-access-action-badge"}
      >
        <Icon
          size={12}
          className={blocked ? "text-red-500" : "text-yellow-400"}
          aria-hidden={true}
        />
      </Badge>
    </FullTooltip>
  );
}
