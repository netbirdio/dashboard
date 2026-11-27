import Button from "@components/Button";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { PeerSelector } from "@components/PeerSelector";
import { ToggleSwitch } from "@components/ToggleSwitch";
import { MiniTable, MiniTableHead } from "@components/ui/MiniTable";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { cn } from "@utils/helpers";
import { ArrowDownWideNarrow, PlusIcon, Trash2 } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import RoundedFlag from "@/assets/countries/RoundedFlag";
import CircleIcon from "@/assets/icons/CircleIcon";
import { useCountries } from "@/contexts/CountryProvider";
import {
  EXIT_NODE_MAX_METRIC,
  EXIT_NODE_MIN_METRIC,
} from "@/interfaces/ExitNode";
import { Peer } from "@/interfaces/Peer";
import {
  getNextMetric,
  isValidMetric,
} from "@/modules/exit-nodes/exitNodeHelpers";

/** A peer of the exit node being edited; the metric is the raw input. */
export type DraftExitNodePeer = {
  peer_id: string;
  metric: string;
  enabled: boolean;
};

type Props = {
  value: DraftExitNodePeer[];
  onChange: (peers: DraftExitNodePeer[]) => void;
  peers?: Peer[];
  // Peer id → name of the other exit node that already uses it.
  usedPeers: Map<string, string>;
  openPeerSelector?: boolean;
};

export default function ExitNodePeersTab({
  value,
  onChange,
  peers,
  usedPeers,
  openPeerSelector = false,
}: Readonly<Props>) {
  const { countries } = useCountries();

  const location = (peer?: Peer) => {
    if (!peer?.country_code) return "";
    const code = peer.country_code.toUpperCase();
    const country =
      countries?.find((c) => c.country_code === code)?.country_name ?? code;
    return [peer.city_name, country].filter(Boolean).join(", ");
  };

  const update = (peerId: string, changes: Partial<DraftExitNodePeer>) =>
    onChange(
      value.map((p) => (p.peer_id === peerId ? { ...p, ...changes } : p)),
    );

  const addPeer = (peer?: Peer) => {
    if (!peer?.id || value.some((p) => p.peer_id === peer.id)) return;
    onChange([
      ...value,
      {
        peer_id: peer.id,
        metric: String(
          getNextMetric(value.map((p) => ({ metric: Number(p.metric) || 0 }))),
        ),
        enabled: true,
      },
    ]);
  };

  const unavailablePeerIds = useMemo(
    () => [...usedPeers.keys(), ...value.map((p) => p.peer_id)],
    [usedPeers, value],
  );

  return (
    <div className={"px-8 flex-col flex gap-6"}>
      <div>
        <Label>Peers</Label>
        <HelpText>
          Assign one or more peers that route internet traffic. When you add
          multiple peers, NetBird enables high availability for this exit node.
        </HelpText>

        {value.length > 0 && (
          <MiniTable aria-label={"Exit node peers"}>
            <thead>
              <tr>
                <MiniTableHead className={"px-4"}>Peer</MiniTableHead>
                <MiniTableHead className={"pl-2 pr-4"}>Metric</MiniTableHead>
                <MiniTableHead className={"px-4"}>Active</MiniTableHead>
                <MiniTableHead className={"pr-4 pl-2"} />
              </tr>
            </thead>
            <tbody>
              {value.map((entry) => {
                const peer = peers?.find((p) => p.id === entry.peer_id);
                const name = peer?.name ?? entry.peer_id;
                const metricValid = isValidMetric(entry.metric);
                return (
                  <tr key={entry.peer_id} data-testid={"exit-node-peer-row"}>
                    <td className={"py-2.5 px-4 align-middle"}>
                      <div
                        className={cn(
                          "flex flex-col min-w-0 transition-all",
                          !entry.enabled && "opacity-40",
                        )}
                      >
                        {/* The dot centres on the name line, so it lines up
                            with or without the location below. */}
                        <div className={"flex items-center gap-2 min-w-0"}>
                          <CircleIcon
                            size={8}
                            active={!!peer?.connected}
                            className={"shrink-0"}
                          />
                          <span
                            className={
                              "text-[13px] leading-normal font-medium text-nb-gray-300 whitespace-nowrap min-w-0"
                            }
                          >
                            <TextWithTooltip text={name} maxChars={28} />
                          </span>
                        </div>
                        {peer?.country_code && (
                          // Indented by the dot and the gap, under the name.
                          <span
                            className={
                              "flex items-center gap-1.5 pl-4 text-xs font-light text-nb-gray-400 whitespace-nowrap"
                            }
                          >
                            <RoundedFlag
                              country={peer.country_code}
                              size={10}
                            />
                            {location(peer)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={"py-2 pl-2 pr-4 align-middle w-[170px]"}>
                      <Input
                        min={EXIT_NODE_MIN_METRIC}
                        max={EXIT_NODE_MAX_METRIC}
                        type={"number"}
                        value={entry.metric}
                        aria-label={`Metric for ${name}`}
                        data-testid={"exit-node-peer-metric"}
                        errorTooltip={true}
                        error={
                          metricValid
                            ? undefined
                            : `Metric must be between ${EXIT_NODE_MIN_METRIC} and ${EXIT_NODE_MAX_METRIC}`
                        }
                        onChange={(e) =>
                          update(entry.peer_id, { metric: e.target.value })
                        }
                        customPrefix={
                          <ArrowDownWideNarrow
                            size={16}
                            className={"text-nb-gray-300"}
                          />
                        }
                      />
                    </td>
                    <td className={"py-2 px-4 align-middle"}>
                      <ToggleSwitch
                        checked={entry.enabled}
                        size={"small"}
                        onClick={() =>
                          update(entry.peer_id, { enabled: !entry.enabled })
                        }
                        aria-label={`Use ${name}`}
                      />
                    </td>
                    <td className={"py-2 pl-2 pr-3 align-middle"}>
                      <div className={"flex justify-end"}>
                        <Button
                          variant={"danger-menu"}
                          size={"menu"}
                          aria-label={`Remove ${name}`}
                          onClick={() =>
                            onChange(
                              value.filter((p) => p.peer_id !== entry.peer_id),
                            )
                          }
                        >
                          <div className={"flex gap-3 items-center"}>
                            <Trash2 size={14} className={"shrink-0"} />
                            Remove
                          </div>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </MiniTable>
        )}

        <PeerSelector
          onChange={addPeer}
          // Disabled rather than excluded: PeerSelector applies exclusions
          // only once, so a peer removed here would not come back.
          disabledPeers={unavailablePeerIds}
          disabledPeerReason={
            "This peer is already part of an exit node and cannot be assigned again."
          }
          defaultOpen={openPeerSelector}
          trigger={
            <Button
              variant="dotted"
              className={"w-full mt-1"}
              size="sm"
              data-testid="exit-node-add-peer"
              // The click has to reach the popover trigger around it.
              stopPropagation={false}
            >
              <PlusIcon size={14} />
              Add Peer
            </Button>
          }
        />
      </div>
    </div>
  );
}
