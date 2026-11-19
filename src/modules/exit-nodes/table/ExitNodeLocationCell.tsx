import FullTooltip from "@components/FullTooltip";
import { ScrollArea } from "@components/ScrollArea";
import { CircleStackPill } from "@components/ui/CircleStackPill";
import * as React from "react";
import { useMemo } from "react";
import RoundedFlag from "@/assets/countries/RoundedFlag";
import { useCountries } from "@/contexts/CountryProvider";
import { ExitNode } from "@/interfaces/ExitNode";
import { getExitNodeLocations } from "@/modules/exit-nodes/exitNodeHelpers";
import { useExitNodes } from "@/modules/exit-nodes/ExitNodesProvider";

type Props = {
  exitNode: ExitNode;
};

/** Overlapping flags of the countries where traffic exits, primary first. */
export default function ExitNodeLocationCell({ exitNode }: Readonly<Props>) {
  const { peers } = useExitNodes();
  const { countries: countryList } = useCountries();

  const { countries, locations } = useMemo(
    () => getExitNodeLocations(exitNode, peers),
    [exitNode, peers],
  );

  if (countries.length === 0) return null;

  const countryName = (code: string) =>
    countryList?.find((c) => c.country_code === code)?.country_name ?? code;

  return (
    <div className={"flex"} onClick={(e) => e.stopPropagation()}>
      <FullTooltip
        interactive={true}
        contentClassName={"p-0"}
        content={
          <div
            className={
              "text-nb-gray-300 dark:text-neutral-300 flex flex-col items-start text-sm gap-1 justify-start min-w-[200px]"
            }
          >
            <div className={"px-4 pt-3"}>
              <span className={"text-green-500 font-semibold"}>
                Traffic exits
              </span>{" "}
              in the following <br />
              countries & regions
            </div>
            <ScrollArea
              className={"max-h-[285px] overflow-y-auto flex flex-col px-4"}
            >
              <div className={"flex flex-col gap-1.5 mt-2 text-xs mb-3 w-full"}>
                {locations.map((location) => (
                  <div
                    className={"rounded-full flex items-center gap-2 pr-4"}
                    key={`${location.country_code}-${location.city_name}`}
                  >
                    <div
                      className={"border-2 border-nb-gray-900/50 rounded-full"}
                    >
                      <RoundedFlag country={location.country_code} size={23} />
                    </div>
                    <div className={"flex items-center whitespace-nowrap"}>
                      <span className={"font-semibold"}>
                        {countryName(location.country_code)}
                      </span>
                      {location.city_name && `, ${location.city_name}`}
                      {location.primary && (
                        <span className={"ml-2 text-nb-gray-400"}>Primary</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        }
      >
        <CircleStackPill
          size={"sm"}
          circles={countries.map((code, index) => (
            <div
              key={code}
              className={
                "relative rounded-full hover:scale-[1.1] transition-all"
              }
              style={{ zIndex: countries.length - index }}
              aria-label={countryName(code)}
            >
              <RoundedFlag country={code} size={20} />
            </div>
          ))}
        />
      </FullTooltip>
    </div>
  );
}
