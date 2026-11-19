import Badge from "@components/Badge";
import * as React from "react";
import {
  TrafficEvent,
  TrafficEventDirection,
} from "@/cloud/traffic-events/interfaces/TrafficEvent";
import { useTranslations } from "@/i18n/LocaleProvider";

type Props = {
  event: TrafficEvent;
};

export const TrafficEventsDirectionCell = ({ event }: Props) => {
  const t = useTranslations();
  const direction = event.direction;
  const isInbound = direction === TrafficEventDirection.INGRESS;

  return direction === TrafficEventDirection.UNKNOWN ? (
    <Badge variant={"gray"} className={"py-1 w-[80px]"}>
      {t("common.unknown")}
    </Badge>
  ) : (
    <Badge variant={"gray"} className={"py-1 w-[80px]"}>
      {isInbound ? t("trafficEvents.inbound") : t("trafficEvents.outbound")}
    </Badge>
  );
};
