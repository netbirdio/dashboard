import { cn } from "@utils/helpers";
import LoadingIcon from "@/assets/icons/LoadingIcon";

type Props = {
  fullScreen?: boolean
};
export default function FullScreenLoading({ fullScreen = true }: Props) {
  return (
    <div
      className={cn(
        "flex items-center justify-center w-screen",
        fullScreen && "h-screen",
      )}
    >
      <LoadingIcon className="fill-netbird" size={44} />
    </div>
  );
}
