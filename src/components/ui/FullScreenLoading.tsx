import { cn } from "@utils/helpers";
import LoadingIcon from "@/assets/icons/LoadingIcon";

type Props = {
  fullScreen?: boolean;
  // label, when set, renders under the spinner so callers can spell out
  // which step of a multi-stage flow is in progress.
  label?: string;
};
export default function FullScreenLoading({ fullScreen = true, label }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 w-screen",
        fullScreen && "h-screen",
      )}
    >
      <LoadingIcon className="fill-netbird" size={44} />
      {label && <div className="text-sm text-nb-gray-400">{label}</div>}
    </div>
  );
}
