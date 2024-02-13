import { ShieldCheck } from "lucide-react";
import * as React from "react";
import { PostureCheck } from "@/interfaces/PostureCheck";

type Props = {
  check: PostureCheck;
};
export const PostureCheckNameCell = ({ check }: Props) => {
  return (
    <div className={"flex items-center gap-4 min-w-[350px]"}>
      <div
        className={
          "h-8 w-8 bg-nb-gray-920 flex items-center justify-center rounded-md text-nb-gray-200"
        }
      >
        <ShieldCheck size={16} />
      </div>
      <div className={"flex flex-col gap-0.5 min-w-0 max-w-[300px]"}>
        <div className={"text-sm text-nb-gray-100 truncate"}>{check.name}</div>
        <div className={"text-xs text-nb-gray-400 truncate "}>
          {check.description}
        </div>
      </div>
    </div>
  );
};
