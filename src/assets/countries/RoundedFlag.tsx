import Image from "next/image";
import * as React from "react";
import { memo } from "react";

type Props = {
  country: string;
  size?: number;
};
const RoundedFlag = ({ country, size = 20 }: Props) => {
  return (
    <div
      className={
        "shrink-0 overflow-hidden rounded-full relative shadow-xl flex items-center justify-center"
      }
      style={{
        width: size == 14 ? 20 : size,
        height: size == 14 ? 20 : size,
      }}
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
