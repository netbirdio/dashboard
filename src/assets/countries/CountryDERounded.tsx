import Image from "next/image";
import * as React from "react";
import deIcon from "@/assets/countries/de.svg";

export const CountryDERounded = () => {
  return (
    <div
      className={
        "w-5 h-5 overflow-hidden rounded-full relative shadow-2xl border border-nb-gray-600 flex items-center justify-center"
      }
    >
      <Image
        src={deIcon}
        alt={"de"}
        fill={true}
        className={"object-cover object-center"}
      />
    </div>
  );
};
