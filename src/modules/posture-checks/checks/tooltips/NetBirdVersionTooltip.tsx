import FullTooltip from "@components/FullTooltip";
import { IconMathEqualGreater } from "@tabler/icons-react";
import * as React from "react";

type Props = {
  version?: string;
  children?: React.ReactNode;
};
export const NetBirdVersionTooltip = ({ version, children }: Props) => {
  return version ? (
    <FullTooltip
      className={"w-full"}
      interactive={false}
      content={
        <div className={"text-neutral-300 flex items-center text-sm gap-1"}>
          <span className={""}>Min. Client Version</span>

          <span
            className={"text-netbird font-semibold flex items-center gap-1"}
          >
            <IconMathEqualGreater size={14} />
            {version}
          </span>
        </div>
      }
    >
      {children}
    </FullTooltip>
  ) : (
    children
  );
};
