import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { Callout } from "@components/Callout";
import React from "react";
import { CustomDomainSelector } from "./CustomDomainSelector";
import { isNetBirdHosted } from "@utils/netbird";
import InlineLink from "@components/InlineLink";

type Props = {
  subdomain: string;
  onSubdomainChange: (value: string) => void;
  baseDomain: string;
  onBaseDomainChange: (value: string) => void;
  domainAlreadyExists: boolean;
  subdomainRequired?: boolean;
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
  subdomainRequired = false,
  clusterOffline,
}: Readonly<Props>) {
  return (
    <div>
      <Label>Domain</Label>
      <HelpText>
        {subdomainRequired
          ? "Enter a subdomain and select a domain for your service."
          : "Optionally enter a subdomain, or use the domain directly."}
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
            placeholder={subdomainRequired ? "myapp" : "myapp (optional)"}
            className="!rounded-r-none !border-r-0"
          />
        </div>
        <div className="flex-1 min-w-0">
          <CustomDomainSelector
            value={baseDomain}
            onChange={onBaseDomainChange}
            className="!rounded-l-none"
          />
        </div>
      </div>

      {clusterOffline &&
        (isNetBirdHosted() ? (
          <Callout variant={"warning"} className={"mt-3"}>
            Cluster {clusterOffline.clusterName} is offline. Please try again in
            a few minutes. If the issue persists, check{" "}
            <InlineLink href={"https://status.netbird.io/"} target={"_blank"}>
              NetBird Status
            </InlineLink>{" "}
            or reach out to{"  "}
            <InlineLink href={"mailto:support@netbird.io"}>
              support@netbird.io
            </InlineLink>
          </Callout>
        ) : (
          <Callout variant={"error"} className={"mt-3"}>
            Cluster {clusterOffline.clusterName} is offline. Make sure the proxy
            server is running and connected to the right management address.
          </Callout>
        ))}
    </div>
  );
}
