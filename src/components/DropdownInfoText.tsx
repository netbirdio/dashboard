import * as React from "react";

type Props = {
  children: React.ReactNode;
};

export const DropdownInfoText = ({ children }: Props) => {
  return (
    <div className={"text-center pt-2 mb-6 text-nb-gray-400"}>{children}</div>
  );
};
