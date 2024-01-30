import MultipleDomains from "@components/ui/MultipleDomains";
import React from "react";
import { NameserverGroup } from "@/interfaces/Nameserver";

type Props = {
  ns: NameserverGroup;
};
export default function NameserverMatchDomainsCell({ ns }: Props) {
  return (
    <div className={"flex gap-2"}>
      <MultipleDomains domains={ns.domains} />
    </div>
  );
}
