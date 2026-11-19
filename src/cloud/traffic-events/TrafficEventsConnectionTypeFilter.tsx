import ButtonGroup from "@components/ButtonGroup";
import * as React from "react";
import { useTranslations } from "@/i18n/LocaleProvider";

type Props = {
  value?: string;
  onChange?: (value: string) => void;
};

export const TrafficEventsConnectionTypeFilter = ({
  value,
  onChange,
}: Props) => {
  const t = useTranslations();
  return (
    <ButtonGroup>
      <ButtonGroup.Button
        onClick={() => onChange?.("")}
        variant={value == undefined || value == "" ? "tertiary" : "secondary"}
      >
        {t("common.all")}
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
