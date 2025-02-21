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
        <Badge variant={"red"} className={"px-2"}>
          <AlertTriangle size={12} />
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
