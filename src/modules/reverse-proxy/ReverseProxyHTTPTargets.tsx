import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import HelpText from "@components/HelpText";
import { InlineButtonLink } from "@components/InlineLink";
import { Label } from "@components/Label";
import { ToggleSwitch } from "@components/ToggleSwitch";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Edit,
  MinusCircleIcon,
  MoreVertical,
  PlusIcon,
} from "lucide-react";
import { Callout } from "@components/Callout";
import React from "react";
import { Network } from "@/interfaces/Network";
import { ReverseProxyTarget } from "@/interfaces/ReverseProxy";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { cn } from "@utils/helpers";

type Props = {
  targets: ReverseProxyTarget[];
  onEditTarget: (index: number) => void;
  onRemoveTarget: (index: number) => void;
  onToggleTargetEnabled: (index: number) => void;
  onAddTarget: () => void;
  initialNetwork?: Network;
  onNavigateToResources?: () => void;
};

export default function ReverseProxyHTTPTargets({
  targets,
  onEditTarget,
  onRemoveTarget,
  onToggleTargetEnabled,
  onAddTarget,
  initialNetwork,
  onNavigateToResources,
}: Readonly<Props>) {
  return (
    <div>
      <Label>HTTPS Targets</Label>
      <HelpText>
        Add one or more devices running your service or resources to make it
        publicly accessible.
      </HelpText>

      {targets.length > 0 && (
        <div
          className={
            "mt-3 mb-3 overflow-hidden border border-nb-gray-900 bg-nb-gray-920/30 py-1 px-1 rounded-md "
          }
        >
          <table className="w-full">
            <tbody>
              {targets.map((target, index) => (
                <tr
                  key={index}
                  onClick={() => onEditTarget(index)}
                  className="rounded-md hover:bg-nb-gray-900/30 cursor-pointer transition-all"
                >
                  <td className="py-2.5 pl-5 pr-2 align-middle">
                    <span className="text-[11px] leading-none font-mono px-2.5 py-2 rounded bg-nb-gray-900 text-nb-gray-300 inline-flex items-center">
                      {target.path
                        ? target.path.startsWith("/")
                          ? target.path
                          : `/${target.path}`
                        : "/"}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 align-middle">
                    <ArrowRight size={12} className="text-nb-gray-400" />
                  </td>
                  <td className="py-2.5 pr-2 align-middle">
                    <TargetDestination target={target} />
                  </td>
                  <td className="py-2.5 pl-2 pr-4">
                    <div
                      className="flex items-center gap-2 justify-end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ToggleSwitch
                        size="small"
                        checked={target.enabled}
                        onCheckedChange={() => onToggleTargetEnabled(index)}
                      />
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="default-outline" className="!px-3">
                            <MoreVertical size={16} className="shrink-0" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          className="w-auto min-w-[200px]"
                          align="end"
                        >
                          <DropdownMenuItem onClick={() => onEditTarget(index)}>
                            <div className="flex gap-3 items-center">
                              <Edit size={14} className="shrink-0" />
                              Edit Target
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant={"danger"}
                            onClick={() => onRemoveTarget(index)}
                          >
                            <div className="flex gap-3 items-center">
                              <MinusCircleIcon size={14} className="shrink-0" />
                              Remove Target
                            </div>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Button
        variant="dotted"
        className={cn("w-full mt-1", targets?.length > 0 && "mt-1")}
        size="sm"
        onClick={onAddTarget}
        disabled={!!(initialNetwork && !initialNetwork.resources?.length)}
      >
        <PlusIcon size={14} />
        Add Target
      </Button>

      {initialNetwork && !initialNetwork.resources?.length && (
        <Callout
          variant="warning"
          className="mt-3"
          icon={
            <AlertTriangle size={14} className="shrink-0 relative top-[3px]" />
          }
        >
          There are currently no resources in your network{" "}
          <span className={"text-netbird-100 font-medium"}>
            {initialNetwork?.name}
          </span>
          . Add resources to your network before exposing it as a service.{" "}
          <InlineButtonLink variant={"default"} onClick={onNavigateToResources}>
            Go to Resources
            <ArrowUpRight size={14} />
          </InlineButtonLink>
        </Callout>
      )}
    </div>
  );
}

function TargetDestination({ target }: { target: ReverseProxyTarget }) {
  const { resolveDestination } = useReverseProxies();
  return (
    <span className="text-[0.76rem] text-nb-gray-200 whitespace-nowrap font-mono">
      {resolveDestination(target)}
    </span>
  );
}
