import Badge from "@components/Badge";
import {cn} from "@utils/helpers";
import React, {useEffect} from "react";
import LongArrowLeftIcon from "@/assets/icons/LongArrowLeftIcon";

type Props = {
  disabled?: boolean;
  value: Direction;
  onChange: (value: Direction) => void;
};

export type Direction = "bi" | "in" | "out";

export default function PolicyDirection({
  disabled = false,
  value,
  onChange,
}: Props) {
  const toggleIn = () => {
    if (value == "in") {
      onChange("out");
      return;
    }
    if (value == "bi") {
      onChange("out");
    } else {
      onChange("bi");
    }
  };

  const toggleOut = () => {
    if (value == "out") {
      onChange("in");
      return;
    }
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

  return (
    <div
      className={cn(
        "flex flex-col gap-2 mt-[23px] cursor-pointer",
        disabled && "opacity-50 pointer-events-none",
      )}
    >
      <Badge
        variant={value == "bi" ? "green" : value == "in" ? "blueDark" : "gray"}
        className={"px-4 py-1"}
        onClick={toggleIn}
        useHover={true}
      >
        <LongArrowLeftIcon
          size={40}
          autoHeight={true}
          className={cn(
            value == "bi"
              ? "fill-green-500"
              : value == "in"
              ? "fill-sky-500"
              : "fill-gray-500",
            "rotate-180",
          )}
        />
      </Badge>
      <Badge
        useHover={true}
        variant={value == "bi" ? "green" : value == "out" ? "blueDark" : "gray"}
        className={"px-4 py-1"}
        onClick={toggleOut}
      >
        <LongArrowLeftIcon
          size={40}
          autoHeight={true}
          className={cn(
            value == "bi"
              ? "fill-green-500"
              : value == "out"
              ? "fill-sky-500"
              : "fill-gray-500",
          )}
        />
      </Badge>
    </div>
  );
}
