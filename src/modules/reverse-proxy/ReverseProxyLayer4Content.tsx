import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { ArrowRight } from "lucide-react";
import React, { useRef } from "react";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import ReverseProxyAddressInput, {
  CidrHelpText,
} from "@/modules/reverse-proxy/targets/ReverseProxyAddressInput";
import ReverseProxyTargetSelector, {
  type Target,
} from "@/modules/reverse-proxy/targets/ReverseProxyTargetSelector";
import { HelpTooltip } from "@components/HelpTooltip";

type Props = {
  l4Target: Target | undefined;
  setL4Target: React.Dispatch<React.SetStateAction<Target | undefined>>;
  isListenPortSupported: boolean;
  listenPort: number;
  setListenPort: (port: number) => void;
  port: number;
  setPort: (port: number) => void;
  initialResource?: NetworkResource;
  initialPeer?: Peer;
  initialNetwork?: Network;
};

export default function ReverseProxyLayer4Content({
  l4Target,
  setL4Target,
  isListenPortSupported,
  listenPort,
  setListenPort,
  port,
  setPort,
  initialResource,
  initialPeer,
  initialNetwork,
}: Readonly<Props>) {
  const listenPortRef = useRef<HTMLInputElement>(null);
  const portRef = useRef<HTMLInputElement>(null);

  return (
    <div className={"-mt-1 flex flex-col gap-8"}>
      {!initialResource && !initialPeer && (
        <ReverseProxyTargetSelector
          value={l4Target}
          initialNetwork={initialNetwork}
          onChange={(selection) => {
            setL4Target(selection);
            if (selection) {
              setTimeout(() => {
                if (isListenPortSupported) {
                  listenPortRef.current?.focus();
                } else {
                  portRef.current?.focus();
                }
              }, 0);
            }
          }}
        />
      )}

      <div className={"flex gap-4 items-center"}>
        <div className={"w-full max-w-[180px]"}>
          <Label>
            Listen Port
            <HelpTooltip
              className={isListenPortSupported ? "max-w-sm" : "max-w-xs"}
              content={
                isListenPortSupported
                  ? "Enter the public listen port this service will be reachable on."
                  : "The listen port will be automatically assigned after the service is created."
              }
            />
          </Label>
          <div className={"mt-2"}>
            <Input
              ref={listenPortRef}
              type="number"
              min={1}
              max={65535}
              placeholder={!isListenPortSupported ? "Auto" : "443"}
              value={!isListenPortSupported ? "" : listenPort || ""}
              onChange={(e) => setListenPort(parseInt(e.target.value) || 0)}
              disabled={!isListenPortSupported || !l4Target}
              aria-label="Public listen port"
            />
          </div>
        </div>
        <ArrowRight size={16} className="text-nb-gray-400 shrink-0 mt-6" />
        <div className={"w-full flex"}>
          <div className={"w-full"}>
            <Label>
              Host / IP
              <CidrHelpText target={l4Target} />
            </Label>
            <div className="flex w-full mt-2 relative">
              <ReverseProxyAddressInput
                value={l4Target}
                onChange={setL4Target}
              />
            </div>
          </div>
          <div>
            <Label>
              Port
              <HelpTooltip
                content={
                  "Enter the port where your service (e.g., webserver, app, API) is currently listening."
                }
              />
            </Label>
            <div className={"mt-2 min-w-[120px]"}>
              <Input
                ref={portRef}
                type="number"
                min={1}
                max={65535}
                placeholder="443"
                value={port || ""}
                onChange={(e) => setPort(parseInt(e.target.value) || 0)}
                disabled={!l4Target}
                aria-label="Destination port"
                className={"rounded-l-none"}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
