import { cn } from "@utils/helpers";
import { ChevronDown, ChevronRightIcon, LockIcon } from "lucide-react";
import * as React from "react";
import { isL4Mode, ReverseProxy, ServiceMode } from "@/interfaces/ReverseProxy";
import ExternalLinkText from "@components/ExternalLinkText";
import CopyToClipboardText from "@components/CopyToClipboardText";

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
            {displayDomain && isLinkable ? (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
