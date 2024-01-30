import { cn } from "@utils/helpers";
import { ChevronRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";

type Props = {
  children: React.ReactNode;
};
function Breadcrumbs({ children }: Props) {
  return <div className={"flex items-center mb-6 gap-2"}>{children}</div>;
}

type ItemProps = {
  href?: string;
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
};

export const Item = ({ href, label, icon, active }: ItemProps) => {
  const router = useRouter();

  return (
    <div className={"flex items-center gap-2 group"}>
      <ChevronRightIcon
        size={16}
        className={"text-nb-gray-400 group-first:hidden"}
      />
      <div
        className={cn(
          "flex items-center gap-2.5 text-nb-gray-400  transition-all cursor-pointer",
          active ? "text-nb-gray-300" : "hover:text-nb-gray-300",
        )}
      >
        {icon && icon}
        {href ? <span onClick={() => router.push(href)}>{label}</span> : label}
      </div>
    </div>
  );
};

Breadcrumbs.Item = Item;

export default Breadcrumbs;
