import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { ArrowRight } from "lucide-react";
import React from "react";
import ReverseProxyAddressInput from "@/modules/reverse-proxy/targets/ReverseProxyAddressInput";
import ReverseProxyTargetSelector, {
  type Target,
} from "@/modules/reverse-proxy/targets/ReverseProxyTargetSelector";
import { HelpTooltip } from "@components/HelpTooltip";

type Props = {
  l4Target: Target | undefined;
  setL4Target: React.Dispatch<React.SetStateAction<Target | undefined>>;
  isListenPortSupported: boolean;
  tlsListenPort: number;
  setTlsListenPort: (port: number) => void;
  tlsPort: number;
  setTlsPort: (port: number) => void;
};

export default function ReverseProxyLayer4Content({
  l4Target,
  setL4Target,
  isListenPortSupported,
  tlsListenPort,
  setTlsListenPort,
  tlsPort,
  setTlsPort,
}: Readonly<Props>) {
  return (
    <div className="flex flex-col gap-8">
      <ReverseProxyTargetSelector
        value={l4Target}
        onChange={(selection) => setL4Target(selection)}
      />

      <div className={"flex gap-4 items-center"}>
        <div className={"w-full max-w-[180px]"}>
          <Label>
            Listen Port
            <HelpTooltip content={"TODO: Add description"} />
          </Label>
          <div className={"mt-2"}>
            <Input
              type="number"
              min={1}
              max={65535}
              placeholder={!isListenPortSupported ? "Auto" : "443"}
              value={!isListenPortSupported ? "" : tlsListenPort || ""}
              onChange={(e) => setTlsListenPort(parseInt(e.target.value) || 0)}
              disabled={!isListenPortSupported}
              aria-label="Public listen port"
            />
          </div>
        </div>
        <ArrowRight size={16} className="text-nb-gray-400 shrink-0 mt-6" />
        <div className={"w-full flex"}>
          <div className={"w-full"}>
            <Label>Host / IP</Label>
            <div className="flex w-full mt-2">
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
                type="number"
                min={1}
                max={65535}
                placeholder="443"
                value={tlsPort || ""}
                onChange={(e) => setTlsPort(parseInt(e.target.value) || 0)}
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
