import Badge from "@components/Badge";
import { MonitorSmartphoneIcon } from "lucide-react";
import * as React from "react";

type Props = {
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;
export default function PeerBadge({ children }: Props) {
  return (
    <Badge variant={"gray"} className={"px-3 gap-2 whitespace-nowrap"}>
      <MonitorSmartphoneIcon size={12} />
      {children}
    </Badge>
  );
}
