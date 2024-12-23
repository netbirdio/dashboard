import CopyToClipboardText from "@components/CopyToClipboardText";
import React from "react";
import { NetworkResource } from "@/interfaces/Network";

type Props = {
  resource: NetworkResource;
};
export default function ResourceAddressCell({ resource }: Readonly<Props>) {
  return (
    <CopyToClipboardText
      message={`${resource.address} has been copied to your clipboard`}
    >
      <div
        className={
          "font-mono dark:text-nb-gray-300 pt-1 flex gap-2 items-center text-[.82rem]"
        }
      >
        {resource.address}
      </div>
    </CopyToClipboardText>
  );
}
