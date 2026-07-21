import Button from "@components/Button";
import HelpText from "@components/HelpText";
import { HelpTooltip } from "@components/HelpTooltip";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import React from "react";
import {
  ReverseProxyPortMapping,
  ServiceMode,
} from "@/interfaces/ReverseProxy";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import ReverseProxyAddressInput, {
  CidrHelpText,
} from "@/modules/reverse-proxy/targets/ReverseProxyAddressInput";
import ReverseProxyTargetSelector, {
  type Target,
} from "@/modules/reverse-proxy/targets/ReverseProxyTargetSelector";

type Props = {
  l4Target: Target | undefined;
  setL4Target: React.Dispatch<React.SetStateAction<Target | undefined>>;
  supportsCustomPorts: boolean;
  portMappings: ReverseProxyPortMapping[];
  setPortMappings: React.Dispatch<
    React.SetStateAction<ReverseProxyPortMapping[]>
  >;
  defaultProtocol: ServiceMode.TCP | ServiceMode.UDP | ServiceMode.TLS;
  initialResource?: NetworkResource;
  initialPeer?: Peer;
  initialNetwork?: Network;
};

const mappingProtocols = [ServiceMode.TCP, ServiceMode.UDP, ServiceMode.TLS];

export function emptyPortMapping(
  protocol: ServiceMode.TCP | ServiceMode.UDP | ServiceMode.TLS,
): ReverseProxyPortMapping {
  return {
    protocol,
    listen_port_start: 0,
    listen_port_end: 0,
    target_port_start: 0,
    target_port_end: 0,
  };
}

const isValidPort = (port: number) =>
  Number.isInteger(port) && port >= 1 && port <= 65535;

const listensOnExplicitPort = (
  mapping: ReverseProxyPortMapping,
  supportsCustomPorts: boolean,
) => mapping.protocol === ServiceMode.TLS || supportsCustomPorts;

export function getPortMappingErrors(
  mappings: ReverseProxyPortMapping[],
  supportsCustomPorts: boolean,
): string[][] {
  if (mappings.length === 0) return [["Add at least one port mapping."]];

  const errors = mappings.map(() => [] as string[]);
  mappings.forEach((mapping, index) => {
    const explicitListener = listensOnExplicitPort(
      mapping,
      supportsCustomPorts,
    );
    if (!mappingProtocols.includes(mapping.protocol)) {
      errors[index].push("Select TCP, UDP, or TLS.");
    }
    if (explicitListener) {
      if (
        !isValidPort(mapping.listen_port_start) ||
        !isValidPort(mapping.listen_port_end)
      ) {
        errors[index].push("Listener ports must be between 1 and 65535.");
      } else if (mapping.listen_port_start > mapping.listen_port_end) {
        errors[index].push("The listener range is reversed.");
      }
    } else if (mappings.length > 1) {
      errors[index].push(
        "This cluster only supports one auto-assigned TCP or UDP listener.",
      );
    }

    if (
      !isValidPort(mapping.target_port_start) ||
      !isValidPort(mapping.target_port_end)
    ) {
      errors[index].push("Destination ports must be between 1 and 65535.");
    } else if (mapping.target_port_start > mapping.target_port_end) {
      errors[index].push("The destination range is reversed.");
    }

    if (
      !explicitListener &&
      isValidPort(mapping.target_port_start) &&
      isValidPort(mapping.target_port_end) &&
      mapping.target_port_start !== mapping.target_port_end
    ) {
      errors[index].push(
        "An auto-assigned listener supports one destination port, not a range.",
      );
    }

    if (
      explicitListener &&
      isValidPort(mapping.listen_port_start) &&
      isValidPort(mapping.listen_port_end) &&
      mapping.listen_port_start <= mapping.listen_port_end &&
      isValidPort(mapping.target_port_start) &&
      isValidPort(mapping.target_port_end) &&
      mapping.target_port_start <= mapping.target_port_end &&
      mapping.listen_port_end - mapping.listen_port_start !==
        mapping.target_port_end - mapping.target_port_start
    ) {
      errors[index].push(
        "Listener and destination ranges must contain the same number of ports.",
      );
    }

    for (let otherIndex = 0; otherIndex < index; otherIndex += 1) {
      const other = mappings[otherIndex];
      if (
        mapping.protocol === other.protocol &&
        explicitListener &&
        listensOnExplicitPort(other, supportsCustomPorts) &&
        isValidPort(mapping.listen_port_start) &&
        isValidPort(mapping.listen_port_end) &&
        isValidPort(other.listen_port_start) &&
        isValidPort(other.listen_port_end) &&
        mapping.listen_port_start <= other.listen_port_end &&
        other.listen_port_start <= mapping.listen_port_end
      ) {
        errors[index].push(
          `Listener range overlaps mapping ${
            otherIndex + 1
          } for ${mapping.protocol.toUpperCase()}.`,
        );
      }
    }
  });
  return errors;
}

export default function ReverseProxyLayer4Content({
  l4Target,
  setL4Target,
  supportsCustomPorts,
  portMappings,
  setPortMappings,
  defaultProtocol,
  initialResource,
  initialPeer,
  initialNetwork,
}: Readonly<Props>) {
  const errors = getPortMappingErrors(portMappings, supportsCustomPorts);

  const updateMapping = (
    index: number,
    update: Partial<ReverseProxyPortMapping>,
  ) => {
    setPortMappings((current) =>
      current.map((mapping, mappingIndex) =>
        mappingIndex === index ? { ...mapping, ...update } : mapping,
      ),
    );
  };

  const updateRangeStart = (
    index: number,
    field: "listen" | "target",
    value: number,
  ) => {
    const mapping = portMappings[index];
    const startKey = `${field}_port_start` as const;
    const endKey = `${field}_port_end` as const;
    const followsStart =
      mapping[endKey] === 0 || mapping[endKey] === mapping[startKey];
    updateMapping(index, {
      [startKey]: value,
      ...(followsStart ? { [endKey]: value } : {}),
    });
  };

  const moveMapping = (index: number, offset: -1 | 1) => {
    setPortMappings((current) => {
      const destination = index + offset;
      if (destination < 0 || destination >= current.length) return current;
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  };

  return (
    <div className="-mt-1 flex flex-col gap-8">
      {!initialResource && !initialPeer && (
        <ReverseProxyTargetSelector
          value={l4Target}
          initialNetwork={initialNetwork}
          onChange={setL4Target}
        />
      )}

      <div>
        <Label>
          Target Host / IP
          <CidrHelpText target={l4Target} />
        </Label>
        <div className="mt-2">
          <ReverseProxyAddressInput value={l4Target} onChange={setL4Target} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div>
            <Label>
              Port Mappings
              <HelpTooltip content="Each inclusive public range maps one-to-one onto an equally sized destination range. TCP and UDP may use the same numeric port." />
            </Label>
            <HelpText className="mb-0">
              A hostname may also be used by an HTTPS service for TCP or UDP
              mappings. TLS passthrough cannot share a hostname with an HTTPS
              service. Raw UDP clients still connect by address and port; UDP
              has no hostname routing on the wire.
            </HelpText>
          </div>
          <Button
            variant="secondary"
            size="xs"
            className="self-start shrink-0"
            onClick={() =>
              setPortMappings((current) => [
                ...current,
                emptyPortMapping(defaultProtocol),
              ])
            }
            disabled={!l4Target}
            data-testid="add-port-mapping"
          >
            <Plus size={14} />
            Add Mapping
          </Button>
        </div>

        {portMappings.map((mapping, index) => {
          const listenerSupported = listensOnExplicitPort(
            mapping,
            supportsCustomPorts,
          );
          return (
            <div
              key={`${index}-${mapping.protocol}`}
              className="rounded-md border border-nb-gray-800 bg-nb-gray-920/40 p-3"
              data-testid={`port-mapping-${index}`}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-nb-gray-400">
                  Mapping {index + 1}
                </span>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="default-outline"
                    size="xs"
                    className="px-2"
                    onClick={() => moveMapping(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move mapping ${index + 1} up`}
                  >
                    <ArrowUp size={14} />
                  </Button>
                  <Button
                    variant="default-outline"
                    size="xs"
                    className="px-2"
                    onClick={() => moveMapping(index, 1)}
                    disabled={index === portMappings.length - 1}
                    aria-label={`Move mapping ${index + 1} down`}
                  >
                    <ArrowDown size={14} />
                  </Button>
                  <Button
                    variant="danger-outline"
                    size="xs"
                    className="px-2"
                    onClick={() =>
                      setPortMappings((current) =>
                        current.filter(
                          (_, mappingIndex) => mappingIndex !== index,
                        ),
                      )
                    }
                    disabled={portMappings.length === 1}
                    aria-label={`Remove mapping ${index + 1}`}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)]">
                <div>
                  <Label>Protocol</Label>
                  <Select
                    value={mapping.protocol}
                    onValueChange={(value) =>
                      updateMapping(index, {
                        protocol: value as ReverseProxyPortMapping["protocol"],
                      })
                    }
                  >
                    <SelectTrigger className="mt-2 min-w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mappingProtocols.map((protocol) => (
                        <SelectItem key={protocol} value={protocol}>
                          {protocol.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>
                    Listener Range
                    {!listenerSupported && (
                      <HelpTooltip content="This cluster assigns the single TCP or UDP listener automatically." />
                    )}
                  </Label>
                  <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={65535}
                      placeholder={listenerSupported ? "8080" : "Auto"}
                      value={
                        listenerSupported ? mapping.listen_port_start || "" : ""
                      }
                      onChange={(event) =>
                        updateRangeStart(
                          index,
                          "listen",
                          Number.parseInt(event.target.value, 10) || 0,
                        )
                      }
                      disabled={!listenerSupported || !l4Target}
                      maxWidthClass="w-full min-w-0"
                      aria-label={`Mapping ${index + 1} listener start`}
                      data-testid={
                        index === 0
                          ? "listen-port-input"
                          : `listen-port-start-${index}`
                      }
                    />
                    <span className="text-nb-gray-500">–</span>
                    <Input
                      type="number"
                      min={1}
                      max={65535}
                      placeholder={listenerSupported ? "8080" : "Auto"}
                      value={
                        listenerSupported ? mapping.listen_port_end || "" : ""
                      }
                      onChange={(event) =>
                        updateMapping(index, {
                          listen_port_end:
                            Number.parseInt(event.target.value, 10) || 0,
                        })
                      }
                      disabled={!listenerSupported || !l4Target}
                      maxWidthClass="w-full min-w-0"
                      aria-label={`Mapping ${index + 1} listener end`}
                      data-testid={`listen-port-end-${index}`}
                    />
                  </div>
                </div>

                <div>
                  <Label>Destination Range</Label>
                  <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={65535}
                      placeholder="8080"
                      value={mapping.target_port_start || ""}
                      onChange={(event) =>
                        updateRangeStart(
                          index,
                          "target",
                          Number.parseInt(event.target.value, 10) || 0,
                        )
                      }
                      disabled={!l4Target}
                      maxWidthClass="w-full min-w-0"
                      aria-label={`Mapping ${index + 1} destination start`}
                      data-testid={
                        index === 0
                          ? "destination-port-input"
                          : `destination-port-start-${index}`
                      }
                    />
                    <span className="text-nb-gray-500">–</span>
                    <Input
                      type="number"
                      min={1}
                      max={65535}
                      placeholder="8080"
                      value={mapping.target_port_end || ""}
                      onChange={(event) =>
                        updateMapping(index, {
                          target_port_end:
                            Number.parseInt(event.target.value, 10) || 0,
                        })
                      }
                      disabled={!l4Target}
                      maxWidthClass="w-full min-w-0"
                      aria-label={`Mapping ${index + 1} destination end`}
                      data-testid={`destination-port-end-${index}`}
                    />
                  </div>
                </div>
              </div>

              {errors[index]?.length > 0 && (
                <div className="mt-2 text-xs text-red-400">
                  {errors[index].map((error) => (
                    <p key={error}>{error}</p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
