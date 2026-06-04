import { cn } from "@utils/helpers";
import { ChevronDown, ChevronRightIcon } from "lucide-react";
import * as React from "react";
import { isL4Mode, ReverseProxy, ServiceMode } from "@/interfaces/ReverseProxy";
import ExternalLinkText from "@components/ExternalLinkText";
import CopyToClipboardText from "@components/CopyToClipboardText";
import ReverseProxyClusterCell from "@/modules/reverse-proxy/table/ReverseProxyClusterCell";
import ReverseProxyStatusCell from "@/modules/reverse-proxy/table/ReverseProxyStatusCell";

type Props = {
  reverseProxy?: ReverseProxy;
  domain?: string;
  enabled?: boolean;
  showChevron?: boolean;
};

export default function ReverseProxyNameCell({
  reverseProxy,
  domain,
  enabled,
  showChevron = true,
}: Readonly<Props>) {
  const displayDomain = domain ?? reverseProxy?.domain ?? "";
  const isL4 = reverseProxy?.mode && isL4Mode(reverseProxy.mode);
  const portSuffix =
    isL4 && reverseProxy?.listen_port ? `:${reverseProxy.listen_port}` : "";
  const isLinkable = !isL4 || reverseProxy?.mode === ServiceMode.TLS;
  const isEnabled = enabled ?? reverseProxy?.enabled ?? false;
  const hasExpandableTargets =
    (reverseProxy?.targets?.length ?? 0) > 0 && !isL4Mode(reverseProxy?.mode);

  const domainNode = displayDomain ? (
    isLinkable ? (
      <ExternalLinkText href={`https://${displayDomain}${portSuffix}`}>
        <span className="font-medium truncate">
          {displayDomain}
          {portSuffix}
        </span>
      </ExternalLinkText>
    ) : (
      <CopyToClipboardText>
        {displayDomain}
        {portSuffix}
      </CopyToClipboardText>
    )
  ) : null;

  return (
    <div
      className={cn(
        "flex items-center",
        showChevron
          ? "gap-6 min-w-[270px] max-w-[270px]"
          : "gap-2.5 min-w-[200px]",
      )}
      data-name-cell
    >
      {showChevron && (
        <>
          <ChevronRightIcon
            size={20}
            className={cn(
              "group-data-[accordion=opened]/accordion:hidden text-nb-gray-400 shrink-0",
              !hasExpandableTargets && "cursor-default opacity-0",
            )}
          />
          <ChevronDown
            size={20}
            className={cn(
              "group-data-[accordion=closed]/accordion:hidden text-nb-gray-400 shrink-0",
              !hasExpandableTargets && "cursor-default opacity-0",
            )}
          />
        </>
      )}
      <div
        className={
          "gap-3 dark:text-neutral-300 text-neutral-500 min-w-0 flex"
        }
      >
        <div className={"flex flex-col min-w-0"}>
          <div className={"font-medium flex gap-2 items-center justify-start"}>
            {domainNode}
          </div>
          {reverseProxy && (
            <div className={"text-nb-gray-400 font-light truncate"}>
              {reverseProxy.id ? (
                <ReverseProxyStatusCell
                  serviceId={reverseProxy.id}
                  meta={reverseProxy.meta}
                  enabled={reverseProxy.enabled}
                  isL4={isL4Mode(reverseProxy.mode)}
                  compact={true}
                  readyFallback={
                    <ReverseProxyClusterCell
                      reverseProxy={reverseProxy}
                      compact={true}
                    />
                  }
                />
              ) : (
                <ReverseProxyClusterCell
                  reverseProxy={reverseProxy}
                  compact={true}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
