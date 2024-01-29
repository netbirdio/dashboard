import { Modal, ModalContent } from "@components/modal/Modal";
import { cn } from "@utils/helpers";
import { X, ZoomIn } from "lucide-react";
import Image, { StaticImageData } from "next/image";
import * as React from "react";
import { useState } from "react";

type Props = {
  image: StaticImageData | string;
};
export const Lightbox = ({ image }: Props) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={"flex items-center"}>
      <Modal open={open} onOpenChange={setOpen}>
        <div
          onClick={() => setOpen(true)}
          className={
            "bg-nb-gray-900 p-2 mt-2 select-none relative rounded-lg border border-nb-gray-800 cursor-pointer group/lightbox transition-all"
          }
        >
          <div
            className={
              "absolute w-full h-full flex items-center justify-center p-2 left-0 top-0 rounded-lg transition-all"
            }
          >
            <div
              className={
                "bg-black/5 backdrop-blur p-2 rounded-full group-hover/lightbox:bg-black/10 transition-all"
              }
            >
              <ZoomIn
                className={
                  "text-nb-gray-700 group-hover/lightbox:text-nb-gray-600"
                }
                size={20}
              />
            </div>
          </div>
          <Image
            src={image}
            alt={""}
            className={"rounded-md  overflow-hidden"}
            width={200}
          />
        </div>
        <ModalContent
          maxWidthClass={cn("relative max-w-6xl")}
          showClose={false}
          className={"py-0"}
        >
          <div className={"absolute top-0 right-0 text-center p-3"}>
            <div
              onClick={() => setOpen(false)}
              className={
                "p-2 bg-nb-gray-900/80 backdrop-blur-2xl rounded-md border border-nb-gray-500 hover:bg-nb-gray-900/90 transition-all cursor-pointer"
              }
            >
              <X size={20} />
            </div>
          </div>
          <div onClick={() => setOpen(false)}>
            <Image src={image} alt={""} className={"rounded-md"} width={1600} />
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
};
