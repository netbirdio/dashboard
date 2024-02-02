import { Checkbox } from "@components/Checkbox";
import { Input } from "@components/Input";
import { Popover, PopoverContent } from "@components/Popover";
import { useElementSize } from "@hooks/useElementSize";
import { Anchor } from "@radix-ui/react-popover";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { FaWindows } from "react-icons/fa6";

type Props = {};
export const AutoCompleteInput = ({}: Props) => {
  const [open, setOpen] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [elementWidth, { width }] = useElementSize<HTMLDivElement>();

  useEffect(() => {
    const input = inputRef.current;

    const onFocus = () => {
      setOpen(true);
    };

    if (input) {
      inputRef.current.addEventListener("focus", onFocus);
    }

    return () => {
      if (input) {
        inputRef.current.removeEventListener("focus", onFocus);
      }
    };
  }, []);

  return (
    <div className={"z-10 relative"}>
      <Popover modal={false} open={open} onOpenChange={setOpen}>
        <Anchor ref={elementWidth}>
          <Input
            placeholder={"11"}
            ref={inputRef}
            maxWidthClass={"max-w-[200px]"}
            customPrefix={
              <div className={"flex items-center gap-2"}>
                <Checkbox></Checkbox>
                <div
                  className={"flex gap-2 items-center text-sm text-nb-gray-200"}
                >
                  <FaWindows className={"text-sky-600 text-lg"} />
                  Windows
                </div>
              </div>
            }
          />
        </Anchor>

        <PopoverContent
          hideWhenDetached={false}
          className="w-full p-0 shadow-sm  shadow-nb-gray-950"
          style={{
            width: width,
          }}
          forceMount={true}
          align="start"
          side={"bottom"}
          sideOffset={10}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            event.preventDefault();
            if (event.target !== inputRef.current) {
              setOpen(false);
            }
          }}
          onPointerDownOutside={(event) => {
            event.preventDefault();
            if (event.target !== inputRef.current) {
              setOpen(false);
            }
          }}
          onFocusOutside={(event) => {
            event.preventDefault();
            if (event.target !== inputRef.current) {
              setOpen(false);
            }
          }}
        ></PopoverContent>
      </Popover>
    </div>
  );
};
