import FullTooltip from "@components/FullTooltip";
import InlineLink from "@components/InlineLink";
import { ExternalLinkIcon } from "lucide-react";
import * as React from "react";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  children: React.ReactNode;
  hoverButton?: boolean;
};
export const ExitNodeHelpTooltip = ({
  children,
  hoverButton = false,
}: Props) => {
  const { t } = useI18n();
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <FullTooltip
        hoverButton={hoverButton}
        content={
          <div className={"text-xs max-w-xs"}>
            {t("exitNodes.help")}
            <div className={"mt-2"}>
              {t("common.learnMorePrefix")}{" "}
              <InlineLink
                href={
                  "https://docs.netbird.io/how-to/configuring-default-routes-for-internet-traffic"
                }
                target={"_blank"}
                className={"mr-1"}
              >
                {t("routeModal.exitNodes")}
                <ExternalLinkIcon size={10} />
              </InlineLink>
              {t("common.inDocumentationSuffix")}
            </div>
          </div>
        }
      >
        {children}
      </FullTooltip>
    </div>
  );
};
