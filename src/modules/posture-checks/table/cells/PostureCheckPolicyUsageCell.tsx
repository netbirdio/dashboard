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
      <FullTooltip
        disabled={!(check.policies && check.policies?.length > 0)}
        content={
          <div className={"text-xs max-w-lg"}>
            <span className={"font-medium text-nb-gray-100 text-sm"}>
              Assigned
              {check.policies && check.policies?.length > 1
                ? " Policies"
                : " Policy"}
            </span>
            <div className={"flex gap-2 pt-3 pb-2 flex-wrap"}>
              {check.policies &&
                check.policies?.length > 0 &&
                check.policies?.map((policy: Policy, index: number) => {
                  return (
                    <Badge
                      variant={"gray-ghost"}
                      useHover={false}
                      key={index}
                      className={"justify-start font-medium"}
                    >
                      <AccessControlIcon size={12} />
                      {policy.name}
                    </Badge>
                  );
                })}
            </div>
          </div>
        }
        interactive={false}
      >
        <Badge
          variant={"gray"}
          useHover={!!(check.policies && check.policies?.length > 0)}
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
      </FullTooltip>
      <FullTooltip
        content={
          <div className={"text-xs max-w-[260px]"}>
            To assign this posture check to your policies, visit the Policies
            page.
          </div>
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
