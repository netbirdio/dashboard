import Paragraph from "@components/Paragraph";
import { cn } from "@utils/helpers";
import { ArrowRightLeft } from "lucide-react";
import { StaticImport } from "next/dist/shared/lib/get-img-props";
import Image from "next/image";
import * as React from "react";
import netBirdLogo from "@/assets/netbird.svg";

type Props = {
  image: StaticImport | string;
  title: string;
  description: string;
};
export const IntegrationModalHeader = ({
  image,
  title,
  description,
}: Props) => {
  return (
    <>
      <div className={"flex justify-center items-center gap-4 mt-5"}>
        <div
          className={
            "h-12 w-12 flex items-center justify-center rounded-md bg-nb-gray-900/70 p-2 border border-nb-gray-900/70"
          }
        >
          <Image
            src={netBirdLogo}
            alt={"NetBird"}
            className={"rounded-[4px]"}
          />
        </div>
        <div>
          <ArrowRightLeft size={24} className={"text-netbird"} />
        </div>
        <div
          className={
            "h-12 w-12 flex items-center justify-center rounded-md bg-nb-gray-900/70 p-2 border border-nb-gray-900/70"
          }
        >
          <Image src={image} alt={""} className={"rounded-[4px]"} />
        </div>
      </div>
      <div
        className={
          "mx-auto text-center flex flex-col items-center justify-center mt-6 z-[1]"
        }
      >
        <h2 className={"text-lg my-0 leading-[1.5 text-center]"}>{title}</h2>
        <Paragraph className={cn("text-sm text-center max-w-[450px] px-4")}>
          {description}
        </Paragraph>
      </div>
    </>
  );
};
