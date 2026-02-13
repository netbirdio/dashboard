import CopyToClipboardText from "@components/CopyToClipboardText";
import FullTooltip from "@components/FullTooltip";
import { cn } from "@utils/helpers";
import { isEmpty } from "lodash";
import { FlagIcon, GlobeIcon } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import RoundedFlag from "@/assets/countries/RoundedFlag";
import { useCountries } from "@/contexts/CountryProvider";
import { ReverseProxyEvent } from "@/interfaces/ReverseProxy";
import Skeleton from "react-loading-skeleton";
import { ListItem } from "@components/ListItem";

type Props = {
  event: ReverseProxyEvent;
};

export const ReverseProxyEventsLocationIpCell = ({ event }: Props) => {
  const { getRegionText, isLoading } = useCountries();

  const region = useMemo(() => {
    return getRegionText(event.country_code || "", event.city_name || "");
  }, [getRegionText, event.country_code, event.city_name]);

  return (
    <FullTooltip
      side={"top"}
      interactive={true}
      delayDuration={250}
      skipDelayDuration={100}
      disabled={!region || region === "Unknown"}
      contentClassName={"p-0"}
      content={
        <div
          className={"text-xs flex flex-col"}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <ListItem
            icon={<FlagIcon size={14} />}
            label={"Region"}
            value={
              isLoading && !region ? (
                <Skeleton width={100} />
              ) : (
                <CopyToClipboardText
                  iconAlignment={"right"}
                  message={"Region has been copied to your clipboard"}
                  alwaysShowIcon={true}
                >
                  {region}
                </CopyToClipboardText>
              )
            }
          />
        </div>
      }
    >
      <div
        className={cn(
          "flex gap-2.5 items-center group/cell transition-all hover:bg-nb-gray-800/10 py-2 px-3 rounded-md cursor-default",
        )}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <div className="flex items-center justify-center shrink-0">
          {isEmpty(event.country_code) ? (
            <GlobeIcon size={13} className={"text-nb-gray-300"} />
          ) : (
            <RoundedFlag country={event.country_code!} size={12} />
          )}
        </div>
        <CopyToClipboardText
          message={"IP address has been copied to your clipboard"}
        >
          <span className={"text-nb-gray-200 font-mono text-[0.82rem]"}>
            {event.source_ip}
          </span>
        </CopyToClipboardText>
      </div>
    </FullTooltip>
  );
};
