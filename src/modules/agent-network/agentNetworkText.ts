import type { ReactNode } from "react";
import { useTranslations } from "@/i18n/LocaleProvider";
import type { MessageId } from "@/i18n/translate";

type Values = Record<string, string | number | Date>;
type RichValues = Record<
  string,
  string | number | Date | ((chunks: ReactNode) => ReactNode)
>;

export function useAgentNetworkText() {
  const translate = useTranslations();

  const tr = (id: MessageId | (string & {}), values?: Values) =>
    values
      ? translate(id as MessageId, values as never)
      : translate(id as MessageId);

  const rich = (id: MessageId | (string & {}), values: RichValues) =>
    translate.rich(id as MessageId, values as never);

  return { tr, rich };
}

export type AgentNetworkText = ReturnType<typeof useAgentNetworkText>;
