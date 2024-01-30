import Image from "next/image";
import * as React from "react";
import euIcon from "@/assets/countries/eu.svg";

export const CountryEURounded = () => {
  return (
    <div
      className={
        "w-5 h-5 overflow-hidden rounded-full relative shadow-2xl border border-nb-gray-600 flex items-center justify-center"
      }
    >
      <Image
        src={euIcon}
        alt={"eu"}
        fill={true}
        className={"object-cover object-center shrink-0"}
      />
    </div>
  );
};
