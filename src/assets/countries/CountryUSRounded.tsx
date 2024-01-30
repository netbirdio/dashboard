import Image from "next/image";
import * as React from "react";
import usIcon from "@/assets/countries/us.svg";

export const CountryUSRounded = () => {
  return (
    <div
      className={
        "w-5 h-5 overflow-hidden rounded-full relative shadow-2xl border border-nb-gray-600 flex items-center justify-center"
      }
    >
      <Image
        src={usIcon}
        alt={"us"}
        fill={true}
        className={"object-cover object-center"}
      />
    </div>
  );
};
