import dayjs from "dayjs";
import { Calendar } from "lucide-react";

type Props = {
  date: Date;
};
export default function ExpirationDateRow({ date }: Props) {
  return (
    <div
      className={
        "flex items-center whitespace-nowrap gap-2 text-nb-gray-300 transition-all  py-2 px-3 rounded-md"
      }
    >
      <Calendar size={14} />
      {dayjs(date).format("D MMM YYYY")}
    </div>
  );
}
