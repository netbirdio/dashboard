import Badge from "@components/Badge";
import { LockOpen, ShieldX } from "lucide-react";
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
  if (!action || action === TargetAccessAction.INHERIT) return null;

  if (action === TargetAccessAction.BYPASS) {
    return (
      <Badge
        variant={"yellow"}
        size={"xs"}
        data-testid={"target-access-action-badge"}
      >
        <LockOpen size={11} />
        Bypass Auth
      </Badge>
    );
  }

  if (action === TargetAccessAction.BLOCK) {
    return (
      <Badge
        variant={"red"}
        size={"xs"}
        data-testid={"target-access-action-badge"}
      >
        <ShieldX size={11} />
        Blocked
      </Badge>
    );
  }

  return (
    <Badge
      variant={"yellow"}
      size={"xs"}
      data-testid={"target-access-action-badge"}
    >
      Custom Access
    </Badge>
  );
}
