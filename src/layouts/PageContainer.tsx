import { cn } from "@utils/helpers";
import React from "react";
import { useApplicationContext } from "@/contexts/ApplicationProvider";

type Props = {
  children: React.ReactNode;
  className?: string;
};
export default function PageContainer({
  children,
  className,
}: Readonly<Props>) {
  const { isNavigationCollapsed } = useApplicationContext();
  return (
    <div
      className={cn(
        className,
        "relative flex-auto overflow-auto bg-nb-gray z-1 focus:outline-none",
        isNavigationCollapsed && "md:pl-[70px]",
      )}
    >
      {children}
    </div>
  );
}
