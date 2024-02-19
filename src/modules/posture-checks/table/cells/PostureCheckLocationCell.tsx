import * as React from "react";
import RoundedFlag from "@/assets/countries/RoundedFlag";
import { PostureCheck } from "@/interfaces/PostureCheck";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  check: PostureCheck;
};
export const PostureCheckLocationCell = ({ check }: Props) => {
  const countries = check.checks.geo_location_check?.locations.map(
    (location) => location.country_code,
  );

  return countries ? (
    <div className={"flex gap-2 items-center"}>
      <span className={"font-medium text-nb-gray-200"}></span>
      {countries.map((country, index) => {
        return (
          <div
            key={index}
            className={"relative"}
            style={{
              left: -index * 15,
            }}
          >
            <RoundedFlag country={country} size={23} />
          </div>
        );
      })}
    </div>
  ) : (
    <EmptyRow />
  );
};
