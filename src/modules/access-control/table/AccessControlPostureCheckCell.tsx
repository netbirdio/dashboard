import Badge from "@components/Badge";
import { IconCirclePlus } from "@tabler/icons-react";
import { HelpCircle, ShieldCheck } from "lucide-react";
import React from "react";
import { Policy } from "@/interfaces/Policy";

type Props = {
  policy: Policy;
};
export default function AccessControlPostureCheckCell({ policy }: Props) {
  return policy.source_posture_checks.length > 0 ? (
    <div className={"flex"}>
      <Badge variant={"green"} useHover={true}>
        <ShieldCheck size={14} />
        {policy.source_posture_checks.length} Check(s)
        <HelpCircle size={12} />
      </Badge>
    </div>
  ) : (
    <div className={"flex"}>
      <Badge variant={"gray"} useHover={true}>
        <IconCirclePlus size={14} />
        Add Check
      </Badge>
    </div>
  );
}
