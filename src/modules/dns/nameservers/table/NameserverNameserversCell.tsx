import Badge from "@components/Badge";
import { Server } from "lucide-react";
import React from "react";
import { NameserverGroup } from "@/interfaces/Nameserver";

type Props = {
  ns: NameserverGroup;
};
export default function NameserverNameserversCell({ ns }: Props) {
  return (
    <div className={"flex gap-2"}>
      {ns.nameservers.map((ns) => {
        return (
          <Badge key={ns.ip} variant={"gray"} className={"font-mono "}>
            <Server size={10} className={"mr-1"} />
            {ns.ip}
          </Badge>
        );
      })}
    </div>
  );
}
