import Badge from "@components/Badge";
import React from "react";

type Props = {
  text: string;
};

export default function SetupKeyKeyCell({ text }: Props) {
  return (
    <div className={"flex"}>
      <Badge variant={"gray"} className={"text-xs font-mono"}>
        {text.substring(0, 5) + "****"}
      </Badge>
    </div>
  );
}
