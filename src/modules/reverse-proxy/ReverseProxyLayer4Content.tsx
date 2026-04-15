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
import { useI18n } from "@/i18n/I18nProvider";

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
  const { t } = useI18n();
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
            {t("reverseProxy.listenPort")}
            <HelpTooltip
              className={"max-w-sm"}
              content={
                isListenPortSupported
                  ? t("reverseProxy.listenPortHelp")
                  : t("reverseProxy.listenPortAutoHelp")
              }
            />
          </Label>
          <div className={"mt-2"}>
            <Input
              ref={listenPortRef}
              type="number"
              min={1}
              max={65535}
              placeholder={
                !isListenPortSupported
                  ? t("reverseProxy.listenPortAutoPlaceholder")
                  : "443"
              }
              value={!isListenPortSupported ? "" : listenPort || ""}
              onChange={(e) => setListenPort(parseInt(e.target.value) || 0)}
              disabled={!isListenPortSupported || !l4Target}
              aria-label={t("reverseProxy.publicListenPort")}
            />
          </div>
        </div>
        <ArrowRight size={16} className="text-nb-gray-400 shrink-0 mt-6" />
        <div className={"w-full flex"}>
          <div className={"w-full"}>
            <Label>
              {t("reverseProxy.hostIp")}
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
              {t("reverseProxy.destinationPort")}
              <HelpTooltip
                content={t("reverseProxy.destinationPortHelp")}
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
                aria-label={t("reverseProxy.destinationPort")}
                className={"rounded-l-none"}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
