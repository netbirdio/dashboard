import { TimeRange, useTimeFormatter } from "@hooks/useTimeFormatter";
import { useState } from "react";

type Props = {
  enabled: boolean;
  expirationInSeconds: number;
  timeRange?: TimeRange;
};
export const useExpirationState = ({
  enabled,
  expirationInSeconds,
  timeRange = ["hours", "days"],
}: Props) => {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [expiresInSeconds] = useState(expirationInSeconds || 86400);

  const { value: seconds, time: unit } = useTimeFormatter(
    expiresInSeconds,
    timeRange,
  );

  const [expiresIn, setExpiresIn] = useState(seconds);
  const [expireInterval, setExpireInterval] = useState<string>(unit);

  return [
    isEnabled,
    setIsEnabled,
    expiresIn,
    setExpiresIn,
    expireInterval,
    setExpireInterval,
  ] as const;
};
