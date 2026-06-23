import ButtonGroup from "@components/ButtonGroup";
import * as React from "react";

type Props = {
  value?: string;
  onChange?: (value: string) => void;
};

export const TrafficEventsConnectionTypeFilter = ({
  value,
  onChange,
}: Props) => {
  return (
    <ButtonGroup>
      <ButtonGroup.Button
        onClick={() => onChange?.("")}
        variant={value == undefined || value == "" ? "tertiary" : "secondary"}
      >
        All
      </ButtonGroup.Button>
      <ButtonGroup.Button
        onClick={() => onChange?.("P2P")}
        variant={value === "P2P" ? "tertiary" : "secondary"}
      >
        P2P
      </ButtonGroup.Button>
      <ButtonGroup.Button
        onClick={() => onChange?.("ROUTED")}
        variant={value === "ROUTED" ? "tertiary" : "secondary"}
      >
        Routed
      </ButtonGroup.Button>
    </ButtonGroup>
  );
};
