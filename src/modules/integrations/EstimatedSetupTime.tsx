import { Clock4 } from "lucide-react";
import * as React from "react";

type Props = {
  minutes?: number;
};
export const EstimatedSetupTime = ({ minutes = 5 }: Props) => {
  return (
    <div
      className={
        "text-center z-0 mt-2.5 text-xs text-nb-gray-300 flex items-center justify-center gap-2 font-normal"
      }
    >
      <Clock4 size={12} />
      <div>
        Estimated setup time:
        <span className={"font-medium"}> {minutes} Minutes</span>
      </div>
    </div>
  );
};
