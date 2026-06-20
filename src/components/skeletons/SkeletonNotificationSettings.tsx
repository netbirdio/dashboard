import * as React from "react";
import { useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";

export const SkeletonNotificationSettings = ({
  delay = 400,
}: {
  delay?: number;
}) => {
  const [show, setShow] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!show) return null;

  return (
    <div className={"p-default py-5 max-w-2xl"}>
      <Skeleton height={24} width={200} className={"mb-5"} />
      <Skeleton height={32} width={160} className={"mb-2"} />
      <Skeleton height={16} width={520} className={"mb-1"} />
      <Skeleton height={16} width={340} className={"mb-0"} />
      <Skeleton
        height={134}
        width={"100%"}
        className={"mt-6"}
        borderRadius={6}
      />
    </div>
  );
};
