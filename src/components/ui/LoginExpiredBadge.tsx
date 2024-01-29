import Badge from "@components/Badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@components/Tooltip";
import { AlertTriangle } from "lucide-react";

type Props = {
  loginExpired: boolean;
};
export default function LoginExpiredBadge({ loginExpired }: Props) {
  return loginExpired ? (
    <Tooltip delayDuration={1}>
      <TooltipTrigger>
        <Badge variant={"red"} className={"px-3"}>
          <AlertTriangle size={14} className={"mr-1"} />
          Login required
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className={"text-neutral-300 text-xs leading-1.5"}>
          This peer is offline and needs to be <br />
          re-authenticated because its login has expired.
        </div>
      </TooltipContent>
    </Tooltip>
  ) : null;
}
