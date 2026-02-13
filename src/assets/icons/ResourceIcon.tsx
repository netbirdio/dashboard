import { GlobeIcon, NetworkIcon, WorkflowIcon } from "lucide-react";
import * as React from "react";

type Props = {
  type: "domain" | "host" | "subnet";
  size?: number;
};

export const ResourceIcon = ({ type, size = 15 }: Props) => {
  switch (type) {
    case "domain":
      return <GlobeIcon size={size} />;
    case "subnet":
      return <NetworkIcon size={size} />;
    case "host":
      return <WorkflowIcon size={size} />;
    default:
      return <WorkflowIcon size={size} />;
  }
};
