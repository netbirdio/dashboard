import { cn } from "@utils/helpers";
import { ChevronDown, ChevronRightIcon, LockIcon } from "lucide-react";
import * as React from "react";
import { ReverseProxy, isL4Mode } from "@/interfaces/ReverseProxy";
import ExternalLinkText from "@components/ExternalLinkText";

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
  const isEnabled = enabled ?? reverseProxy?.enabled ?? false;
  const hasExpandableTargets =
    (reverseProxy?.targets?.length ?? 0) > 0 &&
    !isL4Mode(reverseProxy?.mode);

  return (
    <div
      className={cn(
        "flex items-center",
        showChevron
          ? "gap-6 min-w-[270px] max-w-[270px]"
          : "gap-2.5 min-w-[200px]",
      )}
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
      <div className={"flex items-center gap-2.5"}>
        <LockIcon
          size={14}
          className={cn(
            "shrink-0",
            isEnabled ? "text-green-500" : "text-nb-gray-400",
          )}
        />
        <div className="flex flex-col gap-0 dark:text-neutral-300 text-neutral-500 truncate">
          <div className="flex items-center gap-2">
            {displayDomain ? (
              <ExternalLinkText href={`https://${displayDomain}${portSuffix}`}>
                <span className="font-medium truncate">
                  {displayDomain}
                  {portSuffix}
                </span>
              </ExternalLinkText>
            ) : (
              <span className="font-medium truncate">{displayDomain}</span>
            )}
            {reverseProxy?.mode && isL4Mode(reverseProxy.mode) ? (
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded uppercase leading-none bg-green-500/10 text-green-400 border border-green-500/20">
                {reverseProxy.mode.toUpperCase()}
              </span>
            ) : reverseProxy && (
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded uppercase leading-none bg-sky-500/10 text-sky-400 border border-sky-500/20">
                HTTP
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
