import Badge from "@components/Badge";
import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { cn } from "@utils/helpers";
import { ArrowUpRightSquareIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
import { Policy } from "@/interfaces/Policy";
import { PostureCheck } from "@/interfaces/PostureCheck";

type Props = {
  check: PostureCheck;
};
export const PostureCheckPolicyUsageCell = ({ check }: Props) => {
  const router = useRouter();

  return (
    <div className={cn("flex gap-4")}>
      <Badge
        variant={"gray"}
        className={cn(
          "min-w-[110px] font-medium cursor-pointer",
          check.policies &&
            check.policies.length == 0 &&
            "opacity-30 pointer-events-none",
        )}
      >
        <AccessControlIcon size={12} />
        <span>
          <span className={"font-bold"}>
            {check.policies && check.policies?.length > 0
              ? check.policies && check.policies?.length
              : ""}
          </span>{" "}
          {check.policies && check.policies?.length == 0
            ? "No Policies"
            : check.policies && check.policies?.length > 1
            ? "Policies"
            : "Policy"}
        </span>
      </Badge>
      <FullTooltip
        content={
          "Assign postures checks within the Access Control Policies page"
        }
        interactive={false}
      >
        <Button
          size={"xs"}
          variant={"secondary"}
          className={"min-w-[130px]"}
          onClick={() => router.push("/access-control")}
        >
          <>
            <ArrowUpRightSquareIcon size={12} />
            Go to Policies
          </>
        </Button>
      </FullTooltip>
    </div>
  );
};
