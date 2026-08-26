import { cn } from "@utils/helpers";
import { BriefcaseIcon, Sparkles, UserIcon, UsersIcon } from "lucide-react";
import * as React from "react";

type Props = {
  name: string;
  size?: number;
};
export const PlanIcon = ({ name, size = 40 }: Props) => {
  const tier = name.toLowerCase();

  const isFree = tier.includes("free");
  const isTeam = tier.includes("team");
  const isBusiness = tier.includes("business");
  const isTrial = tier.includes("trial");

  return (
    <div
      className={cn(
        "border shrink-0 flex items-center justify-center rounded-md overflow-hidden",
        isFree &&
          "bg-gradient-to-b from-nb-gray-800 to-nb-gray-600 border-nb-gray-700/70",
        isTrial &&
          "border-nb-gray-900 bg-gradient-to-br from-[#6697FF]/90 to-[#CE8EE3]/90",
        isTeam && "border-nb-gray-900 bg-gradient-to-b from-sky-500 to-sky-300",
        isBusiness &&
          "border-nb-gray-900 bg-gradient-to-b from-netbird to-netbird-300",
      )}
      style={{ width: size, height: size }}
    >
      {isFree && <UserIcon size={16} />}
      {isTrial && <Sparkles size={16} />}
      {isTeam && <UsersIcon size={16} />}
      {isBusiness && <BriefcaseIcon size={16} />}
    </div>
  );
};
