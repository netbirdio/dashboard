import * as React from "react";
import { PostureCheck } from "@/interfaces/PostureCheck";

type Props = {
  check: PostureCheck;
};
export const PostureCheckNameCell = ({ check }: Props) => {
  return (
    <div className={"flex items-center gap-4 min-w-[350px]"}>
      <div className={"flex flex-col gap-0.5 min-w-0 max-w-[300px]"}>
        <div className={"text-sm text-nb-gray-100 truncate"}>{check.name}</div>
        <div className={"text-xs text-nb-gray-400 truncate "}>
          {check.description}
        </div>
      </div>
    </div>
  );
};
