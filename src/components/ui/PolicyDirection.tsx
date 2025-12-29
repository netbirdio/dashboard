import Badge from "@components/Badge";
import { cn } from "@utils/helpers";
import React, { useEffect, useMemo } from "react";
import LongArrowLeftIcon from "@/assets/icons/LongArrowLeftIcon";
import { PolicyRuleResource, Protocol } from "@/interfaces/Policy";

type Props = {
  disabled?: boolean;
  value: Direction;
  onChange: (value: Direction) => void;
  className?: string;
  destinationResource?: PolicyRuleResource;
  protocol?: Protocol;
};

export type Direction = "bi" | "in" | "out";

export default function PolicyDirection({
  disabled = false,
  value,
  onChange,
  className,
  destinationResource,
  protocol,
}: Readonly<Props>) {
  const toggleDirection = () => {
    if (protocol === "netbird-ssh") return;
    if (value == "bi") {
      onChange("in");
    } else {
      onChange("bi");
    }
  };

  useEffect(() => {
    if (protocol === "netbird-ssh") {
      onChange("in");
      return;
    }
    if (disabled) onChange("bi");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, protocol]);

  const isNetworkResource =
    !!destinationResource && destinationResource?.type !== "peer";

  const topBadgeClass = useMemo(() => {
    if (isNetworkResource) return "blueDark";
    if (value === "bi") return "green";
    if (value === "in") return "blueDark";
    return "gray";
  }, [value, isNetworkResource]);

  const topArrowClass = useMemo(() => {
    if (isNetworkResource) return "fill-sky-500";
    if (value === "bi") return "fill-green-500";
    if (value === "in") return "fill-sky-500";
    return "fill-gray-500";
  }, [value, isNetworkResource]);

  const bottomBadgeClass = useMemo(() => {
    if (isNetworkResource) return "gray";
    if (value === "bi") return "green";
    return "gray";
  }, [value, isNetworkResource]);

  const bottomArrowClass = useMemo(() => {
    if (isNetworkResource) return "fill-gray-500";
    if (value === "bi") return "fill-green-500";
    return "fill-gray-500";
  }, [value, isNetworkResource]);

  return (
    <button
      className={cn(
        "flex flex-col gap-2 mt-[23px] cursor-pointer select-none",
        (disabled || protocol === "netbird-ssh") &&
          "opacity-50 pointer-events-none",
        "hover:opacity-80 transition-all",
        className,
      )}
      onClick={toggleDirection}
      data-cy={"policy-direction"}
    >
      <Badge variant={topBadgeClass} className={"px-4 py-1"}>
        <LongArrowLeftIcon
          size={40}
          autoHeight={true}
          className={cn(topArrowClass, "rotate-180")}
        />
      </Badge>
      <Badge variant={bottomBadgeClass} className={"px-4 py-1"}>
        <LongArrowLeftIcon
          size={40}
          autoHeight={true}
          className={cn(bottomArrowClass)}
        />
      </Badge>
    </button>
  );
}
