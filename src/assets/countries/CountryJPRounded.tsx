import Image from "next/image";
import * as React from "react";
import jpIcon from "@/assets/countries/jp.svg";

export const CountryJPRounded = () => {
  return (
    <div
      className={
        "w-5 h-5 overflow-hidden rounded-full relative shadow-2xl border border-nb-gray-600 flex items-center justify-center"
      }
    >
      <Image
        src={jpIcon}
        alt={"eu"}
        fill={true}
        className={"object-cover object-center"}
      />
    </div>
  );
};
