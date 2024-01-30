import { cn } from "@utils/helpers";
import LoadingIcon from "@/assets/icons/LoadingIcon";

type Props = {
  height?: "screen" | "auto";
};
export default function FullScreenLoading({ height = "screen" }: Props) {
  return (
    <div
      className={cn(
        "flex items-center justify-center w-screen",
        height == "screen" && "h-screen",
        height == "auto" && "h-auto",
      )}
    >
      <LoadingIcon className={"fill-netbird"} size={44} />
    </div>
  );
}
