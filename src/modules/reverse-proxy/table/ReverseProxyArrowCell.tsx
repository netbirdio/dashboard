import { cn } from "@utils/helpers";
import { ArrowRight } from "lucide-react";
import * as React from "react";

type Props = {
  disabled?: boolean;
};

export default function ReverseProxyArrowCell({ disabled }: Readonly<Props>) {
  return (
    <ArrowRight
      size={16}
      className={cn("text-nb-gray-300", disabled && "opacity-50")}
    />
  );
}
