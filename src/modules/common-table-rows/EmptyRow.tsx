import { cn } from "@utils/helpers";

type Props = {
  className?: string;
};

export default function EmptyRow({ className }: Readonly<Props>) {
  return <div className={cn("text-nb-gray-600", className)}>-</div>;
}
