import { Input, InputProps } from "@components/Input";
import React, { useMemo } from "react";
import { useTranslations } from "@/i18n/LocaleProvider";
import { isValidSentinelOneApiUrl } from "@/modules/integrations/edr/sentinel-one/SentinelOne";

type Props = {
  value: string;
  setValue: (value: string) => void;
} & InputProps;

export default function SentinelOneUrlInput({
  value,
  setValue,
  ...props
}: Props) {
  const t = useTranslations();
  const isValid = useMemo(() => {
    return isValidSentinelOneApiUrl(value);
  }, [value]);

  const error = useMemo(() => {
    if (value === "") return "";
    if (isValid) return "";
    return t("integrations.edrInvalidSentinelUrl");
  }, [value, isValid, t]);

  return (
    <Input
      type={"text"}
      className={"w-full"}
      autoCorrect={"off"}
      autoComplete={"off"}
      placeholder={"https://your-tenant.sentinelone.net"}
      value={value}
      error={error}
      onChange={(e) => setValue(e.target.value)}
      {...props}
    />
  );
}
