import * as React from "react";
import FullTooltip from "@components/FullTooltip";

type Props = {
  content: React.ReactNode;
  children: React.ReactNode;
  interactive?: boolean;
};
export const HelpTooltip = ({
  content,
  children,
  interactive = true,
}: Props) => {
  return (
    <>
      <FullTooltip
        interactive={interactive}
        side={"top"}
        align={"start"}
        alignOffset={0}
        className={
          "inline underline decoration-dashed underline-offset-[3px] decoration-nb-gray-300 cursor-help transition-all hover:decoration-white"
        }
        content={content}
      >
        {children}
      </FullTooltip>
    </>
  );
};
