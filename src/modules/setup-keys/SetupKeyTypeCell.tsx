import Badge from "@components/Badge";
import { IconRepeat } from "@tabler/icons-react";
import { Repeat1 } from "lucide-react";

type Props = {
  reusable: boolean;
};
export default function SetupKeyTypeCell({ reusable }: Props) {
  return (
    <div className={"flex"}>
      <Badge className={"text-xs"} variant={"gray"}>
        {reusable ? (
          <>
            <IconRepeat size={14} className={"text-green-400"} /> Reusable
          </>
        ) : (
          <>
            <Repeat1 size={14} /> One-off
          </>
        )}
      </Badge>
    </div>
  );
}
