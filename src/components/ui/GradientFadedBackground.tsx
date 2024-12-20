import * as React from "react";

export const GradientFadedBackground = () => {
  return (
    <div
      className={
        "h-full w-full absolute left-0 top-0 rounded-md overflow-hidden z-0 pointer-events-none"
      }
    >
      <div
        className={
          "bg-gradient-to-b from-nb-gray-900/20 via-transparent to-transparent w-full h-full rounded-md"
        }
      ></div>
    </div>
  );
};
