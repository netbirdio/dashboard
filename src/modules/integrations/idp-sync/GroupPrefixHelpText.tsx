import HelpText from "@components/HelpText";
import * as React from "react";
import { useTranslations } from "@/i18n/LocaleProvider";

type Props = {
  type?: "user-groups" | "groups";
};
export const GroupPrefixHelpText = ({ type = "groups" }: Props) => {
  const t = useTranslations();
  return type === "user-groups" ? (
    <HelpText className={"max-w-lg mt-2"}>
      {t.rich("integrations.idpUsersSyncHelp", {
        all: (chunks) => (
          <span className={"text-netbird font-semibold"}>{chunks}</span>
        ),
        br: () => <br />,
      })}
    </HelpText>
  ) : (
    <HelpText className={"max-w-lg mt-2"}>
      {t.rich("integrations.idpGroupsSyncHelp", {
        all: (chunks) => (
          <span className={"text-netbird font-semibold"}>{chunks}</span>
        ),
        br: () => <br />,
      })}
    </HelpText>
  );
};
