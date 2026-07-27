"use client";

import CopyToClipboardText from "@components/CopyToClipboardText";
import { useTranslations } from "next-intl";
import React from "react";
import { NetworkResource } from "@/interfaces/Network";

type Props = {
  resource: NetworkResource;
};
export default function ResourceAddressCell({ resource }: Readonly<Props>) {
  const t = useTranslations("networks");
  return (
    <CopyToClipboardText
      message={t("addressCopied", { address: resource.address })}
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
