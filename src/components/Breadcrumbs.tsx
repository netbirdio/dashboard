import { cn } from "@utils/helpers";
import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import React, { useContext } from "react";

type Props = {
  children: React.ReactNode;
};

/**
 * A crumb the surrounding layout puts in front of every trail, such as the
 * product a page is in. Pages don't pass it; without a provider there is
 * none and trails render as they always did.
 */
export const BreadcrumbRootContext = React.createContext<ItemProps | null>(
  null,
);

function Breadcrumbs({ children }: Props) {
  const root = useContext(BreadcrumbRootContext);
  return (
    <div className={"flex items-center mb-6 gap-2"}>
      {root && <Item {...root} />}
      {children}
    </div>
  );
}

export type ItemProps = {
  href?: string;
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
};

export const Item = ({
  href,
  label,
  icon,
  active,
  disabled = false,
}: ItemProps) => {
  return (
    <div
      className={cn(
        "flex items-center gap-2 group",
        disabled && "pointer-events-none",
      )}
    >
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
        {href ? (
          <Link href={href} data-testid={"breadcrumb-item"}>
            {label}
          </Link>
        ) : (
          label
        )}
      </div>
    </div>
  );
};

Breadcrumbs.Item = Item;

export default Breadcrumbs;
