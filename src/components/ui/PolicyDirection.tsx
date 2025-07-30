import Badge from "@components/Badge";
import { cn } from "@utils/helpers";
import React, { useEffect, useMemo } from "react";
import LongArrowLeftIcon from "@/assets/icons/LongArrowLeftIcon";
import { PolicyRuleResource } from "@/interfaces/Policy";

type Props = {
  disabled?: boolean;
  value: Direction;
  onChange: (value: Direction) => void;
  className?: string;
  destinationResource?: PolicyRuleResource;
};

export type Direction = "bi" | "in" | "out";

export default function PolicyDirection({
  disabled = false,
  value,
  onChange,
  className,
  destinationResource,
}: Readonly<Props>) {
  const toggleDirection = () => {
    if (value == "bi") {
      onChange("in");
    } else {
      onChange("bi");
    }
  };

  useEffect(() => {
    if (disabled) onChange("bi");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  const topBadgeClass = useMemo(() => {
    if (destinationResource) return "blueDark";
    if (value === "bi") return "green";
    if (value === "in") return "blueDark";
    return "gray";
  }, [value, destinationResource]);

  const topArrowClass = useMemo(() => {
    if (destinationResource) return "fill-sky-500";
    if (value === "bi") return "fill-green-500";
    if (value === "in") return "fill-sky-500";
    return "fill-gray-500";
  }, [value, destinationResource]);

  const bottomBadgeClass = useMemo(() => {
    if (destinationResource) return "gray";
    if (value === "bi") return "green";
    return "gray";
  }, [value, destinationResource]);

  const bottomArrowClass = useMemo(() => {
    if (destinationResource) return "fill-gray-500";
    if (value === "bi") return "fill-green-500";
    return "fill-gray-500";
  }, [value, destinationResource]);

  return (
    <button
      className={cn(
        "flex flex-col gap-2 mt-[23px] cursor-pointer select-none",
        disabled && "opacity-50 pointer-events-none",
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
