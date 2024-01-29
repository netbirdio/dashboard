import { Sparkles } from "lucide-react";
import * as React from "react";

export const AIButton = () => {
  return (
    <div
      className={
        "animated-gradient-bg gap-2 flex items-center justify-center text-sm font-medium p-[2px] rounded-md group"
      }
    >
      <div
        className={
          "flex items-center justify-center w-full h-full gap-2 bg-nb-gray-930/70 px-3 py-2.5 rounded-md"
        }
      >
        <Sparkles size={16} />
        AI Rule Wizard
      </div>
    </div>
  );
};
