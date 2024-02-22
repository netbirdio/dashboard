import FullTooltip from "@components/FullTooltip";
import { ScrollArea } from "@components/ScrollArea";
import useFetchApi from "@utils/api";
import * as React from "react";
import RoundedFlag from "@/assets/countries/RoundedFlag";
import { Country } from "@/interfaces/Country";
import { GeoLocationCheck } from "@/interfaces/PostureCheck";

type Props = {
  children: React.ReactNode;
  check?: GeoLocationCheck;
};
export const GeoLocationTooltip = ({ children, check }: Props) => {
  const { data: countries } = useFetchApi<Country[]>(`/locations/countries`);

  return check ? (
    <FullTooltip
      className={"w-full"}
      interactive={true}
      contentClassName={"p-0"}
      content={
        <div
          className={
            "text-neutral-300 flex flex-col items-start text-sm gap-1 justify-start min-w-[200px]"
          }
        >
          <div className={"px-4 pt-3"}>
            {check.action == "allow" ? (
              <span>
                <span className={"text-green-500 font-semibold"}>
                  Allow only
                </span>{" "}
                the following <br />
                countries & regions
              </span>
            ) : (
              <span>
                <span className={"text-red-500 font-semibold"}>Block</span> the
                following <br />
                countries & regions
              </span>
            )}
          </div>

          <ScrollArea
            className={"max-h-[285px] overflow-y-auto flex flex-col px-4"}
          >
            <div className={"flex flex-col gap-1.5 mt-2 text-xs mb-3 w-full"}>
              {check.locations.map((location, index) => {
                const country = countries?.find(
                  (c) => c.country_code === location.country_code,
                );
                return (
                  <div
                    className={" rounded-full flex items-center gap-2 pr-4"}
                    key={index}
                  >
                    <div
                      className={"border-2 border-nb-gray-900/50 rounded-full"}
                    >
                      <RoundedFlag country={location.country_code} size={23} />
                    </div>

                    <div className={"flex items-center"}>
                      <span className={"font-semibold"}>
                        {country && country.country_name}
                      </span>

                      {location.city_name && `, ${location.city_name}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      }
    >
      {children}
    </FullTooltip>
  ) : (
    check
  );
};
