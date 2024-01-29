import { MonitorSmartphoneIcon } from "lucide-react";

type Props = {
  current: number;
  limit: number;
  reusable: boolean;
};
export default function SetupKeyUsageCell({ current, limit, reusable }: Props) {
  return reusable ? (
    <div className={"flex gap-1 flex-col"}>
      <div className={"flex items-center gap-2"}>
        <MonitorSmartphoneIcon size={14} />
        {current} of {limit} Peers
      </div>
      <div></div>
    </div>
  ) : (
    <div className={"text-nb-gray-800"}>-</div>
  );
}
