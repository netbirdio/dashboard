import Image from "next/image";
import * as React from "react";
import { memo } from "react";

type Props = {
  country: string;
};
const RoundedFlag = ({ country }: Props) => {
  return (
    <div
      className={
        "w-5 h-5 shrink-0 overflow-hidden rounded-full relative shadow-2xl border border-nb-gray-800 flex items-center justify-center"
      }
    >
      <Image
        src={`/assets/flags/4x3/${country.toLowerCase()}.svg`}
        alt={country}
        fill={true}
        className={"object-cover object-center"}
      />
    </div>
  );
};

export default memo(RoundedFlag);
