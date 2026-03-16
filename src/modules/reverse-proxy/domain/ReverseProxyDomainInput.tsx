import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { Callout } from "@components/Callout";
import React from "react";
import { CustomDomainSelector } from "./CustomDomainSelector";

type Props = {
  subdomain: string;
  onSubdomainChange: (value: string) => void;
  baseDomain: string;
  onBaseDomainChange: (value: string) => void;
  domainAlreadyExists: boolean;
  isL4Mode: boolean;
  clusterOffline?: {
    clusterName: string;
  };
};

export default function ReverseProxyDomainInput({
  subdomain,
  onSubdomainChange,
  baseDomain,
  onBaseDomainChange,
  domainAlreadyExists,
  isL4Mode,
  clusterOffline,
}: Readonly<Props>) {
  return (
    <div>
      <Label>Domain</Label>
      <HelpText>
        Enter a subdomain and select a domain for your service.
      </HelpText>
      <div className="flex items-start mt-2">
        <div className="flex-1 min-w-0">
          <Input
            autoFocus
            value={subdomain}
            onChange={(e) => {
              onSubdomainChange(
                e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
              );
            }}
            error={
              domainAlreadyExists
                ? "This domain is already used by another service."
                : undefined
            }
            placeholder={"myapp"}
            className="!rounded-r-none !border-r-0"
          />
        </div>
        <div className="flex-1 min-w-0">
          <CustomDomainSelector
            value={baseDomain}
            onChange={onBaseDomainChange}
            className="!rounded-l-none"
            isL4Mode={isL4Mode}
          />
        </div>
      </div>
      {clusterOffline && (
        <Callout variant={"error"} className={"mt-3"}>
          Cluster {clusterOffline.clusterName} is offline. Make sure the proxy
          server is running and connected to the right management address.
        </Callout>
      )}
    </div>
  );
}
