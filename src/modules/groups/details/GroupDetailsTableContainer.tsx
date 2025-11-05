import Paragraph from "@components/Paragraph";
import SkeletonTable, {
  SkeletonTableHeader,
} from "@components/skeletons/SkeletonTable";
import React, { Suspense } from "react";

type Props = {
  title?: string;
  description?: string;
  headingRef?: React.RefObject<HTMLHeadingElement>;
  children: React.ReactNode;
};

export const GroupDetailsTableContainer = ({
  title,
  description,
  headingRef,
  children,
}: Props) => {
  return (
    <div className={"pb-10 px-8"}>
      <div className={"w-full"}>
        {(title || description) && (
          <div className={"flex justify-between items-center mb-5"}>
            <div>
              {title && <h2 ref={headingRef}>{title}</h2>}
              {description && <Paragraph>{description}</Paragraph>}
            </div>
          </div>
        )}

        <Suspense
          fallback={
            <div className={"relative"}>
              <SkeletonTableHeader className={"!p-0"} />
              <div className={"mt-6 w-full"}>
                <SkeletonTable withHeader={false} />
              </div>
            </div>
          }
        >
          {children}
        </Suspense>
      </div>
    </div>
  );
};
