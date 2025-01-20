import * as React from "react";

type Props = {
  text?: string;
};
export const NewBadge = ({ text = "NEW" }: Props) => {
  return (
    <span
      className={
        "text-[7px] relative top-[.25px] leading-[0] bg-green-900 border border-green-500/20 py-1.5 px-1 rounded-[3px] text-green-400"
      }
    >
      {text}
    </span>
  );
};
