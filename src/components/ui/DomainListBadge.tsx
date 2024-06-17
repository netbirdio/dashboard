import Badge from "@components/Badge";
import FullTooltip from "@components/FullTooltip";
import { GlobeIcon } from "lucide-react";
import * as React from "react";

type Props = {
  domains: string[];
};
export const DomainListBadge = ({ domains }: Props) => {
  const firstDomain = domains.length > 0 ? domains[0] : undefined;

  return (
    <DomainsTooltip domains={domains}>
      <div className={"inline-flex items-center gap-2"}>
        {firstDomain && (
          <Badge variant={"gray"}>
            <GlobeIcon size={10} />
            {firstDomain}
          </Badge>
        )}
        {domains && domains.length > 1 && (
          <Badge variant={"gray"}>+ {domains.length - 1}</Badge>
        )}
      </div>
    </DomainsTooltip>
  );
};

export const DomainsTooltip = ({
  domains,
  children,
  className,
}: {
  domains: string[];
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <FullTooltip
      interactive={false}
      className={className}
      content={
        <div className={"flex flex-col gap-2 items-start"}>
          {domains.map((domain) => {
            return (
              domain && (
                <div
                  key={domain}
                  className={"flex gap-2 items-center justify-between w-full"}
                >
                  <div
                    className={
                      "flex gap-2 items-center text-nb-gray-300 text-xs"
                    }
                  >
                    <GlobeIcon size={11} />
                    {domain}
                  </div>
                </div>
              )
            );
          })}
        </div>
      }
      disabled={domains.length <= 1}
    >
      {children}
    </FullTooltip>
  );
};
