import Badge from "@components/Badge";
import { NetworkIcon, WorkflowIcon } from "lucide-react";
import * as React from "react";

type Props = {
  single: boolean;
};
export default function ResourceTypeCell({ single }: Props) {
  return (
    <div className={"inline-flex"}>
      {single ? (
        <Badge variant={"gray"} className={"min-w-[130px]"}>
          <WorkflowIcon size={14} /> Single IP
        </Badge>
      ) : (
        <Badge variant={"gray"} className={"min-w-[130px]"}>
          <NetworkIcon size={14} /> IP Range
        </Badge>
      )}
    </div>
  );
}
